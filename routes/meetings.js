const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendMeetingNotification } = require('../services/emailService');

// 創建會議預約
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { attendee_id, meeting_time_start, meeting_time_end, notes } = req.body;
    const requester_id = req.user.id;

    // 基本參數驗證，避免資料庫類型錯誤導致 500
    if (!attendee_id || isNaN(parseInt(attendee_id, 10))) {
      return res.status(400).json({ error: '請選擇受邀者' });
    }
    if (!meeting_time_start || !meeting_time_end) {
      return res.status(400).json({ error: '請選擇會議開始與結束時間' });
    }

    const startTime = new Date(meeting_time_start);
    const endTime = new Date(meeting_time_end);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: '會議時間格式不正確' });
    }
    if (requester_id === parseInt(attendee_id, 10)) {
      return res.status(400).json({ error: '不能邀請自己作為受邀者' });
    }

    // 檢查時間先後
    if (startTime >= endTime) {
      return res.status(400).json({ error: '結束時間必須晚於開始時間' });
    }

    if (startTime < new Date()) {
      return res.status(400).json({ error: '會議時間不能是過去時間' });
    }

    const attendeeId = parseInt(attendee_id, 10);

    // 取消會員等級限制，任何會員皆可預約會議，只需驗證受邀者存在與狀態

    // 檢查受邀者是否存在且為活躍會員
    const attendeeCheck = await pool.query(
      'SELECT id, name, email, company FROM users WHERE id = $1 AND status = $2',
      [attendeeId, 'active']
    );

    if (!attendeeCheck.rows[0]) {
      return res.status(404).json({ error: '受邀會員不存在或非活躍狀態' });
    }

    const attendeeUser = attendeeCheck.rows[0];

    // 取得發起人資訊用於Email
    const requesterInfo = await pool.query(
      'SELECT id, name, email, company FROM users WHERE id = $1',
      [requester_id]
    );
    const requesterUser = requesterInfo.rows[0];

    // 檢查發起人時間衝突
    const requesterConflict = await pool.query(
      `SELECT id FROM meetings 
       WHERE (requester_id = $1 OR attendee_id = $1) 
       AND status = 'confirmed'
       AND (
         (meeting_time_start <= $2 AND meeting_time_end > $2) OR
         (meeting_time_start < $3 AND meeting_time_end >= $3) OR
         (meeting_time_start >= $2 AND meeting_time_end <= $3)
       )`,
      [requester_id, meeting_time_start, meeting_time_end]
    );

    if (requesterConflict.rows.length > 0) {
      return res.status(400).json({ error: '您在此時間段已有其他交流' });
    }

    // 檢查受邀者時間衝突
    const attendeeConflict = await pool.query(
      `SELECT id FROM meetings 
       WHERE (requester_id = $1 OR attendee_id = $1) 
       AND status = 'confirmed'
       AND (
         (meeting_time_start <= $2 AND meeting_time_end > $2) OR
         (meeting_time_start < $3 AND meeting_time_end >= $3) OR
         (meeting_time_start >= $2 AND meeting_time_end <= $3)
       )`,
      [attendeeId, meeting_time_start, meeting_time_end]
    );

    if (attendeeConflict.rows.length > 0) {
      return res.status(400).json({ error: '受邀者在此時間段已有其他交流' });
    }

    // 創建會議記錄
    const result = await pool.query(
      `INSERT INTO meetings (requester_id, attendee_id, meeting_time_start, meeting_time_end, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [requester_id, attendeeUser.id, meeting_time_start, meeting_time_end, notes]
    );

    // 發送Email通知給受邀者
    const meetingData = {
      requester_name: requesterUser?.name || req.user.name,
      requester_company: requesterUser?.company || req.user.company,
      attendee_name: attendeeUser.name,
      attendee_email: attendeeUser.email,
      meeting_time_start: meeting_time_start,
      meeting_time_end: meeting_time_end,
      notes: notes
    };
    
    // 異步發送Email，不阻塞響應
    sendMeetingNotification('new_meeting', meetingData).catch(err => {
      console.error('發送交流通知Email失敗:', err);
    });

    res.status(201).json({
      message: '會議邀請已發送',
      meeting: result.rows[0]
    });
  } catch (error) {
    console.error('創建會議錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 獲取我的會議列表
router.get('/my-meetings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT m.*, 
             CASE 
               WHEN m.requester_id = $1 THEN u2.name
               ELSE u1.name
             END as other_party_name,
             CASE 
               WHEN m.requester_id = $1 THEN u2.company
               ELSE u1.company
             END as other_party_company,
             CASE 
               WHEN m.requester_id = $1 THEN 'sent'
               ELSE 'received'
             END as meeting_type
      FROM meetings m
      JOIN users u1 ON m.requester_id = u1.id
      JOIN users u2 ON m.attendee_id = u2.id
      WHERE (m.requester_id = $1 OR m.attendee_id = $1)
    `;

    const params = [userId];

    if (status) {
      query += ' AND m.status = $2';
      params.push(status);
    }

    query += ' ORDER BY m.meeting_time_start ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取會議列表錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 獲取特定會員的可用時間（唯讀日曆）
router.get('/availability/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { start_date, end_date } = req.query;

    // 檢查目標用戶是否存在
    const userCheck = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND status = $2',
      [userId, 'active']
    );

    if (!userCheck.rows[0]) {
      return res.status(404).json({ error: '用戶不存在或非活躍狀態' });
    }

    // 獲取該用戶在指定時間範圍內的已確認會議
    const busyTimes = await pool.query(
      `SELECT meeting_time_start, meeting_time_end
       FROM meetings
       WHERE (requester_id = $1 OR attendee_id = $1)
       AND status = 'confirmed'
       AND meeting_time_start >= $2
       AND meeting_time_end <= $3
       ORDER BY meeting_time_start`,
      [userId, start_date, end_date]
    );

    res.json({
      user: userCheck.rows[0],
      busy_times: busyTimes.rows
    });
  } catch (error) {
    console.error('獲取可用時間錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 處理會議邀請（確認或取消）
router.put('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' or 'cancelled'
    const userId = req.user.id;

    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: '無效的狀態' });
    }

    // 檢查會議是否存在且用戶有權限處理，並獲取相關用戶信息
    const meetingCheck = await pool.query(
      `SELECT m.*, 
              r.name as requester_name, r.email as requester_email, r.company as requester_company,
              a.name as attendee_name, a.email as attendee_email, a.company as attendee_company
       FROM meetings m
       JOIN users r ON m.requester_id = r.id
       JOIN users a ON m.attendee_id = a.id
       WHERE m.id = $1 AND (m.requester_id = $2 OR m.attendee_id = $2) AND m.status = $3`,
      [id, userId, 'pending']
    );

    if (!meetingCheck.rows[0]) {
      return res.status(404).json({ error: '交流不存在或已處理' });
    }

    const meeting = meetingCheck.rows[0];

    // 如果是確認會議，需要再次檢查時間衝突
    if (status === 'confirmed') {
      const conflictCheck = await pool.query(
        `SELECT id FROM meetings 
         WHERE (requester_id = $1 OR attendee_id = $1 OR requester_id = $2 OR attendee_id = $2) 
         AND status = 'confirmed'
         AND id != $3
         AND (
           (meeting_time_start <= $4 AND meeting_time_end > $4) OR
           (meeting_time_start < $5 AND meeting_time_end >= $5) OR
           (meeting_time_start >= $4 AND meeting_time_end <= $5)
         )`,
        [meeting.requester_id, meeting.attendee_id, id, meeting.meeting_time_start, meeting.meeting_time_end]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({ error: '時間衝突，無法確認交流' });
      }
    }

    // 更新會議狀態
    const result = await pool.query(
      `UPDATE meetings 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // 發送Email通知給會議發起人（如果是受邀者回應）
    if (meeting.attendee_id === userId) {
      const meetingData = {
        requester_name: meeting.requester_name,
        requester_email: meeting.requester_email,
        attendee_name: meeting.attendee_name,
        meeting_time_start: meeting.meeting_time_start,
        meeting_time_end: meeting.meeting_time_end,
        notes: meeting.notes
      };
      
      const notificationType = status === 'confirmed' ? 'meeting_confirmed' : 'meeting_cancelled';
      
      // 異步發送Email，不阻塞響應
      sendMeetingNotification(notificationType, meetingData).catch(err => {
        console.error('發送交流回應通知Email失敗:', err);
      });
    }

    res.json({
      message: status === 'confirmed' ? '交流已確認' : '交流已取消',
      meeting: result.rows[0]
    });
  } catch (error) {
    console.error('處理會議邀請錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 取消會議（發起人可以取消）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 檢查會議是否存在且用戶是發起人
    const meetingCheck = await pool.query(
      'SELECT * FROM meetings WHERE id = $1 AND requester_id = $2',
      [id, userId]
    );

    if (!meetingCheck.rows[0]) {
      return res.status(404).json({ error: '交流不存在或您無權限取消' });
    }

    // 更新會議狀態為取消
    await pool.query(
      `UPDATE meetings 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    res.json({ message: '交流已取消' });
  } catch (error) {
    console.error('取消交流錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

module.exports = router;