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
    // 啟動時保證最新模板存在（冪等），避免前端拿到舊模板
    try {
      await ensureLatestTemplatesExist();
    } catch (e) {
      console.warn('確保最新模板存在時發生非致命錯誤：', e?.message || String(e));
    }

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
    // 安全回退：若資料庫查詢失敗，仍提供五個新模板以維持前端體驗
    const fallbackTemplates = [
      { name: '極簡高級風格', category: 'minimal-luxury', is_active: true, css_config: { layoutStyle: 'minimal-luxury' } },
      { name: '未來科技感風格', category: 'futuristic-tech', is_active: true, css_config: { layoutStyle: 'dashboard' } },
      { name: '創意品牌風格', category: 'creative-brand', is_active: true, css_config: { layoutStyle: 'split-creative' } },
      { name: '專業商務風格', category: 'professional-business', is_active: true, css_config: { layoutStyle: 'corporate' } },
      { name: '動態互動風格', category: 'dynamic-interactive', is_active: true, css_config: { layoutStyle: 'dynamic-center' } }
    ];
    res.status(200).json({ templates: fallbackTemplates, fallback: true });
  }
});

// 重置 NFC 模板端點
router.post('/reset-templates', async (req, res) => {
  try {
    console.log('🔄 Starting template reset...');
    
    // 清空現有模板
    await pool.query('DELETE FROM nfc_card_templates');
    console.log('✅ Cleared existing templates');

    // 更新 category 約束以支援新的類別
    try {
      await pool.query(`
        ALTER TABLE nfc_card_templates 
        DROP CONSTRAINT IF EXISTS nfc_card_templates_category_check
      `);
      
      await pool.query(`
        ALTER TABLE nfc_card_templates 
        ADD CONSTRAINT nfc_card_templates_category_check 
        CHECK (category IN (
          'business', 'creative', 'minimal', 'tech', 'elegant', 'modern', 'eco', 'luxury', 'artistic',
          'premium-business', 'cyberpunk', 'japanese-minimal', 'creative-marketing', 'cute-graffiti'
        ))
      `);
      console.log('✅ Updated category constraints');
    } catch (e) {
      console.warn('Category constraint update failed (non-critical):', e.message);
    }

    const templates = [
      {
        name: '質感商務感',
        description: '高質感商務設計，展現專業與品味的完美結合',
        category: 'premium-business',
        className: 'template-premium-business'
      },
      {
        name: 'Cyberpunk風格',
        description: '未來科技感設計，霓虹色彩與數位美學的視覺衝擊',
        category: 'cyberpunk',
        className: 'template-cyberpunk'
      },
      {
        name: '簡約日系風',
        description: '日式極簡美學，清新自然的設計語言',
        category: 'japanese-minimal',
        className: 'template-japanese-minimal'
      },
      {
        name: '創意行銷風格',
        description: '活潑創意設計，吸引眼球的行銷視覺效果',
        category: 'creative-marketing',
        className: 'template-creative-marketing'
      },
      {
        name: '塗鴉可愛風',
        description: '手繪塗鴉風格，充滿童趣與創意的可愛設計',
        category: 'cute-graffiti',
        className: 'template-cute-graffiti'
      }
    ];

    for (const template of templates) {
       await pool.query(
         `INSERT INTO nfc_card_templates (
            name, description, category, css_config, preview_image_url, is_active, created_at, updated_at
          )
          VALUES ($1::text, $2::text, $3::text, $4::jsonb, $5::text, true, NOW(), NOW())`,
         [
           template.name,
           template.description,
           template.category,
           JSON.stringify({ className: template.className }),
           `/nfc-templates/${template.className.replace('template-', '')}.svg`
         ]
       );
     }
    
    console.log(`✅ Inserted ${templates.length} new templates`);

    res.json({
      success: true,
      message: `Successfully reset ${templates.length} NFC templates`,
      templates: templates.map(t => ({
        name: t.name,
        category: t.category,
        description: t.description
      }))
    });

  } catch (error) {
    console.error('❌ Template reset failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset templates',
      error: error.message
    });
  }
});

// 強制觸發模板重置端點（用於生產環境）
router.post('/force-reset', async (req, res) => {
  try {
    const { ensureLatestTemplatesExist } = require('../config/database');
    await ensureLatestTemplatesExist();
    
    // 檢查重置結果
    const result = await pool.query('SELECT COUNT(*) as count FROM nfc_card_templates WHERE is_active = true');
    const templateCount = parseInt(result.rows[0].count);
    
    res.json({
      success: true,
      message: `Template reset completed. Active templates: ${templateCount}`,
      templateCount
    });
  } catch (error) {
    console.error('❌ Force reset failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force reset templates',
      error: error.message
    });
  }
});

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