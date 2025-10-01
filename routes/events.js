const express = require('express');
const router = express.Router();
const multer = require('multer');
// 移除不再需要的 path 匯入
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

// Helper: upload buffer to Cloudinary and return result
const uploadBufferToCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'bci-connect/events',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Configure file filter for multer
const fileFilter = (req, file, cb) => {
  // Check if the file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: multer.memoryStorage(),
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
    
    // 更穩健的前端網址推導邏輯
    let frontendBase;
    
    // 1. 優先使用環境變數 FRONTEND_URL
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) {
      frontendBase = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
    }
    // 2. 如果沒有設置 FRONTEND_URL，使用當前請求的主機
    else {
      const currentHost = req.get('host');
      const protocol = req.protocol;
      
      // 處理常見的域名變體
      if (currentHost && currentHost.includes('onrender.com')) {
        // Render 部署的情況
        frontendBase = `${protocol}://${currentHost}`;
      } else if (currentHost && (currentHost.includes('gbc-connect.com') || currentHost.includes('www.gbc-connect.com'))) {
        // 自定義域名的情況，確保使用正確的域名
        frontendBase = currentHost.startsWith('www.') 
          ? `${protocol}://${currentHost}` 
          : `${protocol}://www.${currentHost}`;
      } else {
        // 其他情況，直接使用當前主機
        frontendBase = `${protocol}://${currentHost}`;
      }
    }
    
    const inviteLink = `${frontendBase}/guest-registration?event_id=${id}&inviter_id=${req.user.id}`;
    
    // 記錄邀請連結生成日誌，便於調試
    console.log('Generated invite link:', {
      eventId: id,
      inviterId: req.user.id,
      frontendBase,
      inviteLink,
      requestHost: req.get('host'),
      protocol: req.protocol,
      frontendUrlEnv: process.env.FRONTEND_URL
    });
    
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

// 獲取活動公開資訊 (不需要認證)
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT id, title, description, event_date, location, max_attendees, poster_image_url, tag
      FROM events 
      WHERE id = $1 AND status = 'upcoming'
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活動不存在或已結束'
      });
    }
    
    res.json({
      success: true,
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching public event info:', error);
    res.status(500).json({
      success: false,
      message: '獲取活動資訊失敗'
    });
  }
});

// 來賓報名
router.post('/guest-registration', async (req, res) => {
  try {
    const { name, phone, email, company, industry, desired_connections, event_id, inviter_id } = req.body;
    
    // 驗證必填欄位
    if (!name || !phone || !email || !company || !industry || !event_id || !inviter_id) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 檢查活動是否存在且可報名
    const eventResult = await pool.query(`
      SELECT * FROM events 
      WHERE id = $1 AND status = 'upcoming' AND event_date > NOW()
    `, [event_id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '活動不存在或已結束'
      });
    }
    
    // 檢查邀請人是否存在且已報名此活動
    const inviterResult = await pool.query(`
      SELECT u.id, u.name FROM users u
      JOIN event_registrations er ON u.id = er.user_id
      WHERE u.id = $1 AND er.event_id = $2
    `, [inviter_id, event_id]);
    
    if (inviterResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '邀請人資訊無效'
      });
    }
    
    // 檢查是否已經報名過（根據email）
    const existingResult = await pool.query(`
      SELECT id FROM guest_registrations 
      WHERE email = $1 AND event_id = $2
    `, [email, event_id]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '此信箱已經報名過此活動'
      });
    }
    
    // 創建來賓報名記錄
    const result = await pool.query(`
      INSERT INTO guest_registrations (
        name, phone, email, company, industry, desired_connections, 
        event_id, inviter_id, registration_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [name, phone, email, company, industry, desired_connections, event_id, inviter_id]);
    
    res.json({
      success: true,
      message: '報名成功',
      registration: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating guest registration:', error);
    res.status(500).json({
      success: false,
      message: '報名失敗，請稍後再試'
    });
  }
});

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
    
    // 直接上傳至 Cloudinary（記憶體 Buffer）
    let posterImageUrl = null;
    if (req.file && req.file.buffer) {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer);
      posterImageUrl = uploadRes.secure_url;
    }
    
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
    
    // 如有新圖片，直接上傳 Cloudinary 取得 URL
    if (req.file && req.file.buffer) {
      const uploadRes = await uploadBufferToCloudinary(req.file.buffer);
      posterImageUrl = uploadRes.secure_url;
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
    res.status(500).json({
      success: false,
      message: '更新活動失敗'
    });
  }
});

// 刪除活動 (僅管理員)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    client = await pool.connect();

    await client.query('BEGIN');

    // 先檢查活動是否存在，並鎖定該列以避免併發刪除問題
    const eventResult = await client.query('SELECT poster_image_url FROM events WHERE id = $1 FOR UPDATE', [id]);

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '活動不存在'
      });
    }

    const posterImageUrl = eventResult.rows[0].poster_image_url;

    // 先刪除相關的報名記錄（會員報名）
    await client.query('DELETE FROM event_registrations WHERE event_id = $1', [id]);

    // 刪除來賓報名記錄（guest_registrations）
    await client.query('DELETE FROM guest_registrations WHERE event_id = $1', [id]);

    // 刪除出席紀錄（attendance_records）
    await client.query('DELETE FROM attendance_records WHERE event_id = $1', [id]);

    // 最後刪除活動本身
    await client.query('DELETE FROM events WHERE id = $1', [id]);

    await client.query('COMMIT');

    // 已改用 Cloudinary，不在此刪除雲端圖片（僅保留 URL），如需可後續補充
    return res.json({
      success: true,
      message: '活動刪除成功'
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (e) { /* ignore rollback error */ }
    }
    console.error('Error deleting event:', error);
    return res.status(500).json({
      success: false,
      message: '刪除活動失敗'
    });
  } finally {
    if (client) client.release();
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

// 獲取活動來賓報名列表 (僅管理員)
router.get('/:id/guest-registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        gr.*,
        inviter.name as inviter_name,
        inviter.company as inviter_company
      FROM guest_registrations gr
      JOIN users inviter ON gr.inviter_id = inviter.id
      WHERE gr.event_id = $1
      ORDER BY gr.registration_date ASC
    `, [id]);
    
    res.json({
      success: true,
      guestRegistrations: result.rows
    });
  } catch (error) {
    console.error('Error fetching guest registrations:', error);
    res.status(500).json({
      success: false,
      message: '獲取來賓報名列表失敗'
    });
  }
});

// === ICS Calendar endpoints ===
// Helper: escape text for ICS
function escapeICSText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// Helper: format date to ICS UTC format YYYYMMDDTHHmmSSZ
function toICSDateTimeUTC(date) {
  const d = new Date(date);
  const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// Build single event ICS VEVENT block
function buildVEvent(evt, frontendBaseUrl) {
  const startISO = toICSDateTimeUTC(evt.event_date);
  const endDate = new Date(evt.event_date);
  endDate.setHours(endDate.getHours() + 2); // default 2-hour duration
  const endISO = toICSDateTimeUTC(endDate);
  const uid = `event-${evt.id}@gbc-connect`;
  const summary = escapeICSText(evt.title);
  const description = escapeICSText(evt.description || '');
  const location = escapeICSText(evt.location || '');
  const dtstamp = toICSDateTimeUTC(new Date());
  const url = `${frontendBaseUrl || ''}/events/${evt.id}`;
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${startISO}`,
    `DTEND:${endISO}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    location ? `LOCATION:${location}` : null,
    frontendBaseUrl ? `URL:${url}` : null,
    'END:VEVENT'
  ].filter(Boolean).join('\n');
}

// 全部活動 ICS feed
router.get('/calendar.ics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, event_date, location
      FROM events
      WHERE status = 'upcoming'
      ORDER BY event_date ASC
    `);

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
    const vevents = result.rows.map(evt => buildVEvent(evt, frontendBaseUrl)).join('\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GBC Connect//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:GBC Events',
      'X-WR-TIMEZONE:Asia/Taipei',
      vevents,
      'END:VCALENDAR'
    ].join('\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="gbc-events.ics"');
    return res.status(200).send(ics);
  } catch (error) {
    console.error('Error generating ICS feed:', error);
    return res.status(500).json({ success: false, message: '生成行事曆失敗' });
  }
});

// 單一活動 .ics 下載
router.get('/:id.ics', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, title, description, event_date, location, status
      FROM events WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '活動不存在' });
    }

    const evt = result.rows[0];
    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
    const vevent = buildVEvent(evt, frontendBaseUrl);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GBC Connect//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:GBC Event',
      'X-WR-TIMEZONE:Asia/Taipei',
      vevent,
      'END:VCALENDAR'
    ].join('\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${evt.id}.ics"`);
    return res.status(200).send(ics);
  } catch (error) {
    console.error('Error generating single event ICS:', error);
    return res.status(500).json({ success: false, message: '生成活動行事曆失敗' });
  }
});

module.exports = router;