const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// 配置multer用於圖片上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/business-cards');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'business-card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件'));
    }
  }
});

// OCR名片掃描API
router.post('/scan-business-card', upload.single('cardImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請上傳名片圖片'
      });
    }

    const imagePath = req.file.path;
    
    // 使用多種OCR服務進行識別
    let ocrResult = null;
    
    // 1. 嘗試使用Google Vision API（如果配置了）
    if (process.env.GOOGLE_VISION_API_KEY) {
      try {
        ocrResult = await processWithGoogleVision(imagePath);
      } catch (error) {
        console.log('Google Vision API失敗，嘗試其他方法:', error.message);
      }
    }
    
    // 2. 如果Google Vision失敗，使用OCR.space API（免費版）
    if (!ocrResult) {
      try {
        ocrResult = await processWithOCRSpace(imagePath);
      } catch (error) {
        console.log('OCR.space API失敗，使用本地處理:', error.message);
      }
    }
    
    // 3. 如果都失敗，使用本地規則處理
    if (!ocrResult) {
      ocrResult = await processWithLocalRules(imagePath);
    }
    
    // 使用AI增強識別結果
    const enhancedResult = await enhanceWithAI(ocrResult.rawText);
    
    // 清理上傳的臨時文件
    fs.unlinkSync(imagePath);
    
    res.json({
      success: true,
      data: {
        extractedInfo: enhancedResult,
        rawText: ocrResult.rawText,
        confidence: ocrResult.confidence || 0.8
      }
    });
    
  } catch (error) {
    console.error('OCR掃描錯誤:', error);
    
    // 清理臨時文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: '名片掃描失敗，請稍後再試'
    });
  }
});

// Google Vision API處理
async function processWithGoogleVision(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
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

// OCR.space API處理（免費版）
async function processWithOCRSpace(imagePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(imagePath));
  formData.append('language', 'cht'); // 繁體中文
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  
  const response = await axios.post('https://api.ocr.space/parse/image', formData, {
    headers: {
      ...formData.getHeaders(),
      'apikey': process.env.OCR_SPACE_API_KEY || 'helloworld' // 免費key
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
async function processWithLocalRules(imagePath) {
  // 這裡可以實現基本的圖片處理和文字識別
  // 目前返回示例數據
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
  "tags": ["自動生成的標籤1", "標籤2"]
}

請根據公司名稱和職稱自動生成2-3個相關標籤。
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
      return JSON.parse(jsonMatch[0]);
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
    result.website = websiteMatch[0];
  }
  
  return result;
}

module.exports = router;