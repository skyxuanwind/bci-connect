const { pool } = require('../config/database');
const geminiService = require('./geminiService');

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
  return { startDate, endDate, startDateISO, endDateISO, startDateStr };
}

async function fetchActualsAndTargets(userId, range) {
  const { startDateISO, endDateISO, startDateStr } = computePeriod(range);
  const [sentRes, receivedRes, confirmedRes, exchangesRes, goalsRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [userId, startDateISO, endDateISO]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS c FROM referrals WHERE referred_to_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [userId, startDateISO, endDateISO]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS c FROM referrals WHERE (referrer_id = $1 OR referred_to_id = $1) AND status = 'confirmed' AND updated_at >= $2 AND updated_at <= $3`,
      [userId, startDateISO, endDateISO]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS c FROM meetings WHERE (requester_id = $1 OR attendee_id = $1) AND status = 'confirmed' AND meeting_time_start >= $2 AND meeting_time_start <= $3`,
      [userId, startDateISO, endDateISO]
    ),
    pool.query(
      `SELECT targets FROM business_goals WHERE user_id = $1 AND period_type = $2 AND period_start = $3::date LIMIT 1`,
      [userId, range, startDateStr]
    )
  ]);

  const actuals = {
    referrals_sent: sentRes.rows[0]?.c || 0,
    referrals_received: receivedRes.rows[0]?.c || 0,
    referrals_confirmed: confirmedRes.rows[0]?.c || 0,
    exchanges_confirmed: exchangesRes.rows[0]?.c || 0
  };
  const targets = goalsRes.rows[0]?.targets || {
    referrals_sent: 0,
    referrals_received: 0,
    referrals_confirmed: 0,
    exchanges_confirmed: 0
  };
  const gaps = {
    referrals_sent: Math.max(0, Number(targets.referrals_sent || 0) - Number(actuals.referrals_sent || 0)),
    referrals_received: Math.max(0, Number(targets.referrals_received || 0) - Number(actuals.referrals_received || 0)),
    referrals_confirmed: Math.max(0, Number(targets.referrals_confirmed || 0) - Number(actuals.referrals_confirmed || 0)),
    exchanges_confirmed: Math.max(0, Number(targets.exchanges_confirmed || 0) - Number(actuals.exchanges_confirmed || 0))
  };
  return { actuals, targets, gaps };
}

async function fetchProductsAndFunnel(userId) {
  const [productsRes, funnelRes] = await Promise.all([
    pool.query(
      `SELECT id, name, description, price, tags, is_active FROM user_products_services WHERE user_id = $1 ORDER BY is_active DESC, updated_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT stages, notes FROM marketing_funnel_configs WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
  ]);
  const products = productsRes.rows || [];
  const funnel = funnelRes.rows[0]?.stages || [];
  return { products, funnel };
}

function buildStrategyPrompt(userProfile, features) {
  const { actuals, targets, gaps } = features.metrics;
  const { products, funnel } = features.structures;
  const prompt = `你是商業教練 AI。請基於會員的「目標落差」、「產品／服務」、「行銷漏斗階段」生成可執行的個人化行動建議，以 JSON 格式（鍵：precise_targets, referral_strategies, platform_tips, quick_actions）。

會員基本資料：
${JSON.stringify(userProfile || {}, null, 2)}

目標 vs 實績：
targets=${JSON.stringify(targets)}
actuals=${JSON.stringify(actuals)}
gaps=${JSON.stringify(gaps)}

產品／服務（最多 10 筆）：
${JSON.stringify(products.slice(0, 10))}

漏斗階段：
${JSON.stringify(funnel)}

請產出：
1) precise_targets：精準交流對象建議（包含產業、角色、線索來源、理由）
2) referral_strategies：提升發出／收到／確認引薦的策略（分步、可量化）
3) platform_tips：平台功能運用建議（例如：交流排程、名片、觸發器、內容發佈、AI畫像）
4) quick_actions：三個本週可執行的行動（含目標數量）
請確保是 JSON（不要多餘文字），每項 3-5 條且具體。`;
  return prompt;
}

function safeParseJSON(text) {
  try {
    const trimmed = (text || '').trim();
    if (!trimmed) return {};
    // 嘗試截取到第一個大括號與最後一個大括號之間
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate);
    }
    return JSON.parse(trimmed);
  } catch (e) {
    return {};
  }
}

async function generateStrategyRecommendations(userId, range = 'monthly') {
  // 會員基本資料（必要欄位）
  const userRes = await pool.query(
    `SELECT id, name, email, company, industry, title FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const userProfile = userRes.rows[0] || { id: userId };

  const metrics = await fetchActualsAndTargets(userId, range);
  const structures = await fetchProductsAndFunnel(userId);

  const prompt = buildStrategyPrompt(userProfile, { metrics, structures });
  const aiText = await geminiService.generateContent(prompt);
  const parsed = safeParseJSON(aiText);

  // 回傳整合建議
  return {
    success: true,
    userId,
    range,
    features: { metrics, structures },
    ai: parsed,
    raw: aiText,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateStrategyRecommendations
};