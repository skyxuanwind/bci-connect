const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const vCard = require('vcards-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上傳
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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: function (req, file, cb) {
    // 只允許圖片和視頻文件
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片或視頻文件'), false);
    }
  }
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
        u.website as user_website,
        u.address as user_address
      FROM nfc_cards nc
      LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
      LEFT JOIN users u ON nc.user_id = u.id
      WHERE nc.user_id = $1 AND nc.is_active = true
    `, [userId]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在或已停用'
      });
    }
    
    const card = cardResult.rows[0];
    
    // 獲取名片內容區塊
    const contentResult = await db.query(`
      SELECT * FROM nfc_card_content 
      WHERE card_id = $1 AND is_visible = true 
      ORDER BY display_order
    `, [card.id]);
    
    res.json({
      success: true,
      data: {
        ...card,
        content: contentResult.rows
      }
    });
  } catch (error) {
    console.error('獲取名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取名片失敗'
    });
  }
});

// 3. 獲取當前用戶的名片信息（需要登入）
router.get('/my-card', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取名片基本信息
    const cardResult = await db.query(`
      SELECT 
        nc.*,
        nct.name as template_name,
        nct.css_config as template_css_config
      FROM nfc_cards nc
      LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
      WHERE nc.user_id = $1
    `, [userId]);
    
    let card = null;
    let content = [];
    
    if (cardResult.rows.length > 0) {
      card = cardResult.rows[0];
      
      // 獲取名片內容區塊
      const contentResult = await db.query(`
        SELECT * FROM nfc_card_content 
        WHERE card_id = $1 
        ORDER BY display_order
      `, [card.id]);
      
      content = contentResult.rows;
    }
    
    res.json({
      success: true,
      data: {
        card,
        content,
        cardUrl: card ? `${req.protocol}://${req.get('host')}/member/${userId}` : null
      }
    });
  } catch (error) {
    console.error('獲取我的名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取我的名片失敗'
    });
  }
});

// 4. 創建或更新名片
router.post('/my-card', auth, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { card_title, card_subtitle, template_id, custom_css, content } = req.body;
    
    // 檢查是否已有名片
    const existingCard = await client.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1',
      [userId]
    );
    
    let cardId;
    
    if (existingCard.rows.length > 0) {
      // 更新現有名片
      cardId = existingCard.rows[0].id;
      await client.query(`
        UPDATE nfc_cards 
        SET card_title = $1, card_subtitle = $2, template_id = $3, custom_css = $4, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $5
      `, [card_title, card_subtitle, template_id, custom_css, userId]);
    } else {
      // 創建新名片
      const newCard = await client.query(`
        INSERT INTO nfc_cards (user_id, card_title, card_subtitle, template_id, custom_css)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userId, card_title, card_subtitle, template_id, custom_css]);
      cardId = newCard.rows[0].id;
    }
    
    // 刪除舊的內容區塊
    await client.query('DELETE FROM nfc_card_content WHERE card_id = $1', [cardId]);
    
    // 插入新的內容區塊
    if (content && content.length > 0) {
      for (let i = 0; i < content.length; i++) {
        const item = content[i];
        await client.query(`
          INSERT INTO nfc_card_content (card_id, content_type, content_data, display_order, is_visible, custom_styles)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [cardId, item.content_type, JSON.stringify(item.content_data), i, item.is_visible !== false, JSON.stringify(item.custom_styles || {})]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '名片保存成功',
      data: {
        cardId,
        cardUrl: `${req.protocol}://${req.get('host')}/member/${userId}`
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('保存名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '保存名片失敗'
    });
  } finally {
    client.release();
  }
});

// 5. 上傳文件
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '沒有上傳文件'
      });
    }
    
    const fileUrl = `/uploads/nfc-cards/${req.file.filename}`;
    
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
    res.status(500).json({
      success: false,
      message: '文件上傳失敗'
    });
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
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    const user = result.rows[0];
    
    // 創建 vCard
    const vcard = vCard();
    
    // 基本信息
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
    if (user.address) vcard.workAddress.label = user.address;
    
    // 名片標題作為備註
    if (user.card_title) vcard.note = user.card_title;
    if (user.card_subtitle) vcard.note += (user.card_title ? '\n' : '') + user.card_subtitle;
    
    // 設置響應頭
    const filename = `${user.name || 'contact'}_${Date.now()}.vcf`;
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // 發送 vCard 內容
    res.send(vcard.getFormattedString());
  } catch (error) {
    console.error('生成 vCard 失敗:', error);
    res.status(500).json({
      success: false,
      message: '生成 vCard 失敗'
    });
  }
});

// 7. 獲取名片統計信息
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query('SELECT * FROM get_card_statistics($1)', [userId]);
    
    res.json({
      success: true,
      data: result.rows[0] || {
        total_views: 0,
        today_views: 0,
        this_week_views: 0,
        this_month_views: 0
      }
    });
  } catch (error) {
    console.error('獲取統計信息失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計信息失敗'
    });
  }
});

// 8. 切換名片狀態（啟用/停用）
router.patch('/my-card/toggle', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(`
      UPDATE nfc_cards 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING is_active
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在'
      });
    }
    
    res.json({
      success: true,
      message: `名片已${result.rows[0].is_active ? '啟用' : '停用'}`,
      data: {
        is_active: result.rows[0].is_active
      }
    });
  } catch (error) {
    console.error('切換名片狀態失敗:', error);
    res.status(500).json({
      success: false,
      message: '切換名片狀態失敗'
    });
  }
});

// 9. 刪除名片
router.delete('/my-card', auth, async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    
    // 刪除名片內容
    await client.query(`
      DELETE FROM nfc_card_content 
      WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)
    `, [userId]);
    
    // 刪除訪問記錄
    await client.query(`
      DELETE FROM nfc_card_visits 
      WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)
    `, [userId]);
    
    // 刪除名片
    const result = await client.query(
      'DELETE FROM nfc_cards WHERE user_id = $1 RETURNING id',
      [userId]
    );
    
    await client.query('COMMIT');
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在'
      });
    }
    
    res.json({
      success: true,
      message: '名片已刪除'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('刪除名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除名片失敗'
    });
  } finally {
    client.release();
  }
});

// 10. 獲取最近訪問記錄
router.get('/recent-visits', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await db.query(`
      SELECT 
        ncv.visitor_ip,
        ncv.visit_time,
        ncv.referrer,
        ncv.visitor_user_agent
      FROM nfc_card_visits ncv
      JOIN nfc_cards nc ON ncv.card_id = nc.id
      WHERE nc.user_id = $1
      ORDER BY ncv.visit_time DESC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取訪問記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取訪問記錄失敗'
    });
  }
});

module.exports = router;