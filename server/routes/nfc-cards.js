const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const vCard = require('vcards-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { storage } = require('../config/cloudinary');

// 使用 Cloudinary 作為上傳儲存
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 記錄訪問日誌的中間件
const logVisit = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const cardResult = await db.query('SELECT id FROM nfc_cards WHERE user_id = $1', [userId]);
    
    if (cardResult.rows.length > 0) {
      const cardId = cardResult.rows[0].id;
      const visitorIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const referrer = req.get('Referrer');
      const sessionId = req.sessionID || 'anonymous';
      
      await db.query(
        'INSERT INTO nfc_card_visits (card_id, visitor_ip, visitor_user_agent, referrer, session_id) VALUES ($1, $2, $3, $4, $5)',
        [cardId, visitorIp, userAgent, referrer, sessionId]
      );
      
      // 增加查看次數
      await db.query('SELECT increment_card_view_count($1)', [userId]);
    }
  } catch (error) {
    console.error('記錄訪問日誌失敗:', error);
  }
  next();
};

// 1. 獲取所有模板
router.get('/templates', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM nfc_card_templates WHERE is_active = true ORDER BY display_order'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取模板失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取模板失敗'
    });
  }
});

// 2. 獲取用戶的名片信息（公開訪問）
router.get('/member/:userId', logVisit, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 獲取名片基本信息和用戶信息
    const cardResult = await db.query(`
      SELECT 
        nc.*,
        nct.name as template_name,
        nct.css_config as template_css_config,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.company as user_company,
        u.position as user_position,
        u.avatar as user_avatar,
        u.website as user_website
      FROM nfc_cards nc
      LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
      LEFT JOIN users u ON nc.user_id = u.id
      WHERE nc.user_id = $1 AND nc.is_active = true
    `, [userId]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在或未啟用'
      });
    }
    
    const card = cardResult.rows[0];
    
    // 獲取內容區塊
    const contentResult = await db.query(`
      SELECT *
      FROM nfc_content_blocks
      WHERE card_id = $1 AND is_visible = true
      ORDER BY display_order ASC
    `, [card.id]);
    
    // 解析 JSON 字段
    const contentBlocks = contentResult.rows.map(block => ({
      ...block,
      content_data: typeof block.content_data === 'string' 
        ? JSON.parse(block.content_data) 
        : (block.content_data || {})
    }));
    
    res.json({
      success: true,
      data: {
        ...card,
        content_blocks: contentBlocks
      }
    });
  } catch (error) {
    console.error('獲取用戶名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶名片失敗'
    });
  }
});

// 3. 獲取當前用戶的名片（需要認證）
router.get('/my-card', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cardResult = await db.query('SELECT * FROM nfc_cards WHERE user_id = $1', [userId]);
    
    if (cardResult.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    const card = cardResult.rows[0];
    const contentResult = await db.query('SELECT * FROM nfc_content_blocks WHERE card_id = $1 ORDER BY display_order ASC', [card.id]);
    
    res.json({
      success: true,
      data: {
        ...card,
        content_blocks: contentResult.rows
      }
    });
  } catch (error) {
    console.error('獲取我的名片失敗:', error);
    res.status(500).json({ success: false, message: '獲取我的名片失敗' });
  }
});

// 4. 創建或更新名片（需要認證）
router.post('/my-card', auth, async (req, res) => {
  const client = await db.connect();
  try {
    const userId = req.user.id;
    const { card_title, card_subtitle, template_id, custom_css, content } = req.body;
    
    // 檢查是否已有名片
    const existing = await client.query('SELECT id FROM nfc_cards WHERE user_id = $1', [userId]);
    let cardId = existing.rows[0]?.id || null;
    
    if (cardId) {
      await client.query(`
        UPDATE nfc_cards 
        SET card_title = $1, card_subtitle = $2, template_id = $3, custom_css = $4, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $5
      `, [card_title, card_subtitle, template_id, custom_css, userId]);
    } else {
      const created = await client.query(`
        INSERT INTO nfc_cards (user_id, card_title, card_subtitle, template_id, custom_css)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userId, card_title, card_subtitle, template_id, custom_css]);
      cardId = created.rows[0].id;
    }
    
    await client.query('DELETE FROM nfc_content_blocks WHERE card_id = $1', [cardId]);
    
    if (content && content.length > 0) {
      for (let i = 0; i < content.length; i++) {
        const item = content[i];
        await client.query(`
           INSERT INTO nfc_content_blocks (card_id, block_type, title, content, url, image_url, social_platform, map_address, map_coordinates, display_order, is_visible, custom_styles)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         `, [cardId, item.block_type, item.title, item.content, item.url, item.image_url, item.social_platform, item.map_address, item.map_coordinates, i, item.is_visible !== false, JSON.stringify(item.custom_styles || {})]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '名片保存成功',
      data: {
        cardId,
        cardUrl: `${req.protocol}://${req.get('host')}/member-card/${userId}`
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('保存名片失敗:', error);
    res.status(500).json({ success: false, message: '保存名片失敗' });
  } finally {
    client.release();
  }
});

// 5. 上傳文件（Cloudinary）
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '沒有上傳文件' });
    }
    const fileUrl = req.file.path; // Cloudinary secure URL
    res.json({
      success: true,
      message: '文件上傳成功',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('文件上傳失敗:', error);
    res.status(500).json({ success: false, message: '文件上傳失敗' });
  }
});

// 6. 生成並下載 vCard
router.get('/vcard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 獲取用戶和名片信息
    const result = await db.query(`
      SELECT 
        u.name, u.email, u.phone, u.company, u.position, u.website, u.address, u.avatar,
        nc.card_title, nc.card_subtitle
      FROM users u
      LEFT JOIN nfc_cards nc ON u.id = nc.user_id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    const user = result.rows[0];
    const vcard = vCard();
    
    if (user.name) {
      const nameParts = user.name.split(' ');
      vcard.firstName = nameParts[0] || '';
      vcard.lastName = nameParts.slice(1).join(' ') || '';
    }
    if (user.company) vcard.organization = user.company;
    if (user.position) vcard.title = user.position;
    if (user.email) vcard.email = user.email;
    if (user.phone) vcard.cellPhone = user.phone;
    if (user.website) vcard.url = user.website;
    if (user.address) vcard.homeAddress = user.address;

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `attachment; filename="${user.name}.vcf"`);
    res.send(vcard.getFormattedString());
  } catch (error) {
    console.error('生成 vCard 失敗:', error);
    res.status(500).json({ success: false, message: '生成 vCard 失敗' });
  }
});

// 7. 統計數據
router.get('/statistics', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT nc.user_id, COUNT(ncv.id) AS visit_count
      FROM nfc_cards nc
      LEFT JOIN nfc_card_visits ncv ON nc.id = ncv.card_id
      GROUP BY nc.user_id
      ORDER BY visit_count DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取統計數據失敗:', error);
    res.status(500).json({ success: false, message: '獲取統計數據失敗' });
  }
});

// 8. 切換名片啟用狀態
router.patch('/my-card/toggle', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const current = await db.query('SELECT is_active FROM nfc_cards WHERE user_id = $1', [userId]);
    const active = !current.rows[0]?.is_active;
    await db.query('UPDATE nfc_cards SET is_active = $1 WHERE user_id = $2', [active, userId]);
    res.json({ success: true, is_active: active });
  } catch (error) {
    console.error('切換名片狀態失敗:', error);
    res.status(500).json({ success: false, message: '切換名片狀態失敗' });
  }
});

// 9. 刪除名片
router.delete('/my-card', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('DELETE FROM nfc_card_visits WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)', [userId]);
    await db.query('DELETE FROM nfc_content_blocks WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)', [userId]);
    await db.query('DELETE FROM nfc_cards WHERE user_id = $1', [userId]);
    res.json({ success: true, message: '刪除成功' });
  } catch (error) {
    console.error('刪除名片失敗:', error);
    res.status(500).json({ success: false, message: '刪除名片失敗' });
  }
});

// 10. 最近訪問
router.get('/recent-visits', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ncv.*, u.name
      FROM nfc_card_visits ncv
      JOIN nfc_cards nc ON ncv.card_id = nc.id
      JOIN users u ON nc.user_id = u.id
      ORDER BY ncv.visit_time DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取最近訪問失敗:', error);
    res.status(500).json({ success: false, message: '獲取最近訪問失敗' });
  }
});

module.exports = router;