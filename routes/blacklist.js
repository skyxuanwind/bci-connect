const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel } = require('../middleware/auth');

// 獲取黑名單條目列表 - 僅限核心
router.get('/', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT be.id, be.name, be.industry, be.company, be.contact_info, 
             be.reason, be.notes, be.created_at, be.updated_at,
             u.name as created_by_name
      FROM blacklist_entries be
      LEFT JOIN users u ON be.created_by_id = u.id
      ORDER BY be.updated_at DESC
    `);
    
    res.json({
      success: true,
      blacklistEntries: result.rows
    });
  } catch (error) {
    console.error('Error fetching blacklist entries:', error);
    res.status(500).json({
      success: false,
      message: '獲取黑名單失敗'
    });
  }
});

// 獲取已被列入黑名單的會員列表 - 僅限核心
router.get('/users', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title, 
             u.contact_number, c.name as chapter_name, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      WHERE u.status = 'blacklisted'
      ORDER BY u.updated_at DESC
    `);
    
    res.json({
      success: true,
      blacklistedUsers: result.rows
    });
  } catch (error) {
    console.error('Error fetching blacklisted users:', error);
    res.status(500).json({
      success: false,
      message: '獲取黑名單會員失敗'
    });
  }
});

// 新增黑名單條目 - 僅限核心
router.post('/add', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { name, industry, company, contact_info, reason, notes } = req.body;
    const created_by_id = req.user.id;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '姓名為必填項目'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO blacklist_entries (name, industry, company, contact_info, reason, notes, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, industry, company, contact_info, reason, notes, created_by_id]
    );
    
    res.json({
      success: true,
      message: `已將 ${name} 加入黑名單`,
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error adding blacklist entry:', error);
    res.status(500).json({
      success: false,
      message: '加入黑名單失敗'
    });
  }
});

// 將會員加入黑名單 - 僅限核心
router.post('/add/:userId', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // 檢查用戶是否存在
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    // 更新用戶狀態為黑名單
    await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['blacklisted', userId]
    );
    
    res.json({
      success: true,
      message: `已將 ${userCheck.rows[0].name} 加入黑名單`
    });
  } catch (error) {
    console.error('Error adding user to blacklist:', error);
    res.status(500).json({
      success: false,
      message: '加入黑名單失敗'
    });
  }
});

// 編輯黑名單條目 - 僅限核心
router.put('/edit/:entryId', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { entryId } = req.params;
    const { name, industry, company, contact_info, reason, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '姓名為必填項目'
      });
    }
    
    // 檢查條目是否存在
    const entryCheck = await pool.query('SELECT id, name FROM blacklist_entries WHERE id = $1', [entryId]);
    if (entryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '黑名單條目不存在'
      });
    }
    
    await pool.query(
      `UPDATE blacklist_entries 
       SET name = $1, industry = $2, company = $3, contact_info = $4, reason = $5, notes = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7`,
      [name, industry, company, contact_info, reason, notes, entryId]
    );
    
    res.json({
      success: true,
      message: `已更新 ${name} 的黑名單資訊`
    });
  } catch (error) {
    console.error('Error updating blacklist entry:', error);
    res.status(500).json({
      success: false,
      message: '更新黑名單失敗'
    });
  }
});

// 刪除黑名單條目 - 僅限核心
router.delete('/remove/:entryId', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { entryId } = req.params;
    
    // 檢查條目是否存在
    const entryCheck = await pool.query('SELECT id, name FROM blacklist_entries WHERE id = $1', [entryId]);
    if (entryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '黑名單條目不存在'
      });
    }
    
    await pool.query('DELETE FROM blacklist_entries WHERE id = $1', [entryId]);
    
    res.json({
      success: true,
      message: `已將 ${entryCheck.rows[0].name} 從黑名單移除`
    });
  } catch (error) {
    console.error('Error removing blacklist entry:', error);
    res.status(500).json({
      success: false,
      message: '從黑名單移除失敗'
    });
  }
});

// 從黑名單移除會員 - 僅限核心
router.post('/remove/:userId', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 檢查用戶是否存在且在黑名單中
    const userCheck = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND status = $2', 
      [userId, 'blacklisted']
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在或不在黑名單中'
      });
    }
    
    // 更新用戶狀態為活躍
    await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['active', userId]
    );
    
    res.json({
      success: true,
      message: `已將 ${userCheck.rows[0].name} 從黑名單移除`
    });
  } catch (error) {
    console.error('Error removing user from blacklist:', error);
    res.status(500).json({
      success: false,
      message: '從黑名單移除失敗'
    });
  }
});

module.exports = router;