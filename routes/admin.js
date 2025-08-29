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
    const queryParams = [];
    let paramIndex = 1;

    const whereConditions = [];

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
             u.profile_picture_url, u.nfc_card_id, c.name as chapter_name
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
        profilePictureUrl: user.profile_picture_url,
        chapterName: user.chapter_name,
        createdAt: user.created_at,
        nfcCardId: user.nfc_card_id || null
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

// @route   PUT /api/admin/users/:id/membership-level
// @desc    Update user membership level
// @access  Private (Admin only)
router.put('/users/:id/membership-level', async (req, res) => {
  try {
    const { id } = req.params;
    const { membershipLevel } = req.body;

    // Validate membership level
    if (!membershipLevel || ![1, 2, 3].includes(parseInt(membershipLevel))) {
      return res.status(400).json({ message: '請選擇有效的會員等級 (1, 2, 或 3)' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, name, membership_level FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const currentLevel = userCheck.rows[0].membership_level;
    const newLevel = parseInt(membershipLevel);

    if (currentLevel === newLevel) {
      return res.status(400).json({ message: '用戶已經是該等級' });
    }

    // Update membership level
    const result = await pool.query(
      'UPDATE users SET membership_level = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, membership_level',
      [newLevel, id]
    );

    res.json({
      message: '會員等級更新成功',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        membershipLevel: result.rows[0].membership_level
      }
    });

  } catch (error) {
    console.error('Update membership level error:', error);
    res.status(500).json({ message: '更新會員等級時發生錯誤' });
  }
});

// @route   PUT /api/admin/users/:id/nfc-card
// @desc    Update user's NFC card ID (admin only)
// @access  Private (Admin only)
router.put('/users/:id/nfc-card', async (req, res) => {
  try {
    const { id } = req.params;
    let { nfcCardId } = req.body;

    // Normalize input
    if (typeof nfcCardId === 'string') {
      nfcCardId = nfcCardId.toUpperCase().replace(/[^A-F0-9]/g, '');
      if (nfcCardId.length === 0) nfcCardId = null;
    } else if (nfcCardId !== null && nfcCardId !== undefined) {
      return res.status(400).json({ message: '無效的卡號格式' });
    }

    // Validate format if provided (accept 6-20 hex chars)
    if (nfcCardId && !/^[A-F0-9]{6,20}$/.test(nfcCardId)) {
      return res.status(400).json({ message: '請輸入有效的十六進制卡號（6-20位）' });
    }

    // Check user exists
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    // Duplicate check when setting a new card
    if (nfcCardId) {
      const dupCheck = await pool.query(
        'SELECT id, name FROM users WHERE nfc_card_id = $1 AND id <> $2',
        [nfcCardId, id]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({ message: `該卡號已綁定至其他會員：${dupCheck.rows[0].name}` });
      }
    }

    const result = await pool.query(
      'UPDATE users SET nfc_card_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, nfc_card_id',
      [nfcCardId, id]
    );

    res.json({
      message: nfcCardId ? 'NFC 卡號更新成功' : '已清除 NFC 卡號',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        nfcCardId: result.rows[0].nfc_card_id
      }
    });
  } catch (error) {
    console.error('Update user NFC card error:', error);
    res.status(500).json({ message: '更新 NFC 卡號時發生錯誤' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user account
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const user = userCheck.rows[0];

    // Prevent deleting admin user (id = 1)
    if (parseInt(id) === 1) {
      return res.status(403).json({ message: '無法刪除系統管理員帳號' });
    }

    // Start transaction to delete user and related data
    await pool.query('BEGIN');

    try {
      // Delete related data first (foreign key constraints)
      await pool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_to_id = $1', [id]);
      await pool.query('DELETE FROM meetings WHERE requester_id = $1 OR attendee_id = $1', [id]);
      await pool.query('DELETE FROM event_registrations WHERE user_id = $1', [id]);
      await pool.query('DELETE FROM guest_registrations WHERE inviter_id = $1', [id]);
      await pool.query('DELETE FROM prospect_votes WHERE voter_id = $1', [id]);
      await pool.query('DELETE FROM prospects WHERE created_by_id = $1', [id]);
      await pool.query('DELETE FROM transactions WHERE created_by_id = $1', [id]);
      
      // Finally delete the user
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      
      await pool.query('COMMIT');

      res.json({
        message: `用戶 ${user.name} (${user.email}) 已成功刪除`,
        deletedUser: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });

    } catch (deleteError) {
      await pool.query('ROLLBACK');
      throw deleteError;
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: '刪除用戶時發生錯誤' });
  }
});

// @route   POST /api/admin/create-test-accounts
// @desc    Create test accounts in production environment
// @access  Private (Admin only)
router.post('/create-test-accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 只允許在生產環境執行
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({ 
        success: false, 
        message: '此功能僅在生產環境可用' 
      });
    }

    // 只允許系統管理員（ID為1）執行
    if (req.user.id !== 1) {
      return res.status(403).json({ 
        success: false, 
        message: '只有系統管理員可以創建測試帳號' 
      });
    }

    const { createTestUsers } = require('../scripts/create-test-users-production');
    
    // 執行測試帳號創建
    await createTestUsers();
    
    res.json({ 
      success: true, 
      message: '測試帳號創建成功',
      accounts: [
        { name: '張志明', email: 'test1@example.com', company: '創新科技有限公司' },
        { name: '李美華', email: 'test2@example.com', company: '綠能環保股份有限公司' },
        { name: '王建國', email: 'test3@example.com', company: '精品餐飲集團' },
        { name: '陳淑芬', email: 'test4@example.com', company: '健康生活顧問公司' },
        { name: '林志偉', email: 'test5@example.com', company: '數位行銷策略公司' }
      ],
      password: 'test123456'
    });
    
  } catch (error) {
    console.error('創建測試帳號錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '創建測試帳號失敗', 
      error: error.message 
    });
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