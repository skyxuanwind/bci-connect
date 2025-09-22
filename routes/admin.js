const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendApprovalNotification } = require('../services/emailService');

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

    const user = result.rows[0];

    // 發送審核通過通知郵件
    try {
      await sendApprovalNotification({
        email: user.email,
        name: user.name,
        membershipLevel: user.membership_level
      });
      console.log(`Approval notification email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send approval notification email:', emailError);
      // 不因為郵件發送失敗而影響審核流程
    }

    res.json({
      message: '用戶審核通過，通知郵件已發送',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipLevel: user.membership_level,
        status: user.status
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

    // Delete the user record (或你 could set status to 'rejected')
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
             u.contact_number, u.membership_level, u.status, u.is_coach, u.created_at,
             u.profile_picture_url, u.nfc_card_id, u.coach_user_id, c.name as chapter_name,
             coach.name as coach_name
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN users coach ON u.coach_user_id = coach.id
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
        nfcCardId: user.nfc_card_id || null,
        isCoach: user.is_coach,
        coachUserId: user.coach_user_id,
        coachName: user.coach_name
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
      // Delete related data first (按依賴順序)
      // 1. 刪除 AI 通知相關
      const tbl_ai_notifications = await pool.query("SELECT to_regclass('public.ai_notifications') AS t");
      if (tbl_ai_notifications.rows[0]?.t) {
        await pool.query('DELETE FROM ai_notifications WHERE user_id = $1 OR related_user_id = $1', [id]);
      }
      
      // 2. 刪除 NFC 相關數據
      const tbl_nfc_card_visits = await pool.query("SELECT to_regclass('public.nfc_card_visits') AS t");
      if (tbl_nfc_card_visits.rows[0]?.t) {
        await pool.query('DELETE FROM nfc_card_visits WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)', [id]);
      }
      const tbl_nfc_card_content = await pool.query("SELECT to_regclass('public.nfc_card_content') AS t");
      if (tbl_nfc_card_content.rows[0]?.t) {
        await pool.query('DELETE FROM nfc_card_content WHERE card_id IN (SELECT id FROM nfc_cards WHERE user_id = $1)', [id]);
      }
      await pool.query('DELETE FROM nfc_cards WHERE user_id = $1', [id]);
      const tbl_nfc_card_collections = await pool.query("SELECT to_regclass('public.nfc_card_collections') AS t");
      if (tbl_nfc_card_collections.rows[0]?.t) {
        await pool.query('DELETE FROM nfc_card_collections WHERE user_id = $1', [id]);
      }
      
      // 3. 刪除數字錢包相關
      const tbl_scanned_business_cards = await pool.query("SELECT to_regclass('public.scanned_business_cards') AS t");
      if (tbl_scanned_business_cards.rows[0]?.t) {
        await pool.query('DELETE FROM scanned_business_cards WHERE user_id = $1', [id]);
      }
      
      // 4. 刪除會員活動和許願相關
      const tbl_member_activities = await pool.query("SELECT to_regclass('public.member_activities') AS t");
      if (tbl_member_activities.rows[0]?.t) {
        await pool.query('DELETE FROM member_activities WHERE user_id = $1', [id]);
      }
      const tbl_ai_matching_results = await pool.query("SELECT to_regclass('public.ai_matching_results') AS t");
      if (tbl_ai_matching_results.rows[0]?.t) {
        await pool.query('DELETE FROM ai_matching_results WHERE matched_user_id = $1', [id]);
      }
      const tbl_member_wishes = await pool.query("SELECT to_regclass('public.member_wishes') AS t");
      if (tbl_member_wishes.rows[0]?.t) {
        await pool.query('DELETE FROM member_wishes WHERE user_id = $1', [id]);
      }
      
      // 5. 刪除榮譽徽章
      const tbl_user_honor_badges = await pool.query("SELECT to_regclass('public.user_honor_badges') AS t");
      if (tbl_user_honor_badges.rows[0]?.t) {
        await pool.query('DELETE FROM user_honor_badges WHERE user_id = $1', [id]);
      }
      
      // 6. 刪除出席記錄
      const tbl_attendance_records = await pool.query("SELECT to_regclass('public.attendance_records') AS t");
      if (tbl_attendance_records.rows[0]?.t) {
        await pool.query('DELETE FROM attendance_records WHERE user_id = $1', [id]);
      }
      
      // 7. 刪除黑名單條目（如果是創建者）
      const tbl_blacklist_entries = await pool.query("SELECT to_regclass('public.blacklist_entries') AS t");
      if (tbl_blacklist_entries.rows[0]?.t) {
        await pool.query('DELETE FROM blacklist_entries WHERE created_by_id = $1', [id]);
      }
      
      // 8. 刪除原有的關聯數據
      const tbl_referrals = await pool.query("SELECT to_regclass('public.referrals') AS t");
      if (tbl_referrals.rows[0]?.t) {
        await pool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_to_id = $1', [id]);
      }
      const tbl_meetings = await pool.query("SELECT to_regclass('public.meetings') AS t");
      if (tbl_meetings.rows[0]?.t) {
        await pool.query('DELETE FROM meetings WHERE requester_id = $1 OR attendee_id = $1', [id]);
      }
      const tbl_user_ratings = await pool.query("SELECT to_regclass('public.user_ratings') AS t");
      if (tbl_user_ratings.rows[0]?.t) {
        await pool.query('DELETE FROM user_ratings WHERE rater_id = $1 OR ratee_id = $1', [id]);
      }
      await pool.query('DELETE FROM user_onboarding_tasks WHERE user_id = $1', [id]);
      const tbl_coach_member_relationships = await pool.query("SELECT to_regclass('public.coach_member_relationships') AS t");
      if (tbl_coach_member_relationships.rows[0]?.t) {
        await pool.query('DELETE FROM coach_member_relationships WHERE coach_id = $1 OR member_id = $1', [id]);
      }
      const tbl_event_registrations = await pool.query("SELECT to_regclass('public.event_registrations') AS t");
      if (tbl_event_registrations.rows[0]?.t) {
        await pool.query('DELETE FROM event_registrations WHERE user_id = $1', [id]);
        await pool.query('UPDATE event_registrations SET invited_by_id = NULL WHERE invited_by_id = $1', [id]);
      }
      
      // 8b. 清除申訴紀錄的提交者引用（nullable，避免 FK 違反）
      const tbl_complaints = await pool.query("SELECT to_regclass('public.complaints') AS t");
      if (tbl_complaints.rows[0]?.t) {
        await pool.query('UPDATE complaints SET submitter_id = NULL WHERE submitter_id = $1', [id]);
      }
      
      // 8c. 清除靜態內容的最後更新人引用（nullable，避免 FK 違反）
      const tbl_static_content = await pool.query("SELECT to_regclass('public.static_content') AS t");
      if (tbl_static_content.rows[0]?.t) {
        await pool.query('UPDATE static_content SET updated_by_id = NULL WHERE updated_by_id = $1', [id]);
      }
      
      const tbl_guest_registrations = await pool.query("SELECT to_regclass('public.guest_registrations') AS t");
      if (tbl_guest_registrations.rows[0]?.t) {
        await pool.query('DELETE FROM guest_registrations WHERE inviter_id = $1', [id]);
      }
      // event_votes 已做存在性保護
      const evCheck = await pool.query("SELECT to_regclass('public.event_votes') AS tbl");
      if (evCheck.rows[0]?.tbl) {
        await pool.query('DELETE FROM event_votes WHERE voter_id = $1', [id]);
      }
      const tbl_prospect_votes = await pool.query("SELECT to_regclass('public.prospect_votes') AS t");
      if (tbl_prospect_votes.rows[0]?.t) {
        await pool.query('DELETE FROM prospect_votes WHERE voter_id = $1', [id]);
        await pool.query('DELETE FROM prospect_votes WHERE prospect_id IN (SELECT id FROM prospects WHERE created_by_id = $1)', [id]);
      }
      const tbl_prospects = await pool.query("SELECT to_regclass('public.prospects') AS t");
      if (tbl_prospects.rows[0]?.t) {
        await pool.query('DELETE FROM prospects WHERE created_by_id = $1', [id]);
      }
      const tbl_transactions = await pool.query("SELECT to_regclass('public.transactions') AS t");
      if (tbl_transactions.rows[0]?.t) {
        await pool.query('DELETE FROM transactions WHERE created_by_id = $1', [id]);
      }
      
      // 8d. 商媒體內容與分析安全清理（兼容舊資料庫可能缺少 ON DELETE 條款）
      const tbl_business_media = await pool.query("SELECT to_regclass('public.business_media') AS t");
      if (tbl_business_media.rows[0]?.t) {
        // 若舊結構未設置 ON DELETE CASCADE，先手動刪除此講者的內容
        await pool.query('DELETE FROM business_media WHERE speaker_id = $1', [id]);
      }
      const tbl_business_media_analytics = await pool.query("SELECT to_regclass('public.business_media_analytics') AS t");
      if (tbl_business_media_analytics.rows[0]?.t) {
        // 目標會員為被刪除用戶時，設為 NULL 以避免 FK 阻擋
        await pool.query('UPDATE business_media_analytics SET target_member_id = NULL WHERE target_member_id = $1', [id]);
      }

      // 8e. 會議回饋（雙向問卷）清理（保險處理）
      const tbl_meeting_feedbacks = await pool.query("SELECT to_regclass('public.meeting_feedbacks') AS t");
      if (tbl_meeting_feedbacks.rows[0]?.t) {
        await pool.query('DELETE FROM meeting_feedbacks WHERE rater_id = $1 OR ratee_id = $1', [id]);
      }

      // 8f. 教練日誌清理（保險處理）
      const tbl_coach_logs = await pool.query("SELECT to_regclass('public.coach_logs') AS t");
      if (tbl_coach_logs.rows[0]?.t) {
        await pool.query('DELETE FROM coach_logs WHERE coach_id = $1 OR member_id = $1', [id]);
      }
      
      // 9. 更新其他用戶的教練關係（將此用戶作為教練的學員設為無教練）
      await pool.query('UPDATE users SET coach_user_id = NULL WHERE coach_user_id = $1', [id]);
      
      // 10. Finally delete the user
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
    res.status(500).json({ 
      message: '刪除用戶時發生錯誤',
      error: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      where: error.where
    });
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

// @route   GET /api/admin/coaches
// @desc    Get all users who are coaches
// @access  Private (Admin only)
router.get('/coaches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
             u.membership_level, u.profile_picture_url, c.name as chapter_name,
             COALESCE(cc.coachee_count, 0) AS coachee_count
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN (
        SELECT coach_user_id, COUNT(*) AS coachee_count
        FROM users
        WHERE coach_user_id IS NOT NULL
        GROUP BY coach_user_id
      ) cc ON cc.coach_user_id = u.id
      WHERE u.is_coach = TRUE
      ORDER BY u.name ASC
    `);

    res.json({
      coaches: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company,
        industry: row.industry,
        title: row.title,
        membershipLevel: row.membership_level,
        profilePictureUrl: row.profile_picture_url,
        chapterName: row.chapter_name,
        coacheeCount: parseInt(row.coachee_count, 10) || 0
      }))
    });
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ message: '獲取教練列表時發生錯誤' });
  }
});

// @route   PUT /api/admin/users/:id/coach
// @desc    Set or unset user as coach
// @access  Private (Admin only)
router.put('/users/:id/coach', async (req, res) => {
  try {
    const { id } = req.params;
    const { isCoach } = req.body;

    if (typeof isCoach !== 'boolean') {
      return res.status(400).json({ message: 'isCoach 參數必須為布林值' });
    }

    // Check user exists
    const userCheck = await pool.query('SELECT id, name, is_coach FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const result = await pool.query(
      'UPDATE users SET is_coach = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, is_coach',
      [isCoach, id]
    );

    res.json({
      message: isCoach ? '已設定為教練' : '已取消教練資格',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        isCoach: result.rows[0].is_coach
      }
    });
  } catch (error) {
    console.error('Update coach flag error:', error);
    res.status(500).json({ message: '更新教練狀態時發生錯誤' });
  }
});

// @route   PUT /api/admin/users/:id/assign-coach
// @desc    Assign a coach to a user (or remove by sending null)
// @access  Private (Admin only)
router.put('/users/:id/assign-coach', async (req, res) => {
  try {
    const { id } = req.params;
    let { coachUserId } = req.body;

    // Normalize null/undefined
    if (coachUserId === undefined) {
      return res.status(400).json({ message: '缺少 coachUserId 參數（可為數字或 null）' });
    }

    // Check user exists
    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    if (coachUserId === null) {
      const result = await pool.query(
        'UPDATE users SET coach_user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, coach_user_id',
        [id]
      );
      return res.json({
        message: '已移除教練指派',
        user: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          coachUserId: result.rows[0].coach_user_id
        }
      });
    }

    // Validate coachUserId
    if (!Number.isInteger(coachUserId)) {
      coachUserId = parseInt(coachUserId, 10);
      if (isNaN(coachUserId)) {
        return res.status(400).json({ message: 'coachUserId 必須為有效數字或 null' });
      }
    }

    if (coachUserId === parseInt(id, 10)) {
      return res.status(400).json({ message: '不可將自己指派為自己的教練' });
    }

    const coachCheck = await pool.query('SELECT id, name, is_coach FROM users WHERE id = $1', [coachUserId]);
    if (coachCheck.rows.length === 0) {
      return res.status(404).json({ message: '指定的教練用戶不存在' });
    }

    if (!coachCheck.rows[0].is_coach) {
      return res.status(400).json({ message: '指定的用戶尚未被設定為教練' });
    }

    const result = await pool.query(
      'UPDATE users SET coach_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, coach_user_id',
      [coachUserId, id]
    );

    res.json({
      message: '教練指派成功',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        coachUserId: result.rows[0].coach_user_id
      }
    });
  } catch (error) {
    console.error('Assign coach error:', error);
    res.status(500).json({ message: '指派教練時發生錯誤' });
  }
});

// @route   GET /api/admin/users/:id/coach
// @desc    Get assigned coach info for a user
// @access  Private (Admin only)
router.get('/users/:id/coach', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.coach_user_id, c.id as coach_id, c.name as coach_name, c.email as coach_email,
              c.company as coach_company, c.profile_picture_url as coach_profile_picture_url
       FROM users u
       LEFT JOIN users c ON u.coach_user_id = c.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const row = result.rows[0];
    res.json({
      coach: row.coach_user_id ? {
        id: row.coach_id,
        name: row.coach_name,
        email: row.coach_email,
        company: row.coach_company,
        profilePictureUrl: row.coach_profile_picture_url
      } : null
    });
  } catch (error) {
    console.error('Get user coach error:', error);
    res.status(500).json({ message: '獲取用戶教練資訊時發生錯誤' });
  }
});

// 臨時端點：重置教練密碼（僅用於測試）
router.post('/reset-coach-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const newPassword = 'coach123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, name, email',
      [hashedPassword, 'xuanowind@gmail.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        success: true,
        message: '密碼重置成功',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        newPassword: newPassword
      });
    } else {
      res.status(404).json({
        success: false,
        message: '找不到教練用戶'
      });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: '重置密碼失敗'
    });
  }
});

module.exports = router;