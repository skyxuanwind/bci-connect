const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/events';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片文件'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// 獲取所有活動 (會員可見)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        COUNT(er.id) as registered_count
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE e.status != 'cancelled'
      GROUP BY e.id
      ORDER BY e.event_date ASC
    `);
    
    res.json({
      success: true,
      events: result.rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: '獲取活動列表失敗'
    });
  }
});

// 獲取單個活動詳情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 獲取活動基本信息
    const eventResult = await pool.query(`
      SELECT 
        e.*,
        COUNT(er.id) as registered_count
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活動不存在'
      });
    }
    
    const event = eventResult.rows[0];
    
    // 檢查用戶是否已報名
    const registrationResult = await pool.query(`
      SELECT id FROM event_registrations 
      WHERE user_id = $1 AND event_id = $2
    `, [req.user.id, id]);
    
    event.is_registered = registrationResult.rows.length > 0;
    
    // 如果用戶是 L1 或 L2，獲取報名人員列表
    if (req.user.membership_level <= 2) {
      const attendeesResult = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.company,
          u.title,
          er.registration_date
        FROM event_registrations er
        JOIN users u ON er.user_id = u.id
        WHERE er.event_id = $1
        ORDER BY er.registration_date ASC
      `, [id]);
      
      event.attendees = attendeesResult.rows;
    }
    
    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({
      success: false,
      message: '獲取活動詳情失敗'
    });
  }
});

// 報名活動
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { invited_by_id } = req.body;
    
    // 檢查活動是否存在且可報名
    const eventResult = await pool.query(`
      SELECT * FROM events 
      WHERE id = $1 AND status = 'upcoming' AND event_date > NOW()
    `, [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '活動不存在或已結束'
      });
    }
    
    const event = eventResult.rows[0];
    
    // 檢查是否已報名
    const existingRegistration = await pool.query(`
      SELECT id FROM event_registrations 
      WHERE user_id = $1 AND event_id = $2
    `, [req.user.id, id]);
    
    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已經報名此活動'
      });
    }
    
    // 檢查人數限制
    if (event.max_attendees > 0) {
      const registeredCount = await pool.query(`
        SELECT COUNT(*) as count FROM event_registrations 
        WHERE event_id = $1
      `, [id]);
      
      if (parseInt(registeredCount.rows[0].count) >= event.max_attendees) {
        return res.status(400).json({
          success: false,
          message: '活動已額滿'
        });
      }
    }
    
    // 創建報名記錄
    const registrationResult = await pool.query(`
      INSERT INTO event_registrations (user_id, event_id, invited_by_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.user.id, id, invited_by_id || null]);
    
    res.json({
      success: true,
      message: '報名成功',
      registration: registrationResult.rows[0]
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({
      success: false,
      message: '報名失敗'
    });
  }
});

// 取消報名
router.delete('/:id/register', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM event_registrations 
      WHERE user_id = $1 AND event_id = $2
      RETURNING *
    `, [req.user.id, id]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '您尚未報名此活動'
      });
    }
    
    res.json({
      success: true,
      message: '取消報名成功'
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({
      success: false,
      message: '取消報名失敗'
    });
  }
});

// 生成邀請連結
router.get('/:id/invite-link', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查用戶是否已報名此活動
    const registrationResult = await pool.query(`
      SELECT id FROM event_registrations 
      WHERE user_id = $1 AND event_id = $2
    `, [req.user.id, id]);
    
    if (registrationResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '您需要先報名此活動才能生成邀請連結'
      });
    }
    
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5002'}/register?event_id=${id}&inviter_id=${req.user.id}`;
    
    res.json({
      success: true,
      invite_link: inviteLink
    });
  } catch (error) {
    console.error('Error generating invite link:', error);
    res.status(500).json({
      success: false,
      message: '生成邀請連結失敗'
    });
  }
});

// === 管理員功能 ===

// Test endpoint
router.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Events route is working' });
});

// 創建活動 (僅管理員)
router.post('/', authenticateToken, requireAdmin, upload.single('poster'), async (req, res) => {
  try {
    console.log('Creating event with data:', req.body);
    const { title, description, event_date, location, max_attendees, tag } = req.body;
    
    if (!title || !event_date) {
      console.log('Missing required fields:', { title, event_date });
      return res.status(400).json({
        success: false,
        message: '活動標題和日期為必填項目'
      });
    }
    
    // Get poster image URL if uploaded
    const posterImageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;
    
    console.log('Inserting event into database...');
    const result = await pool.query(`
      INSERT INTO events (title, description, event_date, location, max_attendees, poster_image_url, tag)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, description, event_date, location, max_attendees || 0, posterImageUrl, tag]);
    
    console.log('Event created successfully:', result.rows[0]);
    res.json({
      success: true,
      message: '活動創建成功',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating event:', error);
    // Clean up uploaded file if database operation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: '創建活動失敗'
    });
  }
});

// 更新活動 (僅管理員)
router.put('/:id', authenticateToken, requireAdmin, upload.single('poster'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, location, max_attendees, status, tag } = req.body;
    
    // Get current event to check for existing poster
    const currentEvent = await pool.query('SELECT poster_image_url FROM events WHERE id = $1', [id]);
    if (currentEvent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活動不存在'
      });
    }
    
    let posterImageUrl = currentEvent.rows[0].poster_image_url;
    
    // If new poster is uploaded, update the URL and delete old file
    if (req.file) {
      // Delete old poster file if exists
      if (posterImageUrl) {
        const oldFilePath = path.join(__dirname, '..', posterImageUrl);
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error('Error deleting old poster file:', err);
        });
      }
      posterImageUrl = `/uploads/events/${req.file.filename}`;
    }
    
    const result = await pool.query(`
      UPDATE events 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_date = COALESCE($3, event_date),
          location = COALESCE($4, location),
          max_attendees = COALESCE($5, max_attendees),
          status = COALESCE($6, status),
          poster_image_url = COALESCE($7, poster_image_url),
          tag = COALESCE($8, tag),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [title, description, event_date, location, max_attendees, status, posterImageUrl, tag, id]);
    
    res.json({
      success: true,
      message: '活動更新成功',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    // Clean up uploaded file if database operation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: '更新活動失敗'
    });
  }
});

// 刪除活動 (僅管理員)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event to check for poster image
    const eventResult = await pool.query('SELECT poster_image_url FROM events WHERE id = $1', [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活動不存在'
      });
    }
    
    const posterImageUrl = eventResult.rows[0].poster_image_url;
    
    // 先刪除相關的報名記錄
    await pool.query('DELETE FROM event_registrations WHERE event_id = $1', [id]);
    
    // 再刪除活動
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    
    // Delete poster image file if exists
    if (posterImageUrl) {
      const filePath = path.join(__dirname, '..', posterImageUrl);
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting poster file:', err);
      });
    }
    
    res.json({
      success: true,
      message: '活動刪除成功'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: '刪除活動失敗'
    });
  }
});

// 獲取活動報名列表 (僅管理員)
router.get('/:id/registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        er.*,
        u.name,
        u.email,
        u.company,
        u.title,
        u.contact_number,
        inviter.name as inviter_name
      FROM event_registrations er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN users inviter ON er.invited_by_id = inviter.id
      WHERE er.event_id = $1
      ORDER BY er.registration_date ASC
    `, [id]);
    
    res.json({
      success: true,
      registrations: result.rows
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({
      success: false,
      message: '獲取報名列表失敗'
    });
  }
});

module.exports = router;