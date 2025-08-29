const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../config/cloudinary');

// Configure multer for image uploads
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件 (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// @route   GET /api/member-cards/public/:userId
// @desc    Get public member card by user ID (no authentication required)
// @access  Public
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get member card with user info
    const cardResult = await pool.query(`
      SELECT 
        mc.id as card_id,
        mc.template_id,
        mc.view_count,
        u.id as user_id,
        u.name,
        u.company,
        u.industry,
        u.title,
        u.contact_number,
        u.email,
        u.profile_picture_url,
        c.name as chapter_name,
        ct.name as template_name,
        ct.css_styles
      FROM member_cards mc
      JOIN users u ON mc.user_id = u.id
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN card_templates ct ON mc.template_id = ct.id
      WHERE u.id = $1 AND mc.is_active = true AND u.status = 'active'
    `, [userId]);

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ message: '電子名片不存在或未啟用' });
    }

    const card = cardResult.rows[0];

    // Get content blocks
    const blocksResult = await pool.query(`
      SELECT id, block_type, title, content, url, image_url, social_platform, display_order
      FROM card_content_blocks
      WHERE card_id = $1 AND is_visible = true
      ORDER BY display_order ASC, created_at ASC
    `, [card.card_id]);

    // 將相對路徑圖片補上完整網域（相容舊資料）
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const sanitizedBlocks = blocksResult.rows.map(b => ({
      ...b,
      image_url: (b.image_url && b.image_url.startsWith('/uploads/')) ? `${baseUrl}${b.image_url}` : b.image_url
    }));

    // Record visit (async, don't wait)
    const visitorIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const referrer = req.get('Referer');
    
    pool.query(`
      INSERT INTO card_visits (card_id, visitor_ip, visitor_user_agent, referrer)
      VALUES ($1, $2, $3, $4)
    `, [card.card_id, visitorIp, userAgent, referrer]).catch(err => {
      console.error('記錄訪問失敗:', err);
    });

    // Update view count (async, don't wait)
    pool.query(`
      UPDATE member_cards SET view_count = view_count + 1 WHERE id = $1
    `, [card.card_id]).catch(err => {
      console.error('更新瀏覽次數失敗:', err);
    });

    res.json({
      success: true,
      card: {
        id: card.card_id,
        userId: card.user_id,
        templateId: card.template_id,
        templateName: card.template_name,
        cssStyles: card.css_styles,
        viewCount: card.view_count + 1,
        member: {
          name: card.name,
          company: card.company,
          industry: card.industry,
          title: card.title,
          contactNumber: card.contact_number,
          email: card.email,
          profilePictureUrl: card.profile_picture_url,
          chapterName: card.chapter_name
        },
        contentBlocks: sanitizedBlocks
      }
    });

  } catch (error) {
    console.error('獲取公開電子名片錯誤:', error);
    res.status(500).json({ message: '獲取電子名片時發生錯誤' });
  }
});

// @route   GET /api/member-cards/my-card
// @desc    Get current user's member card for editing
// @access  Private
router.get('/my-card', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create member card
    let cardResult = await pool.query(`
      SELECT id, template_id, view_count
      FROM member_cards
      WHERE user_id = $1
    `, [userId]);

    let cardId;
    if (cardResult.rows.length === 0) {
      // Create new card
      const newCardResult = await pool.query(`
        INSERT INTO member_cards (user_id, template_id)
        VALUES ($1, 'professional')
        RETURNING id, template_id, view_count
      `, [userId]);
      cardId = newCardResult.rows[0].id;
      cardResult = newCardResult;
    } else {
      cardId = cardResult.rows[0].id;
    }

    const card = cardResult.rows[0];

    // Get content blocks
    const blocksResult = await pool.query(`
      SELECT id, block_type, title, content, url, image_url, social_platform, display_order, is_visible
      FROM card_content_blocks
      WHERE card_id = $1
      ORDER BY display_order ASC, created_at ASC
    `, [cardId]);

    // Get available templates
    const templatesResult = await pool.query(`
      SELECT id, name, description, css_styles
      FROM card_templates
      WHERE is_active = true
      ORDER BY id
    `);

    res.json({
      success: true,
      card: {
        id: cardId,
        templateId: card.template_id,
        viewCount: card.view_count,
        contentBlocks: blocksResult.rows
      },
      templates: templatesResult.rows
    });

  } catch (error) {
    console.error('獲取我的電子名片錯誤:', error);
    res.status(500).json({ message: '獲取電子名片時發生錯誤' });
  }
});

// @route   PUT /api/member-cards/template
// @desc    Update card template
// @access  Private
router.put('/template', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.body;
    const userId = req.user.id;

    // Validate template exists
    const templateCheck = await pool.query(`
      SELECT id FROM card_templates WHERE id = $1 AND is_active = true
    `, [templateId]);

    if (templateCheck.rows.length === 0) {
      return res.status(400).json({ message: '無效的模板ID' });
    }

    // Update or create card
    await pool.query(`
      INSERT INTO member_cards (user_id, template_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET template_id = $2, updated_at = CURRENT_TIMESTAMP
    `, [userId, templateId]);

    res.json({ success: true, message: '模板更新成功' });

  } catch (error) {
    console.error('更新模板錯誤:', error);
    res.status(500).json({ message: '更新模板時發生錯誤' });
  }
});

// @route   POST /api/member-cards/content-block
// @desc    Add content block
// @access  Private
router.post('/content-block', authenticateToken, async (req, res) => {
  try {
    const { blockType, title, content, url, socialPlatform } = req.body;
    // Accept image url (both camelCase and snake_case) and visibility flag
    const imageUrl = req.body.imageUrl || req.body.image_url || null;
    const isVisible = typeof req.body.isVisible === 'boolean' ? req.body.isVisible : true;
    const userId = req.user.id;

    // Get or create card
    let cardResult = await pool.query(`
      SELECT id FROM member_cards WHERE user_id = $1
    `, [userId]);

    let cardId;
    if (cardResult.rows.length === 0) {
      const newCardResult = await pool.query(`
        INSERT INTO member_cards (user_id) VALUES ($1) RETURNING id
      `, [userId]);
      cardId = newCardResult.rows[0].id;
    } else {
      cardId = cardResult.rows[0].id;
    }

    // Get next display order
    const orderResult = await pool.query(`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
      FROM card_content_blocks WHERE card_id = $1
    `, [cardId]);

    const displayOrder = orderResult.rows[0].next_order;

    // Insert content block (persist image_url and is_visible)
    const blockResult = await pool.query(`
      INSERT INTO card_content_blocks 
      (card_id, block_type, title, content, url, image_url, social_platform, display_order, is_visible)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [cardId, blockType, title, content, url, imageUrl, socialPlatform, displayOrder, isVisible]);

    res.json({
      success: true,
      message: '內容區塊新增成功',
      block: blockResult.rows[0]
    });

  } catch (error) {
    console.error('新增內容區塊錯誤:', error);
    res.status(500).json({ message: '新增內容區塊時發生錯誤' });
  }
});

// @route   PUT /api/member-cards/content-block/:blockId
// @desc    Update content block
// @access  Private
router.put('/content-block/:blockId', authenticateToken, async (req, res) => {
  try {
    const { blockId } = req.params;
    const { title, content, url, socialPlatform, isVisible } = req.body;
    // Accept image url from either camelCase or snake_case
    const imageUrl = req.body.imageUrl || req.body.image_url || null;
    const userId = req.user.id;

    // Verify ownership
    const ownershipCheck = await pool.query(`
      SELECT ccb.id
      FROM card_content_blocks ccb
      JOIN member_cards mc ON ccb.card_id = mc.id
      WHERE ccb.id = $1 AND mc.user_id = $2
    `, [blockId, userId]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: '無權限編輯此內容區塊' });
    }

    // Update block (persist image_url)
    const updateResult = await pool.query(`
      UPDATE card_content_blocks
      SET title = $1, content = $2, url = $3, social_platform = $4, 
          image_url = $5, is_visible = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, content, url, socialPlatform, imageUrl, isVisible, blockId]);

    res.json({
      success: true,
      message: '內容區塊更新成功',
      block: updateResult.rows[0]
    });

  } catch (error) {
    console.error('更新內容區塊錯誤:', error);
    res.status(500).json({ message: '更新內容區塊時發生錯誤' });
  }
});

// @route   DELETE /api/member-cards/content-block/:blockId
// @desc    Delete content block
// @access  Private
router.delete('/content-block/:blockId', authenticateToken, async (req, res) => {
  try {
    const { blockId } = req.params;
    const userId = req.user.id;

    // Verify ownership and get image_url for cleanup
    const ownershipCheck = await pool.query(`
      SELECT ccb.id, ccb.image_url
      FROM card_content_blocks ccb
      JOIN member_cards mc ON ccb.card_id = mc.id
      WHERE ccb.id = $1 AND mc.user_id = $2
    `, [blockId, userId]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ message: '無權限刪除此內容區塊' });
    }

    const block = ownershipCheck.rows[0];

    // Delete block
    await pool.query('DELETE FROM card_content_blocks WHERE id = $1', [blockId]);

    // Clean up image file if exists
    if (block.image_url && block.image_url.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '..', block.image_url);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('刪除圖片文件失敗:', err);
      });
    }

    res.json({ success: true, message: '內容區塊刪除成功' });

  } catch (error) {
    console.error('刪除內容區塊錯誤:', error);
    res.status(500).json({ message: '刪除內容區塊時發生錯誤' });
  }
});

// @route   PUT /api/member-cards/reorder-blocks
// @desc    Reorder content blocks
// @access  Private
router.put('/reorder-blocks', authenticateToken, async (req, res) => {
  try {
    const { blockIds } = req.body; // Array of block IDs in new order
    const userId = req.user.id;

    if (!Array.isArray(blockIds)) {
      return res.status(400).json({ message: '無效的區塊順序資料' });
    }

    // Verify all blocks belong to user
    const ownershipCheck = await pool.query(`
      SELECT ccb.id
      FROM card_content_blocks ccb
      JOIN member_cards mc ON ccb.card_id = mc.id
      WHERE ccb.id = ANY($1) AND mc.user_id = $2
    `, [blockIds, userId]);

    if (ownershipCheck.rows.length !== blockIds.length) {
      return res.status(403).json({ message: '無權限重新排序這些內容區塊' });
    }

    // Update display orders
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < blockIds.length; i++) {
        await client.query(`
          UPDATE card_content_blocks 
          SET display_order = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [i + 1, blockIds[i]]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ success: true, message: '區塊順序更新成功' });

  } catch (error) {
    console.error('重新排序區塊錯誤:', error);
    res.status(500).json({ message: '重新排序區塊時發生錯誤' });
  }
});

// @route   POST /api/member-cards/upload-image
// @desc    Upload image for content block
// @access  Private
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '請選擇要上傳的圖片' });
    }

    // 上傳至 Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'bci-connect/cards',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const imageUrl = result.secure_url;
    
    res.json({
      success: true,
      message: '圖片上傳成功',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('圖片上傳錯誤:', error);
    res.status(500).json({ message: '圖片上傳時發生錯誤' });
  }
});

// @route   GET /api/member-cards/vcard/:userId
// @desc    Generate and download vCard for member
// @access  Public
router.get('/vcard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get member info
    const memberResult = await pool.query(`
      SELECT 
        u.name,
        u.company,
        u.title,
        u.contact_number,
        u.email,
        c.name as chapter_name
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      WHERE u.id = $1 AND u.status = 'active'
    `, [userId]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在' });
    }

    const member = memberResult.rows[0];
    
    // Generate vCard content
    const vCardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${member.name}`,
      `ORG:${member.company || ''}`,
      `TITLE:${member.title || ''}`,
      `TEL:${member.contact_number || ''}`,
      `EMAIL:${member.email}`,
      `NOTE:GBC商務菁英會 - ${member.chapter_name || ''}`,
      `URL:${process.env.CLIENT_URL || 'http://localhost:3000'}/member/${userId}`,
      'END:VCARD'
    ].join('\r\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${member.name}.vcf"`);
    
    res.send(vCardContent);

  } catch (error) {
    console.error('生成vCard錯誤:', error);
    res.status(500).json({ message: '生成聯絡人文件時發生錯誤' });
  }
});

// @route   GET /api/member-cards/stats
// @desc    Get card statistics for current user
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get card stats
    const statsResult = await pool.query(`
      SELECT 
        mc.view_count,
        COUNT(cv.id) as total_visits,
        COUNT(DISTINCT cv.visitor_ip) as unique_visitors,
        COUNT(CASE WHEN cv.visited_at >= NOW() - INTERVAL '7 days' THEN 1 END) as visits_last_7_days,
        COUNT(CASE WHEN cv.visited_at >= NOW() - INTERVAL '30 days' THEN 1 END) as visits_last_30_days
      FROM member_cards mc
      LEFT JOIN card_visits cv ON mc.id = cv.card_id
      WHERE mc.user_id = $1
      GROUP BY mc.id, mc.view_count
    `, [userId]);

    const stats = statsResult.rows[0] || {
      view_count: 0,
      total_visits: 0,
      unique_visitors: 0,
      visits_last_7_days: 0,
      visits_last_30_days: 0
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('獲取統計資料錯誤:', error);
    res.status(500).json({ message: '獲取統計資料時發生錯誤' });
  }
});

module.exports = router;