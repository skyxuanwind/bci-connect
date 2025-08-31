const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
- const authenticateToken = require('../middleware/auth');
+ const { authenticateToken } = require('../middleware/auth');
const vCard = require('vcards-js');
const router = express.Router();

// 設定圖片上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/nfc-cards';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'nfc-card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案 (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// ========== 公開路由 ==========

// 獲取公開名片頁面 (支援會員ID或自定義URL)
router.get('/public/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let query;
    let queryParams;
    
    // 判斷是數字ID還是自定義URL
    if (/^\d+$/.test(identifier)) {
      // 數字ID - 查詢user_id
      query = `
        SELECT 
          nmc.*,
          nct.name as template_name,
          nct.category as template_category,
          nct.css_config,
          u.name,
          u.email,
          u.company,
          u.industry,
          u.title,
          u.contact_number,
          u.profile_picture_url
        FROM nfc_member_cards nmc
        JOIN nfc_card_templates nct ON nmc.template_id = nct.id
        JOIN users u ON nmc.user_id = u.id
        WHERE nmc.user_id = $1 AND nmc.is_active = true AND nmc.is_public = true
      `;
      queryParams = [identifier];
    } else {
      // 自定義URL
      query = `
        SELECT 
          nmc.*,
          nct.name as template_name,
          nct.category as template_category,
          nct.css_config,
          u.name,
          u.email,
          u.company,
          u.industry,
          u.title,
          u.contact_number,
          u.profile_picture_url
        FROM nfc_member_cards nmc
        JOIN nfc_card_templates nct ON nmc.template_id = nct.id
        JOIN users u ON nmc.user_id = u.id
        WHERE nmc.custom_url_slug = $1 AND nmc.is_active = true AND nmc.is_public = true
      `;
      queryParams = [identifier];
    }
    
    const cardResult = await pool.query(query, queryParams);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: '名片不存在或未公開' });
    }
    
    const card = cardResult.rows[0];
    
    // 獲取內容區塊
    const blocksResult = await pool.query(
      `SELECT * FROM nfc_content_blocks 
       WHERE card_id = $1 AND is_visible = true 
       ORDER BY display_order ASC`,
      [card.id]
    );
    
    // 記錄瀏覽數據
    await pool.query(
      `UPDATE nfc_member_cards SET view_count = view_count + 1 WHERE id = $1`,
      [card.id]
    );
    
    // 記錄分析數據
    const userAgent = req.get('User-Agent') || '';
    const referrer = req.get('Referer') || '';
    const clientIP = req.ip || req.connection.remoteAddress;
    
    await pool.query(
      `INSERT INTO nfc_card_analytics 
       (card_id, event_type, visitor_ip, visitor_user_agent, referrer) 
       VALUES ($1, 'view', $2, $3, $4)`,
      [card.id, clientIP, userAgent, referrer]
    );
    
    res.json({
      card: card,
      contentBlocks: blocksResult.rows
    });
    
  } catch (error) {
    console.error('獲取公開名片錯誤:', error);
    res.status(500).json({ error: '獲取名片失敗' });
  }
});

// 生成並下載 vCard
router.get('/vcard/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let query;
    let queryParams;
    
    if (/^\d+$/.test(identifier)) {
      query = `
        SELECT nmc.*, u.name, u.email, u.company, u.title, u.contact_number
        FROM nfc_member_cards nmc
        JOIN users u ON nmc.user_id = u.id
        WHERE nmc.user_id = $1 AND nmc.is_active = true AND nmc.is_public = true
      `;
      queryParams = [identifier];
    } else {
      query = `
        SELECT nmc.*, u.name, u.email, u.company, u.title, u.contact_number
        FROM nfc_member_cards nmc
        JOIN users u ON nmc.user_id = u.id
        WHERE nmc.custom_url_slug = $1 AND nmc.is_active = true AND nmc.is_public = true
      `;
      queryParams = [identifier];
    }
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '名片不存在' });
    }
    
    const card = result.rows[0];
    
    // 創建 vCard
    const vcard = vCard();
    vcard.firstName = card.name || '';
    vcard.organization = card.company || '';
    vcard.title = card.title || '';
    vcard.email = card.email || '';
    vcard.cellPhone = card.contact_number || '';
    
    // 獲取聯絡方式內容區塊
    const contactBlocks = await pool.query(
      `SELECT * FROM nfc_content_blocks 
       WHERE card_id = $1 AND block_type IN ('link', 'social') AND is_visible = true`,
      [card.id]
    );
    
    // 添加網站和社群媒體
    contactBlocks.rows.forEach(block => {
      if (block.url) {
        vcard.url = block.url;
      }
    });
    
    // 更新下載計數
    await pool.query(
      `UPDATE nfc_member_cards SET vcard_download_count = vcard_download_count + 1 WHERE id = $1`,
      [card.id]
    );
    
    // 記錄分析數據
    const userAgent = req.get('User-Agent') || '';
    const clientIP = req.ip || req.connection.remoteAddress;
    
    await pool.query(
      `INSERT INTO nfc_card_analytics 
       (card_id, event_type, visitor_ip, visitor_user_agent) 
       VALUES ($1, 'vcard_download', $2, $3)`,
      [card.id, clientIP, userAgent]
    );
    
    const vcardString = vcard.getFormattedString();
    const fileName = `${card.name || 'contact'}.vcf`;
    
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(vcardString);
    
  } catch (error) {
    console.error('生成 vCard 錯誤:', error);
    res.status(500).json({ error: '生成聯絡人檔案失敗' });
  }
});

// ========== 會員專用路由 ==========

// 獲取我的名片資料
router.get('/my-card', authenticateToken, async (req, res) => {
  try {
    // 獲取名片基本資料
    const cardResult = await pool.query(
      `SELECT 
         nmc.*,
         nct.name as template_name,
         nct.category as template_category,
         nct.css_config
       FROM nfc_member_cards nmc
       LEFT JOIN nfc_card_templates nct ON nmc.template_id = nct.id
       WHERE nmc.user_id = $1`,
      [req.user.id]
    );
    
    let card = null;
    let contentBlocks = [];
    
    if (cardResult.rows.length > 0) {
      card = cardResult.rows[0];
      
      // 獲取內容區塊
      const blocksResult = await pool.query(
        `SELECT * FROM nfc_content_blocks 
         WHERE card_id = $1 
         ORDER BY display_order ASC`,
        [card.id]
      );
      contentBlocks = blocksResult.rows;
    }
    
    // 獲取所有可用模板
    const templatesResult = await pool.query(
      `SELECT * FROM nfc_card_templates WHERE is_active = true ORDER BY id ASC`
    );
    
    res.json({
      card: card,
      contentBlocks: contentBlocks,
      templates: templatesResult.rows
    });
    
  } catch (error) {
    console.error('獲取我的名片錯誤:', error);
    res.status(500).json({ error: '獲取名片資料失敗' });
  }
});

// 創建或更新名片
router.post('/my-card', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { template_id, custom_url_slug, is_public, seo_title, seo_description, content_blocks } = req.body;
    
    // 檢查自定義URL是否已被使用
    if (custom_url_slug) {
      const slugCheck = await client.query(
        'SELECT id FROM nfc_member_cards WHERE custom_url_slug = $1 AND user_id != $2',
        [custom_url_slug, req.user.id]
      );
      
      if (slugCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '此自定義網址已被使用' });
      }
    }
    
    // 檢查是否已有名片
    const existingCard = await client.query(
      'SELECT id FROM nfc_member_cards WHERE user_id = $1',
      [req.user.id]
    );
    
    let cardId;
    
    if (existingCard.rows.length > 0) {
      // 更新現有名片
      cardId = existingCard.rows[0].id;
      
      await client.query(
        `UPDATE nfc_member_cards 
         SET template_id = $1, custom_url_slug = $2, is_public = $3, 
             seo_title = $4, seo_description = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [template_id, custom_url_slug, is_public, seo_title, seo_description, cardId]
      );
      
      // 刪除舊的內容區塊
      await client.query('DELETE FROM nfc_content_blocks WHERE card_id = $1', [cardId]);
      
    } else {
      // 創建新名片
      const newCardResult = await client.query(
        `INSERT INTO nfc_member_cards 
         (user_id, template_id, custom_url_slug, is_public, seo_title, seo_description) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, template_id, custom_url_slug, is_public, seo_title, seo_description]
      );
      
      cardId = newCardResult.rows[0].id;
    }
    
    // 插入新的內容區塊
    if (content_blocks && content_blocks.length > 0) {
      for (let i = 0; i < content_blocks.length; i++) {
        const block = content_blocks[i];
        await client.query(
          `INSERT INTO nfc_content_blocks 
           (card_id, block_type, title, content, url, image_url, social_platform, 
            map_address, map_coordinates, display_order, is_visible, custom_styles) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            cardId, block.block_type, block.title, block.content, block.url,
            block.image_url, block.social_platform, block.map_address,
            block.map_coordinates, i, block.is_visible !== false, block.custom_styles
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: '名片儲存成功',
      cardId: cardId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('儲存名片錯誤:', error);
    res.status(500).json({ error: '儲存名片失敗' });
  } finally {
    client.release();
  }
});

// 上傳圖片
router.post('/upload-image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請選擇要上傳的圖片' });
    }
    
    const imageUrl = `/uploads/nfc-cards/${req.file.filename}`;
    
    res.json({
      message: '圖片上傳成功',
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('圖片上傳錯誤:', error);
    res.status(500).json({ error: '圖片上傳失敗' });
  }
});

// 獲取名片統計數據
router.get('/analytics/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    
    // 驗證名片所有權
    const cardCheck = await pool.query(
      'SELECT id FROM nfc_member_cards WHERE id = $1 AND user_id = $2',
      [cardId, req.user.id]
    );
    
    if (cardCheck.rows.length === 0) {
      return res.status(403).json({ error: '無權限查看此名片統計' });
    }
    
    // 獲取基本統計
    const basicStats = await pool.query(
      `SELECT view_count, share_count, vcard_download_count 
       FROM nfc_member_cards WHERE id = $1`,
      [cardId]
    );
    
    // 獲取最近30天的瀏覽趨勢
    const viewTrend = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as views
       FROM nfc_card_analytics 
       WHERE card_id = $1 AND event_type = 'view' 
         AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [cardId]
    );
    
    // 獲取事件類型統計
    const eventStats = await pool.query(
      `SELECT event_type, COUNT(*) as count
       FROM nfc_card_analytics 
       WHERE card_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY event_type`,
      [cardId]
    );
    
    res.json({
      basicStats: basicStats.rows[0],
      viewTrend: viewTrend.rows,
      eventStats: eventStats.rows
    });
    
  } catch (error) {
    console.error('獲取統計數據錯誤:', error);
    res.status(500).json({ error: '獲取統計數據失敗' });
  }
});

// 刪除名片
router.delete('/my-card', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM nfc_member_cards WHERE user_id = $1 RETURNING id',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到要刪除的名片' });
    }
    
    res.json({ message: '名片刪除成功' });
    
  } catch (error) {
    console.error('刪除名片錯誤:', error);
    res.status(500).json({ error: '刪除名片失敗' });
  }
});

module.exports = router;