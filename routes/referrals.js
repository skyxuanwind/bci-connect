const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendReferralNotification } = require('../services/emailService');

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