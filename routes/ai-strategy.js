const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateStrategyRecommendations } = require('../services/aiStrategyService');
const { pool } = require('../config/database');

// GET /api/ai-strategy/recommendations?range=monthly|semiannual|annual
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.query.range || 'monthly').toLowerCase();
    const result = await generateStrategyRecommendations(userId, range);
    res.json(result);
  } catch (err) {
    console.error('生成 AI 策略建議失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 初始化資料表（若不存在）
async function ensureRecommendationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_strategy_recommendations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      range VARCHAR(20) NOT NULL,
      recommendations JSONB NOT NULL,
      rating INTEGER,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 保存本期 AI 策略建議
// POST /api/ai-strategy/recommendations/save
// body: { range, recommendations }
router.post('/recommendations/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.body.range || 'monthly').toLowerCase();
    const recommendations = req.body.recommendations;

    if (!recommendations || typeof recommendations !== 'object') {
      return res.status(400).json({ success: false, error: '缺少建議內容或格式不正確' });
    }

    await ensureRecommendationTable();

    const insertRes = await pool.query(
      `INSERT INTO ai_strategy_recommendations (user_id, range, recommendations)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, user_id, range, recommendations, created_at`,
      [userId, range, JSON.stringify(recommendations)]
    );

    return res.json({ success: true, data: insertRes.rows[0] });
  } catch (err) {
    console.error('保存 AI 策略建議失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 提交使用者回饋（評分與意見）
// POST /api/ai-strategy/recommendations/feedback
// body: { id, rating, feedback }
router.post('/recommendations/feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.body.id, 10);
    const rating = req.body.rating != null ? parseInt(req.body.rating, 10) : null; // 1-5
    const feedback = req.body.feedback || '';

    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: '缺少或無效的 id' });
    }
    if (rating != null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, error: '評分需為 1-5' });
    }

    await ensureRecommendationTable();

    // 僅允許更新屬於自己的紀錄
    const checkRes = await pool.query(
      `SELECT id FROM ai_strategy_recommendations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: '紀錄不存在或無權限' });
    }

    const updateRes = await pool.query(
      `UPDATE ai_strategy_recommendations
       SET rating = COALESCE($1, rating), feedback = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, user_id, range, recommendations, rating, feedback, created_at, updated_at`,
      [rating, feedback, id]
    );

    return res.json({ success: true, data: updateRes.rows[0] });
  } catch (err) {
    console.error('提交 AI 策略建議回饋失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 取得近期歷史記錄（最多 10 筆）
// GET /api/ai-strategy/recommendations/history?range=monthly|semiannual|annual
router.get('/recommendations/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.query.range || '').toLowerCase();

    await ensureRecommendationTable();

    const params = [userId];
    let sql = `SELECT id, user_id, range, recommendations, rating, feedback, created_at, updated_at
               FROM ai_strategy_recommendations
               WHERE user_id = $1`;
    if (['monthly','semiannual','annual'].includes(range)) {
      sql += ` AND range = $2`;
      params.push(range);
    }
    sql += ` ORDER BY created_at DESC LIMIT 10`;

    const rows = (await pool.query(sql, params)).rows;
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('取得 AI 策略建議歷史失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

module.exports = router;