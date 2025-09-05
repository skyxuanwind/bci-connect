const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 檢查用戶是否有報到權限 (活動工作人員或管理員)
const checkAttendancePermission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 檢查是否為管理員或核心
    const userResult = await pool.query(
      'SELECT membership_level, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    const user = userResult.rows[0];
    
    // 管理員或核心可以進行報到操作
    if (user.membership_level === 1 || user.status === 'admin') {
      next();
    } else {
      return res.status(403).json({ success: false, message: '權限不足，僅限活動工作人員使用' });
    }
  } catch (error) {
    console.error('Error checking attendance permission:', error);
    res.status(500).json({ success: false, message: '權限檢查失敗' });
  }
};

// 解析 QR/NFC URL 取得 memberId
function parseMemberIdFromTextOrUrl(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  // 嘗試 JSON
  try {
    const obj = JSON.parse(text);
    const cand = obj.userId || obj.id || obj.memberId;
    if (cand && /^\d+$/.test(String(cand))) return String(cand);
  } catch (e) {}

  // 嘗試從 URL 擷取
  try {
    // 若沒有協議，嘗試補上
    if (!/^https?:\/\//i.test(text)) {
      if (text.startsWith('www.')) text = 'https://' + text;
    }
    const u = new URL(text);
    // 常見路徑: /member/:id 或 /nfc-cards/member/:id
    const parts = u.pathname.split('/').filter(Boolean);
    const idxMember = parts.findIndex(p => p === 'member');
    if (idxMember >= 0 && parts[idxMember + 1] && /^\d+$/.test(parts[idxMember + 1])) {
      return parts[idxMember + 1];
    }
    // 查 query 參數
    const qid = u.searchParams.get('memberId') || u.searchParams.get('id') || u.searchParams.get('uid');
    if (qid && /^\d+$/.test(qid)) return qid;
  } catch (e) {}

  // 直接從字串中找數字 ID
  const m = text.match(/(?:member\s*[:=\/]\s*|id\s*[:=\/]\s*)(\d{1,10})/i) || text.match(/\b(\d{1,10})\b/);
  if (m && m[1]) return m[1];
  return null;
}

// 嘗試決定要使用的活動（若未提供 eventId）
async function resolveEventIdOrRecord(client, providedEventId) {
  if (providedEventId) {
    const er = await client.query('SELECT id, title FROM events WHERE id = $1', [providedEventId]);
    if (er.rows.length === 0) throw new Error('活動不存在');
    return er.rows[0];
  }
  // 預設：找最近 7 天內含今日的活動，優先今天，其次最近未來/過去
  const cand = await client.query(`
    SELECT id, title, event_date
    FROM events
    WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY CASE WHEN event_date = CURRENT_DATE THEN 0 ELSE 1 END, event_date ASC
    LIMIT 1
  `);
  if (cand.rows.length === 0) throw new Error('未提供活動且近期無活動，請先選擇活動');
  return cand.rows[0];
}

// 新增：QR Code 報到（支援 JSON 或 URL 內容）
router.post('/qr-checkin', authenticateToken, checkAttendancePermission, async (req, res) => {
  const client = await pool.connect();
  try {
    const { qrData, eventId } = req.body || {};
    if (!qrData) {
      return res.status(400).json({ success: false, message: '缺少 QR Code 內容' });
    }

    const memberIdStr = parseMemberIdFromTextOrUrl(qrData);
    if (!memberIdStr) {
      return res.status(400).json({ success: false, message: '無法從 QR Code 內容解析會員資訊' });
    }

    await client.query('BEGIN');

    // 會員存在檢查
    const userResult = await client.query('SELECT id, name FROM users WHERE id = $1', [memberIdStr]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }

    // 活動解析
    const event = await resolveEventIdOrRecord(client, eventId);

    // 重複報到檢查
    const existing = await client.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
      [memberIdStr, event.id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `${userResult.rows[0].name} 已經完成報到` });
    }

    // 新增報到
    await client.query(
      'INSERT INTO attendance_records (user_id, event_id) VALUES ($1, $2)',
      [memberIdStr, event.id]
    );

    // 新增收入
    await client.query(
      'INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        new Date().toISOString().split('T')[0],
        `${userResult.rows[0].name} - ${event.title} 活動報到 (QR)`,
        'income',
        300,
        'QR Code 自動報到收入',
        req.user.id
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${userResult.rows[0].name} 報到成功，已自動新增300元收入`,
      user: userResult.rows[0],
      event: { id: event.id, title: event.title }
    });
  } catch (error) {
    try { await pool.query('ROLLBACK'); } catch (e) {}
    console.error('Error during QR check-in:', error);
    res.status(500).json({ success: false, message: 'QR 報到失敗' });
  } finally {
    try { client.release(); } catch (e) {}
  }
});

// 新增：NFC 名片 URL 報到（NDEF 內容為會員電子名片網址）
router.post('/nfc-url-checkin', authenticateToken, checkAttendancePermission, async (req, res) => {
  const client = await pool.connect();
  try {
    const { url, eventId } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, message: '缺少 NFC 名片網址' });
    }

    const memberIdStr = parseMemberIdFromTextOrUrl(url);
    if (!memberIdStr) {
      return res.status(400).json({ success: false, message: '無法從 NFC 名片網址解析會員資訊' });
    }

    await client.query('BEGIN');

    // 會員存在檢查
    const userResult = await client.query('SELECT id, name FROM users WHERE id = $1', [memberIdStr]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }

    // 活動解析
    const event = await resolveEventIdOrRecord(client, eventId);

    // 重複報到檢查
    const existing = await client.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
      [memberIdStr, event.id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `${userResult.rows[0].name} 已經完成報到` });
    }

    // 新增報到
    await client.query(
      'INSERT INTO attendance_records (user_id, event_id) VALUES ($1, $2)',
      [memberIdStr, event.id]
    );

    // 新增收入
    await client.query(
      'INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        new Date().toISOString().split('T')[0],
        `${userResult.rows[0].name} - ${event.title} 活動報到 (NFC URL)`,
        'income',
        300,
        'NFC 名片 URL 自動報到收入',
        req.user.id
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${userResult.rows[0].name} 報到成功，已自動新增300元收入`,
      user: userResult.rows[0],
      event: { id: event.id, title: event.title },
      method: 'NFC URL'
    });
  } catch (error) {
    try { await pool.query('ROLLBACK'); } catch (e) {}
    console.error('Error during NFC URL check-in:', error);
    res.status(500).json({ success: false, message: 'NFC URL 報到失敗' });
  } finally {
    try { client.release(); } catch (e) {}
  }
});

// QR Code 報到
router.post('/checkin', authenticateToken, checkAttendancePermission, async (req, res) => {
  try {
    const { userId, eventId } = req.body;
    
    if (!userId || !eventId) {
      return res.status(400).json({ success: false, message: '缺少必要參數' });
    }
    
    // 檢查用戶是否存在
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    // 檢查活動是否存在
    const eventResult = await pool.query(
      'SELECT id, title FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '活動不存在' });
    }
    
    // 檢查是否已經報到過
    const existingRecord = await pool.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    
    if (existingRecord.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `${userResult.rows[0].name} 已經完成報到` 
      });
    }
    
    // 新增出席記錄
    await pool.query(
      'INSERT INTO attendance_records (user_id, event_id) VALUES ($1, $2)',
      [userId, eventId]
    );
    
    // 自動新增300元收入記錄
    await pool.query(
      'INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        new Date().toISOString().split('T')[0], // 今天日期
        `${userResult.rows[0].name} - ${eventResult.rows[0].title} 活動報到`,
        'income',
        300,
        '會員活動報到自動收入',
        req.user.id
      ]
    );
    
    res.json({ 
      success: true, 
      message: `${userResult.rows[0].name} 報到成功，已自動新增300元收入`,
      user: userResult.rows[0],
      event: eventResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ success: false, message: '報到失敗' });
  }
});

// 獲取活動出席名單
router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    // 檢查權限 (管理員或核心)
    const userResult = await pool.query(
      'SELECT membership_level, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    const user = userResult.rows[0];
    if (user.membership_level !== 1 && user.status !== 'admin') {
      return res.status(403).json({ success: false, message: '權限不足' });
    }
    
    // 獲取活動資訊
    const eventResult = await pool.query(
      'SELECT id, title, event_date FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '活動不存在' });
    }
    
    // 獲取已報到的會員名單
    const attendanceResult = await pool.query(`
      SELECT 
        ar.id,
        ar.check_in_time,
        u.id as user_id,
        u.name,
        u.company,
        u.industry,
        u.contact_number
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.event_id = $1
      ORDER BY ar.check_in_time DESC
    `, [eventId]);
    
    // 獲取已報名但未報到的會員名單
    const registeredResult = await pool.query(`
      SELECT 
        er.id as registration_id,
        u.id as user_id,
        u.name,
        u.company,
        u.industry,
        u.contact_number
      FROM event_registrations er
      JOIN users u ON er.user_id = u.id
      LEFT JOIN attendance_records ar ON er.user_id = ar.user_id AND er.event_id = ar.event_id
      WHERE er.event_id = $1 AND ar.id IS NULL
      ORDER BY u.name
    `, [eventId]);
    
    res.json({
      success: true,
      event: eventResult.rows[0],
      attendedMembers: attendanceResult.rows,
      absentMembers: registeredResult.rows,
      statistics: {
        totalRegistered: attendanceResult.rows.length + registeredResult.rows.length,
        totalAttended: attendanceResult.rows.length,
        totalAbsent: registeredResult.rows.length,
        attendanceRate: registeredResult.rows.length + attendanceResult.rows.length > 0 
          ? Math.round((attendanceResult.rows.length / (attendanceResult.rows.length + registeredResult.rows.length)) * 100)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ success: false, message: '獲取出席名單失敗' });
  }
});

// 獲取所有活動的出席統計
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 檢查權限 (管理員或一級核心)
    const userResult = await pool.query(
      'SELECT membership_level, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    const user = userResult.rows[0];
    if (user.membership_level !== 1 && user.status !== 'admin') {
      return res.status(403).json({ success: false, message: '權限不足' });
    }
    
    // 獲取所有活動的出席統計
    const statisticsResult = await pool.query(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        COUNT(DISTINCT er.user_id) as total_registered,
        COUNT(DISTINCT ar.user_id) as total_attended,
        CASE 
          WHEN COUNT(DISTINCT er.user_id) > 0 
          THEN ROUND((COUNT(DISTINCT ar.user_id)::DECIMAL / COUNT(DISTINCT er.user_id)) * 100, 1)
          ELSE 0 
        END as attendance_rate
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      LEFT JOIN attendance_records ar ON e.id = ar.event_id
      WHERE e.event_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY e.id, e.title, e.event_date
      ORDER BY e.event_date DESC
    `);
    
    res.json({
      success: true,
      statistics: statisticsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ success: false, message: '獲取出席統計失敗' });
  }
});

// 手動刪除出席記錄 (管理員功能)
router.delete('/record/:recordId', authenticateToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.id;
    
    // 檢查權限 (管理員或一級核心)
    const userResult = await pool.query(
      'SELECT membership_level, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0 || (userResult.rows[0].membership_level !== 1 && userResult.rows[0].status !== 'admin')) {
      return res.status(403).json({ success: false, message: '權限不足，僅限管理員或核心工作人員使用' });
    }
    
    // 刪除出席記錄
    const deleteResult = await pool.query(
      'DELETE FROM attendance_records WHERE id = $1 RETURNING *',
      [recordId]
    );
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '出席記錄不存在' });
    }
    
    res.json({ success: true, message: '出席記錄已刪除' });
    
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ success: false, message: '刪除出席記錄失敗' });
  }
});

// NFC 名片報到
router.post('/nfc-checkin', authenticateToken, checkAttendancePermission, async (req, res) => {
  try {
    const { nfcCardId, eventId } = req.body;
    
    if (!nfcCardId || !eventId) {
      return res.status(400).json({ success: false, message: '缺少必要參數' });
    }
    
    // 根據 NFC 卡片 ID 查找用戶
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE nfc_card_id = $1',
      [nfcCardId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'NFC 名片未註冊或用戶不存在' });
    }
    
    const user = userResult.rows[0];
    
    // 檢查活動是否存在
    const eventResult = await pool.query(
      'SELECT id, title FROM events WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '活動不存在' });
    }
    
    // 檢查是否已經報到過
    const existingRecord = await pool.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
      [user.id, eventId]
    );
    
    if (existingRecord.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `${user.name} 已經完成報到` 
      });
    }
    
    // 新增出席記錄
    await pool.query(
      'INSERT INTO attendance_records (user_id, event_id) VALUES ($1, $2)',
      [user.id, eventId]
    );
    
    // 自動新增300元收入記錄
    await pool.query(
      'INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        new Date().toISOString().split('T')[0], // 今天日期
        `${user.name} - ${eventResult.rows[0].title} 活動報到 (NFC)`,
        'income',
        300,
        '會員活動 NFC 名片報到自動收入',
        req.user.id
      ]
    );
    
    res.json({ 
      success: true, 
      message: `${user.name} NFC 名片報到成功，已自動新增300元收入`,
      user: user,
      event: eventResult.rows[0],
      method: 'NFC'
    });
    
  } catch (error) {
    console.error('Error during NFC check-in:', error);
    res.status(500).json({ success: false, message: 'NFC 報到失敗' });
  }
});

// 獲取用戶的 NFC 卡片 ID (用於測試和管理)
router.get('/nfc-info/:userId', authenticateToken, checkAttendancePermission, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userResult = await pool.query(
      'SELECT id, name, nfc_card_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    res.json({ 
      success: true, 
      user: userResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching NFC info:', error);
    res.status(500).json({ success: false, message: '獲取 NFC 資訊失敗' });
  }
});

module.exports = router;