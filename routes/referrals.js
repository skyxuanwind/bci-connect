const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireCoach, requireAdmin } = require('../middleware/auth');
const { sendReferralNotification } = require('../services/emailService');
const { AINotificationService } = require('../services/aiNotificationService');
const aiNotificationService = new AINotificationService();
const { encryptJSON, decryptJSON } = require('../services/cryptoService');
const { verifyTransaction } = require('../services/financeGateway');

const REFERRAL_BONUS_RATE = Number(process.env.REFERRAL_BONUS_RATE || 0.05);

// Helpers
const parseRange = (range) => {
  const now = new Date();
  let start = new Date(now);
  switch (String(range || 'monthly').toLowerCase()) {
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      break;
    }
    case 'semiannual':
      start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
      break;
    case 'annual':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { startISO: start.toISOString(), endISO: now.toISOString() };
};

// 創建引薦
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { referred_to_id, referral_amount, description } = req.body;
    const referrer_id = req.user.id;

    // 取消會員等級限制：任何會員皆可發起引薦

    // 檢查被引薦人是否存在且為活躍會員
    const referredCheck = await pool.query(
      'SELECT id, name, email, company FROM users WHERE id = $1 AND status = $2',
      [referred_to_id, 'active']
    );

    if (!referredCheck.rows[0]) {
      return res.status(404).json({ error: '被引薦會員不存在或非活躍狀態' });
    }

    // 檢查是否已有相同的引薦記錄
    const existingReferral = await pool.query(
      'SELECT id FROM referrals WHERE referrer_id = $1 AND referred_to_id = $2 AND status = $3',
      [referrer_id, referred_to_id, 'pending']
    );

    if (existingReferral.rows[0]) {
      return res.status(400).json({ error: '已有待處理的引薦記錄' });
    }

    // 創建引薦記錄
    const result = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_to_id, referral_amount, description, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [referrer_id, referred_to_id, referral_amount, description]
    );

    // 發送Email通知給被引薦人
    // 取得引薦者資訊（名稱、公司）
    const referrerInfo = await pool.query(
      'SELECT name, company FROM users WHERE id = $1',
      [referrer_id]
    );

    const referralData = {
      referrer_name: referrerInfo.rows[0]?.name || req.user.name,
      referrer_company: referrerInfo.rows[0]?.company || req.user.company,
      referred_name: referredCheck.rows[0].name,
      referred_email: referredCheck.rows[0].email,
      referral_amount: referral_amount,
      description: description
    };
    
    // 異步發送Email，不阻塞響應
    sendReferralNotification('new_referral', referralData).catch(err => {
      console.error('發送引薦通知Email失敗:', err);
    });

    res.status(201).json({
      message: '引薦已發送',
      referral: result.rows[0]
    });
  } catch (error) {
    console.error('創建引薦錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 人脈引薦：資源對接 + 完整流程（加密敏感資訊）
// body: { referred_to_id, prospect: { name, email, company, phone }, provider?: { name,email,company }, reason }
router.post('/network/create', authenticateToken, async (req, res) => {
  try {
    const referrer_id = req.user.id;
    const { referred_to_id, prospect = {}, provider = {}, reason = '' } = req.body;

    const referredCheck = await pool.query(
      'SELECT id, name, email, company FROM users WHERE id = $1 AND status = $2',
      [referred_to_id, 'active']
    );
    if (!referredCheck.rows[0]) {
      return res.status(404).json({ error: '被引薦會員不存在或非活躍狀態' });
    }

    const sensitive = encryptJSON({ prospect, provider, reason });

    const result = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_to_id, referral_amount, description, status, type, audit_status, sensitive_data_encrypted)
       VALUES ($1, $2, $3, $4, 'pending', 'network', 'pending', $5)
       RETURNING *`,
      [referrer_id, referred_to_id, 0, reason || '人脈引薦', sensitive]
    );

    // 審核紀錄：提交
    await pool.query(
      `INSERT INTO referral_audit_logs (referral_id, actor_id, action, notes)
       VALUES ($1, $2, 'submitted', $3)`,
      [result.rows[0].id, referrer_id, '提交人脈引薦']
    );

    const referrerInfo = await pool.query(
      'SELECT name, email, company FROM users WHERE id = $1',
      [referrer_id]
    );
    const referredInfo = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [referred_to_id]
    );

    const referralData = {
      referrer_name: referrerInfo.rows[0]?.name || req.user.name,
      referrer_company: referrerInfo.rows[0]?.company || req.user.company,
      referred_name: referredInfo.rows[0]?.name,
      referred_email: referredInfo.rows[0]?.email,
      prospect,
      provider,
      reason
    };
    sendReferralNotification('new_network_referral', referralData).catch(err => {
      console.error('發送人脈引薦通知Email失敗:', err);
    });

    res.status(201).json({ message: '人脈引薦已提交', referral: result.rows[0] });
  } catch (error) {
    console.error('人脈引薦提交錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

router.get('/network/recent', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const rows = await pool.query(
      `SELECT r.id, r.created_at, r.sensitive_data_encrypted, 
              u1.name AS referrer_name, u2.name AS referred_name
       FROM referrals r
       JOIN users u1 ON u1.id = r.referrer_id
       JOIN users u2 ON u2.id = r.referred_to_id
       WHERE r.type = 'network'
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    const items = rows.rows.map(r => {
      const s = decryptJSON(r.sensitive_data_encrypted) || {};
      const prospect = s.prospect || {};
      const provider = s.provider || {};
      return {
        id: r.id,
        ts: r.created_at,
        referrer: r.referrer_name,
        referred: r.referred_name,
        prospect: { name: prospect.name || null, company: prospect.company || null },
        provider: { name: provider.name || null, company: provider.company || null }
      };
    });
    res.json({ items });
  } catch (error) {
    console.error('獲取人脈引薦近期動態錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 成交引薦：建立交易並觸發金流驗證
// body: { referred_to_id, amount, currency, transactionId, reason }
router.post('/deal/create', authenticateToken, async (req, res) => {
  try {
    const referrer_id = req.user.id;
    const { referred_to_id, amount, currency = 'TWD', transactionId, reason = '' } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: '缺少有效成交金額' });
    }

    const referredCheck = await pool.query(
      'SELECT id, name, email, company FROM users WHERE id = $1 AND status = $2',
      [referred_to_id, 'active']
    );
    if (!referredCheck.rows[0]) {
      return res.status(404).json({ error: '被引薦會員不存在或非活躍狀態' });
    }

  const referralRes = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_to_id, referral_amount, description, status, type, deal_status, verified_currency)
       VALUES ($1, $2, $3, $4, 'pending', 'deal', 'verification_pending', $5)
       RETURNING *`,
      [referrer_id, referred_to_id, amount, reason || '成交引薦', currency]
    );
  const referral = referralRes.rows[0];

  await pool.query(
      `INSERT INTO referral_deals (referral_id, transaction_id, amount, currency)
       VALUES ($1, $2, $3, $4)`,
      [referral.id, transactionId || null, amount, currency]
  );

    // 若提供交易編號，嘗試即時驗證
    let verification = { verified: false, source: 'none' };
    if (transactionId) {
      verification = await verifyTransaction({ transactionId, amount, currency });
    }

  if (verification.verified) {
      const bonus = Number(amount) * REFERRAL_BONUS_RATE;
      await pool.query(
        `UPDATE referral_deals SET verified = TRUE, verified_at = CURRENT_TIMESTAMP, verification_source = $1, bonus_amount = $2 WHERE referral_id = $3`,
        [verification.source, bonus, referral.id]
      );
      await pool.query(
        `UPDATE referrals SET status = 'confirmed', deal_status = 'verified', verified_transaction_id = $1, verified_amount = $2, verified_at = CURRENT_TIMESTAMP, verification_source = $3 WHERE id = $4`,
        [transactionId, amount, verification.source, referral.id]
      );
    }

    res.status(201).json({ message: '成交引薦已建立', referralId: referral.id, verified: !!verification.verified });
  } catch (error) {
    console.error('成交引薦建立錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }

    // 發送Email給被引薦會員，請其確認成交引薦金額
    try {
      const referrerInfo = await pool.query(
        'SELECT name, company FROM users WHERE id = $1',
        [referrer_id]
      );
      const referredInfo = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [referred_to_id]
      );
      const referralData = {
        referrer_name: referrerInfo.rows[0]?.name || req.user.name,
        referrer_company: referrerInfo.rows[0]?.company || req.user.company,
        referred_name: referredInfo.rows[0]?.name,
        referred_email: referredInfo.rows[0]?.email,
        amount,
        currency,
        reason
      };
      sendReferralNotification('deal_amount_confirm', referralData).catch(err => {
        console.error('發送成交引薦金額確認Email失敗:', err);
      });
    } catch (mailErr) {
      console.error('成交引薦郵件流程錯誤:', mailErr);
    }
});

// 成交引薦驗證（補驗）
router.post('/deal/:id/verify', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ref = await pool.query('SELECT * FROM referrals WHERE id = $1 AND type = $2', [id, 'deal']);
    if (!ref.rows[0]) return res.status(404).json({ error: '引薦不存在或非成交類型' });
    const deal = await pool.query('SELECT * FROM referral_deals WHERE referral_id = $1', [id]);
    if (!deal.rows[0]) return res.status(404).json({ error: '找不到交易資料' });

    const { transaction_id, amount, currency } = deal.rows[0];
    const v = await verifyTransaction({ transactionId: transaction_id, amount, currency });
    if (!v.verified) {
      return res.status(400).json({ verified: false, reason: v.reason || '金流未通過驗證' });
    }
    const bonus = Number(amount) * REFERRAL_BONUS_RATE;
    await pool.query(
      `UPDATE referral_deals SET verified = TRUE, verified_at = CURRENT_TIMESTAMP, verification_source = $1, bonus_amount = $2 WHERE referral_id = $3`,
      [v.source, bonus, id]
    );
    const upd = await pool.query(
      `UPDATE referrals SET status = 'confirmed', deal_status = 'verified', verified_transaction_id = $1, verified_amount = $2, verified_at = CURRENT_TIMESTAMP, verification_source = $3 WHERE id = $4 RETURNING *`,
      [transaction_id, amount, v.source, id]
    );
    return res.json({ verified: true, referral: upd.rows[0], bonus });
  } catch (error) {
    console.error('成交引薦驗證錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 人脈引薦審核（教練或管理員）
router.post('/:id/audit', authenticateToken, requireCoach, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, notes = '' } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(String(action))) {
      return res.status(400).json({ error: '無效的審核動作' });
    }
    const refCheck = await pool.query('SELECT * FROM referrals WHERE id = $1', [id]);
    if (!refCheck.rows[0]) return res.status(404).json({ error: '引薦不存在' });
    if (refCheck.rows[0].type !== 'network') {
      return res.status(400).json({ error: '僅人脈引薦可審核' });
    }

    await pool.query('UPDATE referrals SET audit_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [action, id]);
    await pool.query(
      `INSERT INTO referral_audit_logs (referral_id, actor_id, action, notes) VALUES ($1, $2, $3, $4)`,
      [id, req.user.id, action, notes]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('人脈引薦審核錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 取回敏感資料（限引薦參與者或管理員/教練）
router.get('/:id/sensitive', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ref = await pool.query('SELECT * FROM referrals WHERE id = $1', [id]);
    if (!ref.rows[0]) return res.status(404).json({ error: '引薦不存在' });
    const r = ref.rows[0];
    const canAccess = (req.user.id === r.referrer_id) || (req.user.id === r.referred_to_id) || req.user.is_admin || req.user.is_coach;
    if (!canAccess) return res.status(403).json({ error: '無權存取敏感資訊' });
    const data = decryptJSON(r.sensitive_data_encrypted);
    res.json({ data: data || {} });
  } catch (error) {
    console.error('讀取敏感資料錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 引薦關係圖譜（nodes/edges）
router.get('/graph', authenticateToken, async (req, res) => {
  try {
    const type = String(req.query.type || 'all').toLowerCase();
    const params = [];
    let where = '1=1';
    if (['network','deal'].includes(type)) {
      params.push(type);
      where = 'type = $1';
    }
    const rows = (await pool.query(`
      SELECT r.referrer_id, r.referred_to_id, r.status, r.type,
             u1.name AS referrer_name, u2.name AS referred_name
      FROM referrals r
      JOIN users u1 ON r.referrer_id = u1.id
      JOIN users u2 ON r.referred_to_id = u2.id
      WHERE ${where}
    `, params)).rows;

    const nodesMap = new Map();
    const edgesMap = new Map();
    for (const row of rows) {
      if (!nodesMap.has(row.referrer_id)) nodesMap.set(row.referrer_id, { id: row.referrer_id, label: row.referrer_name });
      if (!nodesMap.has(row.referred_to_id)) nodesMap.set(row.referred_to_id, { id: row.referred_to_id, label: row.referred_name });
      const key = `${row.referrer_id}-${row.referred_to_id}`;
      const edge = edgesMap.get(key) || { from: row.referrer_id, to: row.referred_to_id, count: 0, confirmed: 0 };
      edge.count += 1;
      if (row.status === 'confirmed') edge.confirmed += 1;
      edgesMap.set(key, edge);
    }
    res.json({ nodes: Array.from(nodesMap.values()), edges: Array.from(edgesMap.values()) });
  } catch (error) {
    console.error('生成引薦關係圖錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 引薦成效分析與報表
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const range = String(req.query.range || 'monthly').toLowerCase();
    const type = String(req.query.type || 'all').toLowerCase();
    const { startISO, endISO } = parseRange(range);
    const params = [startISO, endISO];
    let where = 'created_at BETWEEN $1 AND $2';
    if (['network','deal'].includes(type)) {
      params.push(type);
      where += ` AND type = $3`;
    }
    const agg = await pool.query(`
      SELECT type,
             COUNT(*)::int AS total,
             COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int AS confirmed,
             COALESCE(SUM(CASE WHEN status = 'confirmed' THEN referral_amount ELSE 0 END), 0) AS confirmed_amount
      FROM referrals
      WHERE ${where}
      GROUP BY type
    `, params);

    // 詳細成交報表
    const deals = await pool.query(`
      SELECT d.referral_id, d.transaction_id, d.amount, d.currency, d.verified, d.verified_at, d.bonus_amount,
             r.referrer_id, r.referred_to_id
      FROM referral_deals d
      JOIN referrals r ON r.id = d.referral_id
      WHERE r.created_at BETWEEN $1 AND $2 ${['network','deal'].includes(type) ? ' AND r.type = $3' : ''}
      ORDER BY d.verified_at DESC NULLS LAST
    `, params);

    res.json({ range, summary: agg.rows, deals: deals.rows, bonusRate: REFERRAL_BONUS_RATE });
  } catch (error) {
    console.error('獲取引薦成效錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 獲取我收到的引薦請求
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, u.name as referrer_name, u.company as referrer_company
       FROM referrals r
       JOIN users u ON r.referrer_id = u.id
       WHERE r.referred_to_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('獲取引薦請求錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 獲取我發出的引薦請求
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, u.name as referred_name, u.company as referred_company
       FROM referrals r
       JOIN users u ON r.referred_to_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('獲取發出引薦錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 處理引薦請求（確認或拒絕）
router.put('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' or 'rejected'
    const userId = req.user.id;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '無效的狀態' });
    }

    // 檢查引薦是否存在且屬於當前用戶，並獲取引薦人信息
    const referralCheck = await pool.query(
      `SELECT r.*, u.name as referrer_name, u.email as referrer_email, u.company as referrer_company
       FROM referrals r
       JOIN users u ON r.referrer_id = u.id
       WHERE r.id = $1 AND r.referred_to_id = $2 AND r.status = $3`,
      [id, userId, 'pending']
    );

    if (!referralCheck.rows[0]) {
      return res.status(404).json({ error: '引薦記錄不存在或已處理' });
    }

    // 更新引薦狀態
    const result = await pool.query(
      `UPDATE referrals 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // 發送Email通知給引薦人
    const referral = referralCheck.rows[0];
    const notificationData = {
      referrer_name: referral.referrer_name,
      referrer_email: referral.referrer_email,
      referred_name: req.user.name,
      referral_amount: referral.referral_amount,
      description: referral.description
    };
    
    // 根據狀態發送不同的通知
    const notificationType = status === 'confirmed' ? 'referral_confirmed' : 'referral_rejected';
    
    // 異步發送Email，不阻塞響應
    sendReferralNotification(notificationType, notificationData).catch(err => {
      console.error('發送引薦回應通知Email失敗:', err);
    });

    // 授予徽章：首筆引薦成交（給引薦人）
    if (status === 'confirmed') {
      try {
        const referrerId = referral.referrer_id;
        // 計算此引薦人的已成交引薦數
        const cnt = await pool.query(
          `SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_id = $1 AND status = 'confirmed'`,
          [referrerId]
        );
        const confirmedCount = cnt.rows[0]?.c || 0;

        if (confirmedCount === 1) {
          // 這是該用戶的首筆成交引薦 → 授予徽章
          const badgeRes = await pool.query(`SELECT id, name FROM honor_badges WHERE code = $1`, ['referral_confirmed_first']);
          if (badgeRes.rows.length > 0) {
            const badgeId = badgeRes.rows[0].id;
            const insBadge = await pool.query(
              `INSERT INTO user_honor_badges (user_id, badge_id, source_type, source_id, notes)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id, badge_id) DO NOTHING
               RETURNING id`,
              [referrerId, badgeId, 'referral', parseInt(id, 10), '完成首筆成交引薦']
            );

            if (insBadge.rows.length > 0) {
              // 發送AI通知
              await aiNotificationService.createNotification(referrerId, 'badge_awarded', {
                title: '🎉 恭喜獲得榮譽徽章',
                content: `您完成了首筆成交引薦，獲得徽章「${badgeRes.rows[0].name}」！`,
                priority: 2
              });
            }
          }
        }
      } catch (badgeErr) {
        console.error('授予首筆引薦成交徽章失敗:', badgeErr);
      }
    }

    res.json({
      message: status === 'confirmed' ? '引薦已確認' : '引薦已拒絕',
      referral: result.rows[0]
    });
  } catch (error) {
    console.error('處理引薦請求錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 獲取引薦統計
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';

    if (isAdminUser) {
      // 管理員獲取全局統計
      const globalStats = await pool.query(`
        SELECT 
          COALESCE(SUM(referral_amount), 0) as total_referral_amount,
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_referrals
        FROM referrals
      `);
      
      res.json({
        totalReferralAmount: parseFloat(globalStats.rows[0].total_referral_amount),
        totalReferrals: parseInt(globalStats.rows[0].total_referrals),
        confirmedReferrals: parseInt(globalStats.rows[0].confirmed_referrals)
      });
    } else {
      // 普通用戶獲取個人統計和全局引薦金額
      const stats = await Promise.all([
        // 個人發出的引薦統計
        pool.query(
          `SELECT 
             COUNT(*) as total_sent,
             COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_sent,
             COALESCE(SUM(CASE WHEN status = 'confirmed' THEN referral_amount ELSE 0 END), 0) as total_amount_sent
           FROM referrals 
           WHERE referrer_id = $1`,
          [userId]
        ),
        // 個人收到的引薦統計
        pool.query(
          `SELECT 
             COUNT(*) as total_received,
             COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_received,
             COALESCE(SUM(CASE WHEN status = 'confirmed' THEN referral_amount ELSE 0 END), 0) as total_amount_received
           FROM referrals 
           WHERE referred_to_id = $1`,
          [userId]
        ),
        // 全局引薦金額統計
        pool.query(`
          SELECT COALESCE(SUM(referral_amount), 0) as total_referral_amount
          FROM referrals
        `)
      ]);

      const [sentStats, receivedStats, globalStats] = stats;

      res.json({
        totalReferralAmount: parseFloat(globalStats.rows[0].total_referral_amount),
        sent: {
          total: parseInt(sentStats.rows[0].total_sent),
          confirmed: parseInt(sentStats.rows[0].confirmed_sent),
          totalAmount: parseFloat(sentStats.rows[0].total_amount_sent)
        },
        received: {
          total: parseInt(receivedStats.rows[0].total_received),
          confirmed: parseInt(receivedStats.rows[0].confirmed_received),
          totalAmount: parseFloat(receivedStats.rows[0].total_amount_received)
        }
      });
    }
  } catch (error) {
    console.error('獲取引薦統計錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

module.exports = router;