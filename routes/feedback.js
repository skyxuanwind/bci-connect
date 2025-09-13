const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 取得指定會議的回饋狀態（是否可填、已填、雙方狀態）
router.get('/meeting/:id/status', authenticateToken, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (Number.isNaN(meetingId)) {
      return res.status(400).json({ error: '無效的會議ID' });
    }

    const meetingRes = await pool.query(
      `SELECT * FROM meetings WHERE id = $1`,
      [meetingId]
    );
    const meeting = meetingRes.rows[0];
    if (!meeting) return res.status(404).json({ error: '會議不存在' });

    // 權限：必須是會議雙方其一
    if (meeting.requester_id !== userId && meeting.attendee_id !== userId) {
      return res.status(403).json({ error: '無權限存取該會議回饋' });
    }

    const now = new Date();
    const meetingEnd = new Date(meeting.meeting_time_end);
    const canSubmit = meeting.status === 'confirmed' && meetingEnd <= now;

    const otherUserId = meeting.requester_id === userId ? meeting.attendee_id : meeting.requester_id;

    const myFbRes = await pool.query(
      `SELECT * FROM meeting_feedbacks WHERE meeting_id = $1 AND rater_id = $2`,
      [meetingId, userId]
    );
    const otherFbRes = await pool.query(
      `SELECT * FROM meeting_feedbacks WHERE meeting_id = $1 AND rater_id = $2`,
      [meetingId, otherUserId]
    );

    res.json({
      meeting: {
        id: meeting.id,
        requester_id: meeting.requester_id,
        attendee_id: meeting.attendee_id,
        meeting_time_start: meeting.meeting_time_start,
        meeting_time_end: meeting.meeting_time_end,
        status: meeting.status
      },
      canSubmit,
      alreadySubmitted: myFbRes.rows.length > 0,
      myFeedback: myFbRes.rows[0] || null,
      otherFeedback: otherFbRes.rows[0] || null
    });
  } catch (error) {
    console.error('取得回饋狀態失敗:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 提交或更新對此會議的回饋（雙向）
router.post('/meeting/:id/submit', authenticateToken, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { rating, answers, comments } = req.body;

    if (Number.isNaN(meetingId)) {
      return res.status(400).json({ error: '無效的會議ID' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '請提供 1-5 的整數評分' });
    }

    const meetingRes = await pool.query(`SELECT * FROM meetings WHERE id = $1`, [meetingId]);
    const meeting = meetingRes.rows[0];
    if (!meeting) return res.status(404).json({ error: '會議不存在' });

    // 權限：必須是會議雙方其一
    if (meeting.requester_id !== userId && meeting.attendee_id !== userId) {
      return res.status(403).json({ error: '無權限提交該會議回饋' });
    }

    // 僅允許已確認且已結束的會議提交
    const now = new Date();
    if (!(meeting.status === 'confirmed' && new Date(meeting.meeting_time_end) <= now)) {
      return res.status(400).json({ error: '僅能在會議結束後提交回饋' });
    }

    const rateeId = meeting.requester_id === userId ? meeting.attendee_id : meeting.requester_id;

    // upsert：使用唯一鍵 (meeting_id, rater_id)
    const upsertSql = `
      INSERT INTO meeting_feedbacks (meeting_id, rater_id, ratee_id, rating, answers, comments, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (meeting_id, rater_id)
      DO UPDATE SET rating = EXCLUDED.rating, answers = EXCLUDED.answers, comments = EXCLUDED.comments, updated_at = NOW()
      RETURNING *
    `;
    const upsertRes = await pool.query(upsertSql, [
      meetingId,
      userId,
      rateeId,
      Math.round(rating),
      answers ? JSON.stringify(answers) : null,
      comments || null
    ]);

    res.json({ message: '回饋已提交', feedback: upsertRes.rows[0] });
  } catch (error) {
    console.error('提交回饋失敗:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 取得我的回饋清單（我提交的 / 我收到的）
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // submitted | received | all

    let submitted = [];
    let received = [];

    if (!type || type === 'submitted' || type === 'all') {
      const r = await pool.query(
        `SELECT f.*, u.name AS ratee_name
         FROM meeting_feedbacks f
         JOIN users u ON f.ratee_id = u.id
         WHERE f.rater_id = $1
         ORDER BY f.created_at DESC`,
        [userId]
      );
      submitted = r.rows;
    }

    if (!type || type === 'received' || type === 'all') {
      const r = await pool.query(
        `SELECT f.*, u.name AS rater_name
         FROM meeting_feedbacks f
         JOIN users u ON f.rater_id = u.id
         WHERE f.ratee_id = $1
         ORDER BY f.created_at DESC`,
        [userId]
      );
      received = r.rows;
    }

    res.json({ submitted, received });
  } catch (error) {
    console.error('取得我的回饋清單失敗:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

module.exports = router;