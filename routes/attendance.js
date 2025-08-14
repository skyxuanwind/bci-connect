const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 檢查用戶是否有報到權限 (活動工作人員或管理員)
const checkAttendancePermission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 檢查是否為管理員或一級核心
    const userResult = await pool.query(
      'SELECT membership_level, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    const user = userResult.rows[0];
    
    // 管理員或一級核心可以進行報到操作
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
    
    // 檢查權限 (僅限管理員)
    const userResult = await pool.query(
      'SELECT status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'admin') {
      return res.status(403).json({ success: false, message: '權限不足，僅限管理員使用' });
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

module.exports = router;