const { pool } = require('../config/database');
const { sendAINotification } = require('./emailService');
const { AINotificationService } = require('./aiNotificationService');
const aiNotificationService = new AINotificationService();

// 門檻低於 threshold 才發送提醒
const THRESHOLD_DEFAULT = 0.5;

async function computeActualsForUser(userId, startDate, endDate) {
  // 實績：引薦與交流
  const referralsSentRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id = $1 AND created_at >= $2 AND created_at <= $3`,
    [userId, startDate, endDate]
  );
  const referralsReceivedRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM referrals WHERE referred_to_id = $1 AND created_at >= $2 AND created_at <= $3`,
    [userId, startDate, endDate]
  );
  const referralsConfirmedRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM referrals WHERE (referrer_id = $1 OR referred_to_id = $1) AND status = 'confirmed' AND updated_at >= $2 AND updated_at <= $3`,
    [userId, startDate, endDate]
  );
  const exchangesConfirmedRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM meetings WHERE status = 'confirmed' AND (requester_id = $1 OR attendee_id = $1) AND meeting_time_start >= $2 AND meeting_time_start <= $3`,
    [userId, startDate, endDate]
  );
  return {
    referrals_sent: Number(referralsSentRes.rows[0]?.cnt || 0),
    referrals_received: Number(referralsReceivedRes.rows[0]?.cnt || 0),
    referrals_confirmed: Number(referralsConfirmedRes.rows[0]?.cnt || 0),
    exchanges_confirmed: Number(exchangesConfirmedRes.rows[0]?.cnt || 0)
  };
}

function computeAchievementRates(actuals, targets) {
  const rate = (a, t) => {
    const av = Number(a || 0);
    const tv = Number(t || 0);
    if (!tv || tv <= 0) return 0;
    return Math.min(1, av / tv);
  };
  return {
    referrals_sent: rate(actuals.referrals_sent, targets.referrals_sent),
    referrals_received: rate(actuals.referrals_received, targets.referrals_received),
    referrals_confirmed: rate(actuals.referrals_confirmed, targets.referrals_confirmed),
    exchanges_confirmed: rate(actuals.exchanges_confirmed, targets.exchanges_confirmed)
  };
}

async function getCurrentPeriod(range) {
  const now = new Date();
  let startDate, endDate;
  if (range === 'semiannual') {
    const month = now.getMonth();
    const startMonth = month < 6 ? 0 : 6;
    startDate = new Date(now.getFullYear(), startMonth, 1);
    endDate = new Date(now.getFullYear(), startMonth + 6, 0);
  } else if (range === 'annual') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 12, 0);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  return { startDate, endDate };
}

async function getCurrentTargets(userId, range) {
  const { startDate } = await getCurrentPeriod(range);
  const res = await pool.query(
    `SELECT targets FROM business_goals WHERE user_id = $1 AND period_type = $2 AND period_start = $3 LIMIT 1`,
    [userId, range, startDate.toISOString().slice(0, 10)]
  );
  return res.rows[0]?.targets || {};
}

async function notifyIfBelowThreshold(user, range = 'monthly', threshold = THRESHOLD_DEFAULT) {
  const { startDate, endDate } = await getCurrentPeriod(range);
  const actuals = await computeActualsForUser(user.id, startDate, endDate);
  const targets = await getCurrentTargets(user.id, range);
  const rates = computeAchievementRates(actuals, targets);

  const entries = [
    { key: 'referrals_sent', label: '發出引薦' },
    { key: 'referrals_received', label: '收到引薦' },
    { key: 'referrals_confirmed', label: '確認引薦' },
    { key: 'exchanges_confirmed', label: '交流完成' }
  ];

  const below = entries.filter((e) => (rates?.[e.key] ?? 0) < threshold);
  if (below.length === 0) return { sent: false, reason: '所有項目皆高於門檻' };

  const lines = entries.map((e) => {
    const r = Math.round(((rates?.[e.key] ?? 0) * 100));
    const a = Number(actuals?.[e.key] ?? 0);
    const t = Number(targets?.[e.key] ?? 0);
    return `${e.label}: ${a}/${t}（${r}%）`;
  });
  const content = `您好！以下為${range === 'monthly' ? '月度' : range === 'semiannual' ? '半年度' : '年度'}目標達成率提醒：\n\n${lines.join('\n')}\n\n低於 ${Math.round(threshold*100)}% 的項目建議立即採取行動。`;

  try {
    await sendAINotification({
      email: user.email,
      name: user.name || '會員',
      notificationType: 'goal_achievement_reminder',
      content
    });
  } catch (e) {
    console.error('寄送 Email 失敗:', e?.message || e);
  }

  try {
    await aiNotificationService.createNotification(user.id, 'goal_reminder', {
      title: '目標達成率提醒',
      content,
      priority: 'high'
    });
  } catch (e) {
    console.error('建立站內提醒失敗:', e?.message || e);
  }

  return { sent: true, below: below.map((b) => b.key) };
}

async function notifyAllActiveUsers(range = 'monthly', threshold = THRESHOLD_DEFAULT) {
  // 取出所有使用者（簡化：僅挑選 email 非空者）
  const res = await pool.query(`SELECT id, email FROM users WHERE email IS NOT NULL`);
  const users = res.rows || [];
  const results = [];
  for (const u of users) {
    try {
      const r = await notifyIfBelowThreshold(u, range, threshold);
      results.push({ userId: u.id, ...r });
    } catch (e) {
      console.error('處理使用者提醒失敗:', u.id, e?.message || e);
      results.push({ userId: u.id, sent: false, reason: e?.message || '處理失敗' });
    }
  }
  return { count: users.length, results };
}

module.exports = {
  notifyIfBelowThreshold,
  notifyAllActiveUsers,
};