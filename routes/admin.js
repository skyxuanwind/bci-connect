const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/pending-users
// @desc    Get all pending approval users
// @access  Private (Admin only)
router.get('/pending-users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title, 
              u.contact_number, u.created_at, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.status = 'pending_approval'
       ORDER BY u.created_at ASC`
    );

    res.json({
      pendingUsers: result.rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        industry: user.industry,
        title: user.title,
        contactNumber: user.contact_number,
        chapterName: user.chapter_name,
        createdAt: user.created_at
      }))
    });

  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: '獲取待審核用戶列表時發生錯誤' });
  }
});

// @route   PUT /api/admin/approve-user/:id
// @desc    Approve user and set membership level
// @access  Private (Admin only)
router.put('/approve-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { membershipLevel } = req.body;

    // Validate membership level
    if (!membershipLevel || ![1, 2, 3].includes(parseInt(membershipLevel))) {
      return res.status(400).json({ message: '請選擇有效的會員等級 (1, 2, 或 3)' });
    }

    // Check if user exists and is pending
    const userCheck = await pool.query(
      'SELECT id, status FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    if (userCheck.rows[0].status !== 'pending_approval') {
      return res.status(400).json({ message: '此用戶不在待審核狀態' });
    }

    // Generate QR code URL (placeholder for now)
    const qrCodeUrl = `https://bci-club.com/member/${id}`;

    // Update user status and membership level
    const result = await pool.query(
      `UPDATE users 
       SET status = 'active', 
           membership_level = $1, 
           qr_code_url = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, membership_level, status`,
      [parseInt(membershipLevel), qrCodeUrl, id]
    );

    res.json({
      message: '用戶審核通過',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        membershipLevel: result.rows[0].membership_level,
        status: result.rows[0].status
      }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: '審核用戶時發生錯誤' });
  }
});

// @route   PUT /api/admin/reject-user/:id
// @desc    Reject user application
// @access  Private (Admin only)
router.put('/reject-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if user exists and is pending
    const userCheck = await pool.query(
      'SELECT id, status FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    if (userCheck.rows[0].status !== 'pending_approval') {
      return res.status(400).json({ message: '此用戶不在待審核狀態' });
    }

    // Delete the user record (or you could set status to 'rejected')
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: '用戶申請已拒絕',
      reason: reason || '未提供拒絕原因'
    });

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: '拒絕用戶申請時發生錯誤' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      membershipLevel = 'all',
      chapterId = 'all',
      search = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (status !== 'all') {
      whereConditions.push(`u.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (membershipLevel !== 'all') {
      whereConditions.push(`u.membership_level = $${paramIndex}`);
      queryParams.push(parseInt(membershipLevel));
      paramIndex++;
    }

    if (chapterId !== 'all') {
      whereConditions.push(`u.chapter_id = $${paramIndex}`);
      queryParams.push(parseInt(chapterId));
      paramIndex++;
    }

    if (search.trim()) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.company ILIKE $${paramIndex})`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const totalUsers = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const usersQuery = `
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
             u.contact_number, u.membership_level, u.status, u.created_at,
             c.name as chapter_name
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const usersResult = await pool.query(usersQuery, queryParams);

    res.json({
      users: usersResult.rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        industry: user.industry,
        title: user.title,
        contactNumber: user.contact_number,
        membershipLevel: user.membership_level,
        status: user.status,
        chapterName: user.chapter_name,
        createdAt: user.created_at
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: '獲取用戶列表時發生錯誤' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status
// @access  Private (Admin only)
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'suspended', 'blacklisted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '無效的狀態值' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    res.json({
      message: '用戶狀態更新成功',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: '更新用戶狀態時發生錯誤' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get various statistics
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as pending FROM users WHERE status = $1', ['pending_approval']),
      pool.query('SELECT COUNT(*) as active FROM users WHERE status = $1', ['active']),
      pool.query('SELECT COUNT(*) as total FROM chapters'),
      pool.query(`
        SELECT membership_level, COUNT(*) as count 
        FROM users 
        WHERE status = 'active' AND membership_level IS NOT NULL
        GROUP BY membership_level
        ORDER BY membership_level
      `),
      pool.query(`
        SELECT c.name, COUNT(u.id) as member_count
        FROM chapters c
        LEFT JOIN users u ON c.id = u.chapter_id AND u.status = 'active'
        GROUP BY c.id, c.name
        ORDER BY member_count DESC
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(referral_amount), 0) as total_referral_amount,
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_referrals
        FROM referrals
      `)
    ]);

    const [totalUsers, pendingUsers, activeUsers, totalChapters, membershipLevels, chapterStats, referralStats] = stats;

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].total),
      pendingUsers: parseInt(pendingUsers.rows[0].pending),
      activeUsers: parseInt(activeUsers.rows[0].active),
      totalChapters: parseInt(totalChapters.rows[0].total),
      totalReferralAmount: parseFloat(referralStats.rows[0].total_referral_amount),
      totalReferrals: parseInt(referralStats.rows[0].total_referrals),
      confirmedReferrals: parseInt(referralStats.rows[0].confirmed_referrals),
      membershipLevelDistribution: membershipLevels.rows,
      chapterStatistics: chapterStats.rows
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: '獲取儀表板統計時發生錯誤' });
  }
});

module.exports = router;