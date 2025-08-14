const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel } = require('../middleware/auth');

// 獲取所有申訴 - 僅限一級核心
router.get('/', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT c.*, u.name as submitter_name, u.email as submitter_email
      FROM complaints c
      LEFT JOIN users u ON c.submitter_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status && (status === 'read' || status === 'unread')) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // 處理匿名申訴的顯示
    const complaints = result.rows.map(complaint => ({
      ...complaint,
      submitter_name: complaint.is_anonymous ? '匿名用戶' : complaint.submitter_name,
      submitter_email: complaint.is_anonymous ? null : complaint.submitter_email
    }));
    
    res.json({
      success: true,
      complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: '獲取申訴列表失敗'
    });
  }
});

// 獲取申訴統計 - 僅限一級核心
router.get('/statistics', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM complaints
      GROUP BY status
    `);
    
    const stats = {
      total: 0,
      unread: 0,
      read: 0
    };
    
    result.rows.forEach(row => {
      stats.total += parseInt(row.count);
      stats[row.status] = parseInt(row.count);
    });
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching complaint statistics:', error);
    res.status(500).json({
      success: false,
      message: '獲取申訴統計失敗'
    });
  }
});

// 提交申訴 - 所有會員可用
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, is_anonymous } = req.body;
    const submitter_id = is_anonymous ? null : req.user.id;
    
    // 驗證內容
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '申訴內容不能為空'
      });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: '申訴內容不能超過2000字'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO complaints (submitter_id, content, is_anonymous, status)
       VALUES ($1, $2, $3, 'unread')
       RETURNING *`,
      [submitter_id, content.trim(), Boolean(is_anonymous)]
    );
    
    res.status(201).json({
      success: true,
      message: '申訴已提交，我們會盡快處理',
      complaint: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      message: '提交申訴失敗'
    });
  }
});

// 標記申訴為已讀 - 僅限一級核心
router.patch('/:id/read', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查申訴是否存在
    const existingComplaint = await pool.query(
      'SELECT id, status FROM complaints WHERE id = $1',
      [id]
    );
    
    if (existingComplaint.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申訴不存在'
      });
    }
    
    await pool.query(
      'UPDATE complaints SET status = $1 WHERE id = $2',
      ['read', id]
    );
    
    res.json({
      success: true,
      message: '申訴已標記為已讀'
    });
  } catch (error) {
    console.error('Error marking complaint as read:', error);
    res.status(500).json({
      success: false,
      message: '標記申訴失敗'
    });
  }
});

// 標記申訴為未讀 - 僅限一級核心
router.patch('/:id/unread', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查申訴是否存在
    const existingComplaint = await pool.query(
      'SELECT id, status FROM complaints WHERE id = $1',
      [id]
    );
    
    if (existingComplaint.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申訴不存在'
      });
    }
    
    await pool.query(
      'UPDATE complaints SET status = $1 WHERE id = $2',
      ['unread', id]
    );
    
    res.json({
      success: true,
      message: '申訴已標記為未讀'
    });
  } catch (error) {
    console.error('Error marking complaint as unread:', error);
    res.status(500).json({
      success: false,
      message: '標記申訴失敗'
    });
  }
});

// 刪除申訴 - 僅限一級核心
router.delete('/:id', authenticateToken, requireMembershipLevel(1), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查申訴是否存在
    const existingComplaint = await pool.query(
      'SELECT id FROM complaints WHERE id = $1',
      [id]
    );
    
    if (existingComplaint.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '申訴不存在'
      });
    }
    
    await pool.query('DELETE FROM complaints WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: '申訴已刪除'
    });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({
      success: false,
      message: '刪除申訴失敗'
    });
  }
});

module.exports = router;