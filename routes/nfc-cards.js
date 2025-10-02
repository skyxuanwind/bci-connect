const express = require('express');
const router = express.Router();
const { pool, ensureLatestTemplatesExist } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { storage } = require('../config/cloudinary');

// 使用 Cloudinary 作為上傳儲存，僅允許圖片
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

// 獲取會員的電子名片
router.get('/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // 獲取會員基本信息
    const memberResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title, 
              u.contact_number, u.profile_picture_url, u.membership_level,
              c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在或未啟用' });
    }

    const member = memberResult.rows[0];

    // 獲取會員的電子名片配置
    const cardResult = await pool.query(
      `SELECT nc.*, nt.name as template_name, nt.css_config
       FROM nfc_cards nc
       LEFT JOIN nfc_card_templates nt ON nc.template_id = nt.id
       WHERE nc.user_id = $1 AND nc.is_active = true
       ORDER BY nc.updated_at DESC
       LIMIT 1`,
      [memberId]
    );

    let cardConfig = null;
    if (cardResult.rows.length > 0) {
      cardConfig = cardResult.rows[0];
      
      // 獲取名片內容區塊
      const contentResult = await pool.query(
        `SELECT * FROM nfc_card_content 
         WHERE card_id = $1 AND is_visible = true 
         ORDER BY display_order ASC`,
        [cardConfig.id]
      );
      
      cardConfig.content_blocks = contentResult.rows;
    }

    // 記錄瀏覽分析
    if (cardConfig) {
      try {
        await pool.query(
          `INSERT INTO nfc_card_visits (card_id, visitor_ip, visitor_user_agent, referrer)
           VALUES ($1, $2, $3, $4)`,
          [cardConfig.id, req.ip, req.get('User-Agent'), req.get('Referer')]
        );
      } catch (analyticsError) {
        console.warn('記錄瀏覽分析失敗:', analyticsError);
      }
    }

    res.json({
      member,
      cardConfig
    });
  } catch (error) {
    console.error('獲取電子名片錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 獲取當前用戶的電子名片配置（需要登入）
router.get('/my-card', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取用戶的電子名片
    const cardResult = await pool.query(
      `SELECT nc.*, nt.name as template_name, nt.css_config
       FROM nfc_cards nc
       LEFT JOIN nfc_card_templates nt ON nc.template_id = nt.id
       WHERE nc.user_id = $1
       ORDER BY nc.updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (cardResult.rows.length === 0) {
      // 如果沒有名片，創建默認名片
      const defaultTemplateResult = await pool.query(
        'SELECT id FROM nfc_card_templates WHERE name = $1',
        ['極簡高級風格']
      );
      
      const templateId = defaultTemplateResult.rows[0]?.id || 1;
      
      const newCardResult = await pool.query(
        `INSERT INTO nfc_cards (user_id, template_id, card_title, card_subtitle, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [userId, templateId, req.user.name, req.user.title || req.user.company]
      );
      
      const newCard = newCardResult.rows[0];
      
      // 獲取模板信息
      const templateResult = await pool.query(
        'SELECT name as template_name, css_config FROM nfc_card_templates WHERE id = $1',
        [templateId]
      );
      
      const cardConfig = {
        ...newCard,
        ...templateResult.rows[0],
        content_blocks: []
      };
      
      return res.json({ cardConfig });
    }

    const cardConfig = cardResult.rows[0];
    
    // 獲取內容區塊
    const contentResult = await pool.query(
      `SELECT * FROM nfc_card_content 
       WHERE card_id = $1 
       ORDER BY display_order ASC`,
      [cardConfig.id]
    );
    
    // 直接使用資料庫中的結構
    const contentBlocks = contentResult.rows.map(row => ({
      id: row.id,
      content_type: row.content_type,
      content_data: row.content_data || {},
      display_order: row.display_order,
      is_visible: row.is_visible,
      custom_styles: row.custom_styles || {}
    }));
    
    cardConfig.content_blocks = contentBlocks;

    res.json({ cardConfig });
  } catch (error) {
    console.error('獲取我的電子名片錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 更新電子名片基本信息
router.put('/my-card', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { card_title, card_subtitle, template_id, custom_css } = req.body;
    
    // 檢查是否已有名片
    const existingCard = await pool.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1',
      [userId]
    );
    
    let cardId;
    
    if (existingCard.rows.length === 0) {
      // 創建新名片
      const newCardResult = await pool.query(
        `INSERT INTO nfc_cards (user_id, template_id, card_title, card_subtitle, custom_css, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [userId, template_id, card_title, card_subtitle, custom_css]
      );
      cardId = newCardResult.rows[0].id;
    } else {
      // 更新現有名片
      cardId = existingCard.rows[0].id;
      await pool.query(
        `UPDATE nfc_cards 
         SET template_id = $1, card_title = $2, card_subtitle = $3, custom_css = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [template_id, card_title, card_subtitle, custom_css, cardId]
      );
    }
    
    res.json({ message: '電子名片更新成功', cardId });
  } catch (error) {
    console.error('更新電子名片錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 獲取所有可用模板
router.get('/templates', async (req, res) => {
  try {
    // 檢查 is_active 與 display_order 欄位是否存在，以避免舊資料庫報錯
    const colCheck = await pool.query(`
      SELECT 
        EXISTS(
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'nfc_card_templates' AND column_name = 'is_active'
        ) AS has_is_active,
        EXISTS(
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'nfc_card_templates' AND column_name = 'display_order'
        ) AS has_display_order
    `);
    const { has_is_active, has_display_order } = colCheck.rows[0] || { has_is_active: false, has_display_order: false };

    let sql = 'SELECT * FROM nfc_card_templates';
    if (has_is_active) {
      sql += ' WHERE is_active = true';
    }
    if (has_display_order) {
      sql += ' ORDER BY display_order, id ASC';
    } else {
      sql += ' ORDER BY id ASC';
    }

    const result = await pool.query(sql);
    
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('獲取模板錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 添加/更新內容區塊
router.post('/my-card/content', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content_blocks } = req.body;
    
    // 獲取用戶的名牌ID
    const cardResult = await pool.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1',
      [userId]
    );
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({ message: '請先創建電子名片' });
    }
    
    const cardId = cardResult.rows[0].id;
    
    // 刪除現有內容區塊
    await pool.query('DELETE FROM nfc_card_content WHERE card_id = $1', [cardId]);

    // 添加新的內容區塊
    for (let i = 0; i < content_blocks.length; i++) {
      const block = content_blocks[i] || {};
      const contentType = block.content_type || block.block_type;
      const contentData = block.content_data || {};

      await pool.query(
        `INSERT INTO nfc_card_content 
         (card_id, content_type, content_data, display_order, is_visible, custom_styles)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cardId,
          contentType,
          contentData,
          block.display_order ?? i,
          block.is_visible !== false,
          block.custom_styles || {}
        ]
      );
    }
    
    res.json({ message: '內容區塊更新成功' });
  } catch (error) {
    console.error('更新內容區塊錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 生成vCard文件
router.get('/member/:memberId/vcard', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // 獲取會員信息
    const memberResult = await pool.query(
      `SELECT u.name, u.email, u.company, u.title, u.contact_number, u.profile_picture_url,
              c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [memberId]
    );
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在' });
    }
    
    const member = memberResult.rows[0];
    
    // 生成vCard內容
    const vCardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${member.name}`,
      `ORG:${member.company || ''}`,
      `TITLE:${member.title || ''}`,
      `EMAIL:${member.email}`,
      `TEL:${member.contact_number || ''}`,
      `URL:${process.env.CLIENT_URL || 'http://localhost:3000'}/member-card/${memberId}`,
      'END:VCARD'
    ].join('\r\n');
    
    // 記錄下載分析
    const cardResult = await pool.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1 AND is_active = true',
      [memberId]
    );
    
    if (cardResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO nfc_card_analytics (card_id, event_type, visitor_ip, visitor_user_agent)
         VALUES ($1, 'vcard_download', $2, $3)`,
        [cardResult.rows[0].id, req.ip, req.get('User-Agent')]
      );
    }
    
    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `attachment; filename="${member.name}.vcf"`);
    res.send(vCardContent);
  } catch (error) {
    console.error('生成vCard錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 獲取名片分析數據（需要登入）
router.get('/my-card/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取名片ID
    const cardResult = await pool.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    
    if (cardResult.rows.length === 0) {
      return res.json({ analytics: [] });
    }
    
    const cardId = cardResult.rows[0].id;
    
    // 獲取分析數據
    const analyticsResult = await pool.query(
      `SELECT event_type, COUNT(*) as count, 
              DATE_TRUNC('day', created_at) as date
       FROM nfc_card_analytics 
       WHERE card_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY event_type, DATE_TRUNC('day', created_at)
       ORDER BY date DESC`,
      [cardId]
    );
    
    res.json({ analytics: analyticsResult.rows });
  } catch (error) {
    console.error('獲取分析數據錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 公開訪問的測試端點
router.get('/public/test-card', async (req, res) => {
  try {
    // 返回一個測試用的電子名片數據
    const testCard = {
      member: {
        id: 'test',
        name: '測試用戶',
        email: 'test@example.com',
        company: '測試公司',
        title: '測試職位',
        contact_number: '0912-345-678',
        profile_picture_url: null,
        membership_level: 1,
        chapter_name: '台北分會'
      },
      cardConfig: {
        id: 'test',
        template_name: '極簡高級風格',
        css_config: {
          primaryColor: '#000000',
          secondaryColor: '#FFD700',
          backgroundColor: '#FFFFFF',
          accentColor: '#C9B037',
          textColor: '#333333',
          fontFamily: 'Inter, sans-serif',
          cardShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          borderRadius: '24px',
          spacing: 'generous',
          layoutStyle: 'minimal-luxury',
          avatarStyle: 'circle',
          goldAccent: true,
          iconStyle: 'modern-line'
        },
        content_blocks: [
          {
            content_type: 'contact',
            content_data: {
              phone: '0912-345-678',
              email: 'test@example.com'
            },
            display_order: 0,
            is_visible: true
          },
          {
            content_type: 'social',
            content_data: {
              linkedin: 'https://linkedin.com/in/test',
              facebook: 'https://facebook.com/test'
            },
            display_order: 1,
            is_visible: true
          }
        ]
      }
    };
    
    res.json(testCard);
  } catch (error) {
    console.error('測試端點錯誤:', error);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

// 新增：上傳圖片（Cloudinary）
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
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

module.exports = router;