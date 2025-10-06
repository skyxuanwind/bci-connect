const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { sendAINotification } = require('../services/emailService');
const { AINotificationService } = require('../services/aiNotificationService');
const aiNotificationService = new AINotificationService();
const { authenticateToken } = require('../middleware/auth');

// Helper: compute period start/end for goals
function computePeriod(range) {
  const now = new Date();
  let startDate, endDate;
  if (range === 'annual') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (range === 'semiannual') {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  const startDateStr = startDateISO.slice(0, 10);
  const endDateStr = endDateISO.slice(0, 10);
  return { startDate, endDate, startDateISO, endDateISO, startDateStr, endDateStr };
}

// Helper: compute achievement rates given actuals and targets
function computeAchievementRates(actuals, targets) {
  const rate = (a, t) => {
    const ta = Number(t || 0);
    if (!ta || ta <= 0) return null;
    return Math.min(1, Number(a || 0) / ta);
  };
  return {
    referrals_sent: rate(actuals.referrals_sent, targets.referrals_sent),
    referrals_received: rate(actuals.referrals_received, targets.referrals_received),
    referrals_confirmed: rate(actuals.referrals_confirmed, targets.referrals_confirmed),
    exchanges_confirmed: rate(actuals.exchanges_confirmed, targets.exchanges_confirmed)
  };
}

// Helper: suggest next-period targets based on simple heuristics
function suggestTargetsFromActuals(actuals) {
  const bump = (x) => Math.max(1, Math.round(Number(x || 0) * 1.2));
  return {
    referrals_sent: bump(actuals.referrals_sent),
    referrals_received: bump(actuals.referrals_received),
    referrals_confirmed: bump(actuals.referrals_confirmed),
    exchanges_confirmed: bump(actuals.exchanges_confirmed)
  };
}

// 取得「我的商業儀表板」統計摘要
// GET /api/business-dashboard/summary?range=monthly|semiannual|annual
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.query.range || 'monthly').toLowerCase();

    const { startDate, endDate, startDateISO, endDateISO, startDateStr } = computePeriod(range);

    // Referrals 統計
    const [sentRes, receivedRes, confirmedRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c
         FROM referrals
         WHERE referrer_id = $1
           AND created_at >= $2 AND created_at <= $3`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c
         FROM referrals
         WHERE referred_to_id = $1
           AND created_at >= $2 AND created_at <= $3`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c
         FROM referrals
         WHERE (referrer_id = $1 OR referred_to_id = $1)
           AND status = 'confirmed'
           AND updated_at >= $2 AND updated_at <= $3`,
        [userId, startDateISO, endDateISO]
      )
    ]);

    // Meetings（業務交流）統計：已完成（confirmed），依交流開始時間過濾
    const exchangesRes = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM meetings
       WHERE (requester_id = $1 OR attendee_id = $1)
         AND status = 'confirmed'
         AND meeting_time_start >= $2 AND meeting_time_start <= $3`,
      [userId, startDateISO, endDateISO]
    );

    // 目標（Targets）：查詢同期間的 business_goals
    const goalsRes = await pool.query(
      `SELECT targets
       FROM business_goals
       WHERE user_id = $1 AND period_type = $2 AND period_start = $3::date
       LIMIT 1`,
      [userId, range, startDateStr]
    );
    const goalTargets = goalsRes.rows[0]?.targets || {
      referrals_sent: 0,
      referrals_received: 0,
      referrals_confirmed: 0,
      exchanges_confirmed: 0
    };

    // 週趨勢（sent/received 依 created_at，confirmed 依 updated_at；交流依 meeting_time_start）
    const [refWeeklySent, refWeeklyReceived, refWeeklyConfirmed, exchWeekly] = await Promise.all([
      pool.query(
        `SELECT date_trunc('week', created_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE referrer_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('week', created_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE referred_to_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('week', updated_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE (referrer_id = $1 OR referred_to_id = $1)
           AND status = 'confirmed'
           AND updated_at >= $2 AND updated_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('week', meeting_time_start)::date AS bucket, COUNT(*)::int AS c
         FROM meetings
         WHERE (requester_id = $1 OR attendee_id = $1)
           AND status = 'confirmed'
           AND meeting_time_start >= $2 AND meeting_time_start <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      )
    ]);

    // 月趨勢
    const [refMonthlySent, refMonthlyReceived, refMonthlyConfirmed, exchMonthly] = await Promise.all([
      pool.query(
        `SELECT date_trunc('month', created_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE referrer_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('month', created_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE referred_to_id = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('month', updated_at)::date AS bucket, COUNT(*)::int AS c
         FROM referrals
         WHERE (referrer_id = $1 OR referred_to_id = $1)
           AND status = 'confirmed'
           AND updated_at >= $2 AND updated_at <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT date_trunc('month', meeting_time_start)::date AS bucket, COUNT(*)::int AS c
         FROM meetings
         WHERE (requester_id = $1 OR attendee_id = $1)
           AND status = 'confirmed'
           AND meeting_time_start >= $2 AND meeting_time_start <= $3
         GROUP BY bucket ORDER BY bucket`,
        [userId, startDateISO, endDateISO]
      )
    ]);

    const weeklyBuckets = {};
    refWeeklySent.rows.forEach(r => { weeklyBuckets[r.bucket] = weeklyBuckets[r.bucket] || { bucket: r.bucket }; weeklyBuckets[r.bucket].sent = r.c; });
    refWeeklyReceived.rows.forEach(r => { weeklyBuckets[r.bucket] = weeklyBuckets[r.bucket] || { bucket: r.bucket }; weeklyBuckets[r.bucket].received = r.c; });
    refWeeklyConfirmed.rows.forEach(r => { weeklyBuckets[r.bucket] = weeklyBuckets[r.bucket] || { bucket: r.bucket }; weeklyBuckets[r.bucket].confirmed = r.c; });
    exchWeekly.rows.forEach(r => { weeklyBuckets[r.bucket] = weeklyBuckets[r.bucket] || { bucket: r.bucket }; weeklyBuckets[r.bucket].exchanges = r.c; });
    const weeklyTrend = Object.values(weeklyBuckets).sort((a, b) => new Date(a.bucket) - new Date(b.bucket));

    const monthlyBuckets = {};
    refMonthlySent.rows.forEach(r => { monthlyBuckets[r.bucket] = monthlyBuckets[r.bucket] || { bucket: r.bucket }; monthlyBuckets[r.bucket].sent = r.c; });
    refMonthlyReceived.rows.forEach(r => { monthlyBuckets[r.bucket] = monthlyBuckets[r.bucket] || { bucket: r.bucket }; monthlyBuckets[r.bucket].received = r.c; });
    refMonthlyConfirmed.rows.forEach(r => { monthlyBuckets[r.bucket] = monthlyBuckets[r.bucket] || { bucket: r.bucket }; monthlyBuckets[r.bucket].confirmed = r.c; });
    exchMonthly.rows.forEach(r => { monthlyBuckets[r.bucket] = monthlyBuckets[r.bucket] || { bucket: r.bucket }; monthlyBuckets[r.bucket].exchanges = r.c; });
    const monthlyTrend = Object.values(monthlyBuckets).sort((a, b) => new Date(a.bucket) - new Date(b.bucket));

    const actuals = {
      referrals_sent: sentRes.rows[0]?.c || 0,
      referrals_received: receivedRes.rows[0]?.c || 0,
      referrals_confirmed: confirmedRes.rows[0]?.c || 0,
      exchanges_confirmed: exchangesRes.rows[0]?.c || 0
    };
    const data = {
      timeRange: range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      referrals: {
        sent: actuals.referrals_sent,
        received: actuals.referrals_received,
        confirmed: actuals.referrals_confirmed
      },
      exchanges: {
        confirmed_meetings: actuals.exchanges_confirmed
      },
      goals: goalTargets,
      achievementRates: computeAchievementRates(actuals, goalTargets),
      conversionRates: {
        sent_to_confirmed: (actuals.referrals_sent > 0) ? (actuals.referrals_confirmed / actuals.referrals_sent) : null,
        confirmed_to_exchange: (actuals.referrals_confirmed > 0) ? (actuals.exchanges_confirmed / actuals.referrals_confirmed) : null,
        sent_to_exchange: (actuals.referrals_sent > 0) ? (actuals.exchanges_confirmed / actuals.referrals_sent) : null
      },
      trends: {
        weekly: weeklyTrend,
        monthly: monthlyTrend
      },
      suggestedTargets: suggestTargetsFromActuals(actuals)
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error('取得商業儀表板統計摘要失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 取得或設定個人目標（當期）
// GET /api/business-dashboard/goals?range=monthly|semiannual|annual
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.query.range || 'monthly').toLowerCase();
    const { startDateStr, endDateStr } = computePeriod(range);
    const result = await pool.query(
      `SELECT user_id, period_type, period_start, period_end, targets
       FROM business_goals
       WHERE user_id = $1 AND period_type = $2 AND period_start = $3::date
       LIMIT 1`,
      [userId, range, startDateStr]
    );
    if (result.rows[0]) {
      return res.json({ success: true, data: result.rows[0] });
    }
    return res.json({ success: true, data: {
      user_id: userId,
      period_type: range,
      period_start: startDateStr,
      period_end: endDateStr,
      targets: {
        referrals_sent: 0,
        referrals_received: 0,
        referrals_confirmed: 0,
        exchanges_confirmed: 0
      }
    }});
  } catch (err) {
    console.error('取得目標失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 設定（新增或更新）個人目標
// POST /api/business-dashboard/goals
// body: { range, targets }
router.post('/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.body.range || 'monthly').toLowerCase();
    const { startDateStr, endDateStr } = computePeriod(range);
    const targets = req.body.targets || {};
    const cleanTargets = {
      referrals_sent: Number(targets.referrals_sent || 0),
      referrals_received: Number(targets.referrals_received || 0),
      referrals_confirmed: Number(targets.referrals_confirmed || 0),
      exchanges_confirmed: Number(targets.exchanges_confirmed || 0)
    };
    const upsertSQL = `
      INSERT INTO business_goals (user_id, period_type, period_start, period_end, targets, created_at, updated_at)
      VALUES ($1, $2, $3::date, $4::date, $5::jsonb, NOW(), NOW())
      ON CONFLICT (user_id, period_type, period_start)
      DO UPDATE SET targets = EXCLUDED.targets, period_end = EXCLUDED.period_end, updated_at = NOW()
      RETURNING user_id, period_type, period_start, period_end, targets;
    `;
    const result = await pool.query(upsertSQL, [userId, range, startDateStr, endDateStr, cleanTargets]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('設定目標失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 目標達成率提醒（Email + 站內通知）
// POST /api/business-dashboard/achievements/notify
// body: { range }
router.post('/achievements/notify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.body.range || 'monthly').toLowerCase();
    const { startDateISO, endDateISO, startDateStr } = computePeriod(range);

    // 實績統計
    const [sentRes, receivedRes, confirmedRes, exchangesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_id = $1 AND created_at BETWEEN $2 AND $3`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM referrals WHERE referred_to_id = $1 AND created_at BETWEEN $2 AND $3`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM referrals WHERE (referrer_id = $1 OR referred_to_id = $1) AND status = 'confirmed' AND updated_at BETWEEN $2 AND $3`,
        [userId, startDateISO, endDateISO]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM meetings WHERE (requester_id = $1 OR attendee_id = $1) AND status = 'confirmed' AND meeting_time_start BETWEEN $2 AND $3`,
        [userId, startDateISO, endDateISO]
      )
    ]);

    const actuals = {
      referrals_sent: sentRes.rows[0]?.c || 0,
      referrals_received: receivedRes.rows[0]?.c || 0,
      referrals_confirmed: confirmedRes.rows[0]?.c || 0,
      exchanges_confirmed: exchangesRes.rows[0]?.c || 0
    };

    // 目標
    const goalsRes = await pool.query(
      `SELECT targets FROM business_goals WHERE user_id = $1 AND period_type = $2 AND period_start = $3::date LIMIT 1`,
      [userId, range, startDateStr]
    );
    const targets = goalsRes.rows[0]?.targets || {
      referrals_sent: 0,
      referrals_received: 0,
      referrals_confirmed: 0,
      exchanges_confirmed: 0
    };

    const rates = computeAchievementRates(actuals, targets);
    const pct = (v) => (v === null || v === undefined) ? '—' : `${Math.round(v * 100)}%`;

    // 使用者資料
    const userRes = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
    const user = userRes.rows[0] || { email: null, name: '會員' };

    const content = `當期「${range}」目標達成率：\n` +
      `• 發出引薦：${pct(rates.referrals_sent)}（${actuals.referrals_sent}/${targets.referrals_sent || 0}）\n` +
      `• 收到引薦：${pct(rates.referrals_received)}（${actuals.referrals_received}/${targets.referrals_received || 0}）\n` +
      `• 確認引薦：${pct(rates.referrals_confirmed)}（${actuals.referrals_confirmed}/${targets.referrals_confirmed || 0}）\n` +
      `• 交流完成：${pct(rates.exchanges_confirmed)}（${actuals.exchanges_confirmed}/${targets.exchanges_confirmed || 0}）\n\n` +
      `建議：聚焦短板项目，安排3個高潛力交流與2個合作引薦。`;

    // Email 通知
    if (user.email) {
      await sendAINotification({ email: user.email, name: user.name || '會員', notificationType: 'goal_achievement', content });
    }

    // 站內通知
    await aiNotificationService.createNotification(userId, 'goal_achievement', {
      title: '🎯 目標達成率提醒',
      content,
      priority: 2
    });

    res.json({ success: true, message: '提醒已發送', data: { rates, actuals, targets } });
  } catch (err) {
    console.error('發送目標達成率提醒失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 產品／服務管理
// GET /api/business-dashboard/products-services
router.get('/products-services', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, name, description, price, tags, is_active, created_at, updated_at
       FROM user_products_services
       WHERE user_id = $1
       ORDER BY is_active DESC, updated_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('取得產品／服務列表失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// POST /api/business-dashboard/products-services
router.post('/products-services', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, tags, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '名稱為必填' });
    }
    const result = await pool.query(
      `INSERT INTO user_products_services (user_id, name, description, price, tags, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6, true), NOW(), NOW())
       RETURNING id, name, description, price, tags, is_active, created_at, updated_at`,
      [userId, name.trim(), description || null, price || null, tags || [], is_active]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('新增產品／服務失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// PUT /api/business-dashboard/products-services/:id
router.put('/products-services/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { name, description, price, tags, is_active } = req.body;
    const result = await pool.query(
      `UPDATE user_products_services
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           price = COALESCE($5, price),
           tags = COALESCE($6::jsonb, tags),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, description, price, tags, is_active, created_at, updated_at`,
      [id, userId, name || null, description || null, price || null, tags || null, is_active]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: '找不到項目' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('更新產品／服務失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// DELETE /api/business-dashboard/products-services/:id
router.delete('/products-services/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const result = await pool.query(
      `DELETE FROM user_products_services WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: '找不到項目' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('刪除產品／服務失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 行銷漏斗設定（簡易結構）
// GET /api/business-dashboard/funnel
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT user_id, stages, notes, created_at, updated_at
       FROM marketing_funnel_configs WHERE user_id = $1`,
      [userId]
    );
    if (result.rows[0]) {
      return res.json({ success: true, data: result.rows[0] });
    }
    return res.json({ success: true, data: { user_id: userId, stages: [], notes: null } });
  } catch (err) {
    console.error('取得漏斗設定失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// POST /api/business-dashboard/funnel（upsert）
router.post('/funnel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stages = Array.isArray(req.body.stages) ? req.body.stages : [];
    const notes = req.body.notes || null;
    const result = await pool.query(
      `INSERT INTO marketing_funnel_configs (user_id, stages, notes, created_at, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET stages = EXCLUDED.stages, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING user_id, stages, notes, created_at, updated_at`,
      [userId, stages, notes]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('設定漏斗失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

module.exports = router;
// 來源分解與合作夥伴排行
// GET /api/business-dashboard/sources?range=monthly|semiannual|annual
router.get('/sources', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const range = (req.query.range || 'monthly').toLowerCase();
    const { startDateISO, endDateISO } = computePeriod(range);

    // 我發出的引薦：按對象統計
    const sentAgg = await pool.query(
      `SELECT r.referred_to_id AS partner_id,
              COUNT(*)::int AS total,
              SUM(CASE WHEN r.status = 'confirmed' THEN 1 ELSE 0 END)::int AS confirmed
       FROM referrals r
       WHERE r.referrer_id = $1 AND r.created_at BETWEEN $2 AND $3
       GROUP BY r.referred_to_id
       ORDER BY total DESC
       LIMIT 5`,
      [userId, startDateISO, endDateISO]
    );

    // 我收到的引薦：按來源統計
    const recvAgg = await pool.query(
      `SELECT r.referrer_id AS partner_id,
              COUNT(*)::int AS total,
              SUM(CASE WHEN r.status = 'confirmed' THEN 1 ELSE 0 END)::int AS confirmed
       FROM referrals r
       WHERE r.referred_to_id = $1 AND r.created_at BETWEEN $2 AND $3
       GROUP BY r.referrer_id
       ORDER BY total DESC
       LIMIT 5`,
      [userId, startDateISO, endDateISO]
    );

    // 業務交流：已完成會議的前五大合作夥伴
    const meetAgg = await pool.query(
      `SELECT CASE WHEN m.requester_id = $1 THEN m.attendee_id ELSE m.requester_id END AS partner_id,
              COUNT(*)::int AS total
       FROM meetings m
       WHERE (m.requester_id = $1 OR m.attendee_id = $1)
         AND m.status = 'confirmed'
         AND m.meeting_time_start BETWEEN $2 AND $3
       GROUP BY partner_id
       ORDER BY total DESC
       LIMIT 5`,
      [userId, startDateISO, endDateISO]
    );

    // 取得夥伴基礎資料
    const partnerIds = [
      ...sentAgg.rows.map(r => r.partner_id),
      ...recvAgg.rows.map(r => r.partner_id),
      ...meetAgg.rows.map(r => r.partner_id)
    ].filter(Boolean);

    let partnerMap = {};
    if (partnerIds.length > 0) {
      const uniq = Array.from(new Set(partnerIds));
      const userRes = await pool.query(
        `SELECT id, name, company, title
         FROM users
         WHERE id = ANY($1::int[])`,
        [uniq]
      );
      userRes.rows.forEach(u => { partnerMap[u.id] = u; });
    }

    const decorate = (rows) => rows.map(r => ({
      partner_id: r.partner_id,
      partner: partnerMap[r.partner_id] || null,
      total: r.total,
      confirmed: r.confirmed ?? null,
      conversion_rate: (r.confirmed !== undefined && r.total > 0) ? (r.confirmed / r.total) : null
    }));

    res.json({
      success: true,
      data: {
        top_sent_partners: decorate(sentAgg.rows),
        top_received_partners: decorate(recvAgg.rows),
        top_meeting_partners: meetAgg.rows.map(r => ({
          partner_id: r.partner_id,
          partner: partnerMap[r.partner_id] || null,
          total: r.total
        }))
      }
    });
  } catch (err) {
    console.error('取得來源分解失敗:', err);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});