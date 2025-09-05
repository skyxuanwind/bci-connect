const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { cloudinary } = require('../config/cloudinary');



// 使用記憶體緩衝上傳，不落地
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件'));
    }
  }
});

// 將上傳的原始圖片正規化為適合 OCR 的 JPEG（Buffer 版，不落地）
async function normalizeImageForOCRBuffer(originalBuffer) {
  try {
    const image = sharp(originalBuffer, { failOn: 'none' }).rotate(); // 依 EXIF 自動旋轉
    const meta = await image.metadata();

    const maxDim = 2000; // 限制最大邊
    const needResize = (meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim);

    let pipeline = sharp(originalBuffer, { failOn: 'none' }).rotate();
    if (needResize) {
      pipeline = pipeline.resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true });
    }

    const outBuffer = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return { buffer: outBuffer, created: true };
  } catch (err) {
    console.warn('影像正規化失敗，改用原始 Buffer 處理:', err.message);
    return { buffer: originalBuffer, created: false };
  }
}

// 產生多組預處理影像（Buffer 版，不落地）
async function preprocessForOCRBuffers(imageBuffer) {
  const variants = [];
  // 變體1：灰階 + 正規化 + 銳利化 + 中值去噪
  try {
    const out1 = await sharp(imageBuffer, { failOn: 'none' })
      .flatten({ background: '#ffffff' })
      .grayscale()
      .normalize()
      .median(1)
      .sharpen()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    variants.push(out1);
  } catch (e) {
    console.warn('預處理變體1失敗:', e.message);
  }
  // 變體2：灰階 + 正規化 + 對比微增強 + 銳利化
  try {
    const out2 = await sharp(imageBuffer, { failOn: 'none' })
      .flatten({ background: '#ffffff' })
      .grayscale()
      .normalize()
      .linear(1.15, -12)
      .sharpen()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    variants.push(out2);
  } catch (e) {
    console.warn('預處理變體2失敗:', e.message);
  }
  // 變體3：灰階 + 二值化
  try {
    const out3 = await sharp(imageBuffer, { failOn: 'none' })
      .flatten({ background: '#ffffff' })
      .grayscale()
      .threshold(180)
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer();
    variants.push(out3);
  } catch (e) {
    console.warn('預處理變體3失敗:', e.message);
  }
  return variants;
}

// OCR名片掃描API（不落地版本）
router.post('/scan-business-card', upload.single('cardImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '請上傳名片圖片' });
    }

    const originalBuffer = req.file.buffer;

    // 先對圖片進行正規化（處理 HEIC、旋轉、縮圖、壓縮）
    const normalized = await normalizeImageForOCRBuffer(originalBuffer);
    const imageBuffer = normalized.buffer;

    // 產生多組預處理影像
    const preprocessed = await preprocessForOCRBuffers(imageBuffer);
    const candidateBuffers = [imageBuffer, ...preprocessed];

    // 使用多種OCR服務進行識別
    let ocrResult = null;
    for (const candidate of candidateBuffers) {
      // 1) Google Vision
      if (!ocrResult && process.env.GOOGLE_VISION_API_KEY) {
        try {
          const r = await processWithGoogleVision(candidate);
          if (r && (r.rawText || '').trim().length >= 20) {
            ocrResult = r;
          }
        } catch (error) {
          console.log('Google Vision 失敗，嘗試其他方法:', error.message);
        }
      }
      // 2) OCR.space
      if (!ocrResult) {
        try {
          const r = await processWithOCRSpace(candidate);
          if (r && (r.rawText || '').trim().length >= 20) {
            ocrResult = r;
          }
        } catch (error) {
          console.log('OCR.space 失敗，嘗試其他候選影像:', error.message);
        }
      }
      if (ocrResult) break;
    }

    // 3) 全部失敗則回退本地規則
    if (!ocrResult) {
      ocrResult = await processWithLocalRules();
    }

    // 使用AI增強識別結果
    const enhancedResult = await enhanceWithAI(ocrResult.rawText);

    // 上傳至 Cloudinary（只上傳正規化後影像），不再回傳本機 URL
    const uploadJpegBuffer = await sharp(imageBuffer, { failOn: 'none' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const base64 = uploadJpegBuffer.toString('base64');
    const uploadResult = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}` ,{
      folder: 'bci-connect/business-cards',
      resource_type: 'image',
      overwrite: false,
      use_filename: false
    });
    const imageUrl = uploadResult.secure_url;

    return res.json({
      success: true,
      data: {
        extractedInfo: enhancedResult,
        rawText: ocrResult.rawText,
        confidence: ocrResult.confidence || 0.8,
        imageUrl
      }
    });
  } catch (error) {
    console.error('OCR掃描錯誤:', error);
    return res.status(500).json({ success: false, message: '名片掃描失敗，請稍後再試' });
  }
});

// Google Vision API處理（Buffer 版）
async function processWithGoogleVision(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');
  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    }
  );
  const textAnnotations = response.data.responses[0].textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error('未檢測到文字');
  }
  return {
    rawText: textAnnotations[0].description,
    confidence: 0.9
  };
}

// OCR.space API處理（Buffer 版）
async function processWithOCRSpace(imageBuffer) {
  const formData = new FormData();
  // 以 Buffer 直接附檔（指定檔名與 MIME）
  formData.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  formData.append('language', 'cht');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');

  const response = await axios.post('https://api.ocr.space/parse/image', formData, {
    headers: {
      ...formData.getHeaders(),
      'apikey': process.env.OCR_SPACE_API_KEY || 'helloworld'
    },
    timeout: 30000
  });

  if (!response.data.ParsedResults || response.data.ParsedResults.length === 0) {
    throw new Error('OCR解析失敗');
  }

  return {
    rawText: response.data.ParsedResults[0].ParsedText,
    confidence: 0.7
  };
}

// 本地規則處理（備用方案）
async function processWithLocalRules() {
  return {
    rawText: '請手動輸入名片信息，自動識別暫時不可用',
    confidence: 0.1
  };
}

// 使用AI增強識別結果
async function enhanceWithAI(rawText) {
  try {
    // 如果有Gemini服務，使用AI分析
    const geminiService = require('../services/geminiService');
    
    const prompt = `
請分析以下名片文字內容，提取關鍵信息並以JSON格式返回：

名片文字：
${rawText}

請提取以下信息（如果找不到請設為null）：
{
  "name": "姓名",
  "title": "職稱",
  "company": "公司名稱",
  "phone": "電話號碼",
  "mobile": "手機號碼",
  "email": "電子郵件",
  "website": "網站",
  "address": "地址",
  "fax": "傳真",
  "department": "部門",
  "social": {
    "linkedin": "LinkedIn 個人頁完整連結，如 https://www.linkedin.com/in/username",
    "facebook": "Facebook 個人或公司頁完整連結",
    "instagram": "Instagram 個人頁完整連結",
    "twitter": "Twitter/X 個人頁完整連結",
    "youtube": "YouTube 頻道或使用者完整連結",
    "tiktok": "TikTok 個人頁完整連結"
  },
  "line_id": "LINE ID（若有）",
  "tags": ["自動生成的標籤1", "標籤2"]
}

注意：
- 儘量輸出完整的社群連結（含 https 前綴）。
- 如果只有使用者名稱（例如 IG 的 @handle），請轉為對應平台的標準 URL。
- 若有 LINE ID，請放在 line_id 欄位；不要把 LINE 當成一般網址。
- 請根據公司名稱和職稱自動生成2-3個相關標籤。
    `;
    
    const aiResponse = await geminiService.generateContent(prompt);
    return parseAIResponse(aiResponse);
    
  } catch (error) {
    console.error('AI增強失敗:', error);
    // 如果AI失敗，使用規則提取
    return extractWithRules(rawText);
  }
}

// 解析AI回應
function parseAIResponse(aiResponse) {
  try {
    // 嘗試提取JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 保障結構完整性
      return {
        name: parsed.name ?? null,
        title: parsed.title ?? null,
        company: parsed.company ?? null,
        phone: parsed.phone ?? null,
        mobile: parsed.mobile ?? null,
        email: parsed.email ?? null,
        website: parsed.website ?? null,
        address: parsed.address ?? null,
        fax: parsed.fax ?? null,
        department: parsed.department ?? null,
        social: parsed.social || {},
        line_id: parsed.line_id ?? null,
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    }
  } catch (error) {
    console.error('解析AI回應失敗:', error);
  }
  
  // 如果解析失敗，返回空結構
  return {
    name: null,
    title: null,
    company: null,
    phone: null,
    mobile: null,
    email: null,
    website: null,
    address: null,
    fax: null,
    department: null,
    social: {},
    line_id: null,
    tags: []
  };
}

// 規則提取（備用方案）
function extractWithRules(text) {
  const result = {
    name: null,
    title: null,
    company: null,
    phone: null,
    mobile: null,
    email: null,
    website: null,
    address: null,
    fax: null,
    department: null,
    social: {},
    line_id: null,
    tags: []
  };
  
  // 電子郵件正則
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // 電話號碼正則（台灣格式）
  const phoneRegex = /(?:(?:\+886|886)|0)?[2-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }
  
  // 手機號碼正則
  const mobileRegex = /(?:(?:\+886|886)|0)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
  const mobileMatch = text.match(mobileRegex);
  if (mobileMatch) {
    result.mobile = mobileMatch[0];
  }
  
  // 網站正則
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  const websiteMatch = text.match(websiteRegex);
  if (websiteMatch) {
    // 避免把社群連結當成一般網站：先保留第一個
    result.website = websiteMatch[0];
  }

  // 社群連結正則匹配
  const findFirst = (regex) => {
    const m = text.match(regex);
    return m ? m[0] : null;
  };

  const linkedin = findFirst(/https?:\/\/(?:[\w-]+\.)?linkedin\.com\/[\w\-_/%.?=]+/i);
  const facebook = findFirst(/https?:\/\/(?:[\w-]+\.)?facebook\.com\/[A-Za-z0-9_.\-\/]+/i);
  const instagram = findFirst(/https?:\/\/(?:[\w-]+\.)?instagram\.com\/[A-Za-z0-9_.\-]+/i);
  const twitter = findFirst(/https?:\/\/(?:[\w-]+\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_\-]+/i);
  const youtube = findFirst(/https?:\/\/(?:[\w-]+\.)?(?:youtube\.com\/(?:channel|c|user|@)[A-Za-z0-9_\-@\/]+|youtu\.be\/[A-Za-z0-9_\-]+)/i);
  const tiktok = findFirst(/https?:\/\/(?:[\w-]+\.)?tiktok\.com\/@[\w.\-]+/i);

  if (linkedin) result.social.linkedin = linkedin;
  if (facebook) result.social.facebook = facebook;
  if (instagram) result.social.instagram = instagram;
  if (twitter) result.social.twitter = twitter;
  if (youtube) result.social.youtube = youtube;
  if (tiktok) result.social.tiktok = tiktok;

  // LINE ID（非網址）
  const lineIdMatch = text.match(/(?:LINE\s*ID|Line\s*ID|LINE|Line)\s*[:：]?\s*([A-Za-z0-9_.\-@]+)/);
  if (lineIdMatch && lineIdMatch[1]) {
    const id = lineIdMatch[1];
    result.line_id = id;
    // 方便前端點擊：也提供一個可能可用的連結
    result.social.line = `https://line.me/ti/p/~${id}`;
  }
  
  return result;
}

module.exports = router;