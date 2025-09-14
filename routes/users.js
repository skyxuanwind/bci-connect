const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel, requireCoach } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const { AINotificationService } = require('../services/aiNotificationService');

const router = express.Router();
const aiNotificationService = new AINotificationService();

// Configure multer for avatar upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件'), false);
    }
  }
});

// 獲取用戶公開資訊 (不需要認證)
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, name, company, title, mbti, mbti_public
       FROM users 
       WHERE id = $1 AND status = 'active'`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在或未啟用'
      });
    }
    
    const row = result.rows[0];
    const user = {
      id: row.id,
      name: row.name,
      company: row.company,
      title: row.title
    };
    if (row.mbti_public) {
      user.mbti = row.mbti;
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching public user info:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶資訊失敗'
    });
  }
});

// Apply authentication to all routes below
router.use(authenticateToken);

// 新增：儲存 MBTI 測評結果
// @route   POST /api/users/mbti-type
// @desc    Save MBTI assessment result to users.mbti_type
// @access  Private
router.post('/mbti-type', async (req, res) => {
  try {
    const { mbtiType } = req.body;
    if (!mbtiType || typeof mbtiType !== 'string') {
      return res.status(400).json({ message: '缺少 mbtiType' });
    }
    const type = mbtiType.trim().toUpperCase();
    // 基本格式驗證：長度 4，且每個維度只允許特定字母
    const isValid = type.length === 4 &&
      'EI'.includes(type[0]) &&
      'SN'.includes(type[1]) &&
      'TF'.includes(type[2]) &&
      'JP'.includes(type[3]);
    if (!isValid) {
      return res.status(400).json({ message: 'mbtiType 格式不正確' });
    }

    const update = await pool.query(
      `UPDATE users SET mbti_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, mbti_type`,
      [type, req.user.id]
    );

    return res.json({ success: true, mbtiType: update.rows[0]?.mbti_type || type, message: 'MBTI 測評結果已儲存' });
  } catch (err) {
    console.error('Save MBTI type error:', err);
    return res.status(500).json({ message: '儲存 MBTI 結果失敗' });
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
              u.profile_picture_url, u.contact_number, u.membership_level,
              u.status, u.qr_code_url, u.interview_form, u.created_at,
              u.mbti, u.mbti_public, u.mbti_type,
              c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const user = result.rows[0];

    // Safely parse interview_form
    let interviewForm = null;
    if (user.interview_form) {
      try {
        if (typeof user.interview_form === 'string') {
          interviewForm = JSON.parse(user.interview_form);
        } else if (typeof user.interview_form === 'object') {
          interviewForm = user.interview_form;
        }
      } catch (parseError) {
        console.error('Interview form parsing error:', parseError, 'Raw data:', user.interview_form);
        interviewForm = null;
      }
    }

    res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        industry: user.industry,
        title: user.title,
        profilePictureUrl: user.profile_picture_url,
        contactNumber: user.contact_number,
        membershipLevel: user.membership_level,
        status: user.status,
        qrCodeUrl: `/api/qrcode/member/${user.id}`,
        interviewForm: interviewForm,
        chapterName: user.chapter_name,
        createdAt: user.created_at,
        mbti: user.mbti,
        mbtiPublic: user.mbti_public,
        mbtiType: user.mbti_type || null
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: '獲取個人資料時發生錯誤' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', upload.single('avatar'), async (req, res) => {
  try {
    const {
      name,
      company,
      industry,
      title,
      contactNumber,
      mbti,
      mbtiPublic
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '姓名為必填項目' });
    }

    // Handle avatar upload
    let profilePictureUrl = null;
    if (req.file) {
      try {
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'bci-connect/avatars',
              transformation: [
                { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        profilePictureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Avatar upload error:', uploadError);
        // Continue without updating avatar if upload fails
        console.log('Continuing profile update without avatar change due to upload error');
      }
    }

    // Normalize inputs
    const mbtiValue = (mbti && typeof mbti === 'string') ? mbti.trim().toUpperCase() : null;
    const mbtiPublicValue = typeof mbtiPublic === 'string' ? (mbtiPublic === 'true') : !!mbtiPublic;

    // Update user profile
    const updateQuery = profilePictureUrl 
      ? `UPDATE users 
         SET name = $1, company = $2, industry = $3, title = $4, 
             contact_number = $5, profile_picture_url = $6, mbti = $7, mbti_public = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING id, name, company, industry, title, contact_number, profile_picture_url, mbti, mbti_public`
      : `UPDATE users 
         SET name = $1, company = $2, industry = $3, title = $4, 
             contact_number = $5, mbti = $6, mbti_public = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING id, name, company, industry, title, contact_number, profile_picture_url, mbti, mbti_public`;
    
    const updateParams = profilePictureUrl 
      ? [
          name.trim(),
          company?.trim() || null,
          industry?.trim() || null,
          title?.trim() || null,
          contactNumber?.trim() || null,
          profilePictureUrl,
          mbtiValue,
          mbtiPublicValue,
          req.user.id
        ]
      : [
          name.trim(),
          company?.trim() || null,
          industry?.trim() || null,
          title?.trim() || null,
          contactNumber?.trim() || null,
          mbtiValue,
          mbtiPublicValue,
          req.user.id
        ];

    const result = await pool.query(updateQuery, updateParams);

    res.json({
      message: '個人資料更新成功',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: '更新個人資料時發生錯誤' });
  }
});

// @route   PUT /api/users/interview-form
// @desc    Update user interview form
// @access  Private
router.put('/interview-form', async (req, res) => {
  try {
    const {
      companyName,
      brandLogo,
      industry,
      coreServices,
      competitiveAdvantage,
      targetMarket,
      idealCustomer,
      customerExamples,
      customerTraits,
      customerPainPoints,
      referralTrigger,
      referralOpening,
      referralProblem,
      qualityReferral,
      unsuitableReferral,
      partnerTypes,
      businessGoals,
      personalInterests
    } = req.body;

    // 準備面談表單數據
    const interviewFormData = {
      companyName: companyName?.trim() || null,
      brandLogo: brandLogo?.trim() || null,
      industry: industry?.trim() || null,
      coreServices: coreServices?.trim() || null,
      competitiveAdvantage: competitiveAdvantage?.trim() || null,
      targetMarket: targetMarket?.trim() || null,
      idealCustomer: idealCustomer?.trim() || null,
      customerExamples: customerExamples?.trim() || null,
      customerTraits: customerTraits?.trim() || null,
      customerPainPoints: customerPainPoints?.trim() || null,
      referralTrigger: referralTrigger?.trim() || null,
      referralOpening: referralOpening?.trim() || null,
      referralProblem: referralProblem?.trim() || null,
      qualityReferral: qualityReferral?.trim() || null,
      unsuitableReferral: unsuitableReferral?.trim() || null,
      partnerTypes: partnerTypes?.trim() || null,
      businessGoals: businessGoals?.trim() || null,
      personalInterests: personalInterests?.trim() || null
    };

    // 更新用戶的面談表單數據
    const updateQuery = `
      UPDATE users 
      SET interview_form = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, company, industry, title, contact_number, profile_picture_url, membership_level, status, nfc_card_id, interview_form
    `;
    
    const result = await pool.query(updateQuery, [
      JSON.stringify(interviewFormData),
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    const user = result.rows[0];
    user.interviewForm = user.interview_form;
    delete user.interview_form;

    res.json({
      message: '面談表單儲存成功',
      user: user
    });

  } catch (error) {
    console.error('Update interview form error:', error);
    res.status(500).json({ message: '儲存面談表單時發生錯誤' });
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '請提供當前密碼和新密碼' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密碼長度至少需要6個字符' });
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: '當前密碼錯誤' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: '密碼更新成功' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: '更新密碼時發生錯誤' });
  }
});

// @route   GET /api/users/members
// @desc    Get members list based on user's membership level
// @access  Private
router.get('/members', async (req, res) => {
  try {
    const { page = 1, limit = 20, chapterId = 'all', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 取消會員等級限制：所有會員皆可查看所有等級
    let whereConditions = [
      'u.status = $1',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`  // 排除系統管理員
    ];
    let queryParams = ['active'];
    let paramIndex = 2;

    if (chapterId !== 'all') {
      whereConditions.push(`u.chapter_id = $${paramIndex}`);
      queryParams.push(parseInt(chapterId));
      paramIndex++;
    }

    if (search.trim()) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.company ILIKE $${paramIndex} OR u.industry ILIKE $${paramIndex} OR u.title ILIKE $${paramIndex})`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalMembers = parseInt(countResult.rows[0].total);

    // Get members with pagination
    const membersQuery = `
      SELECT u.id, u.name, u.company, u.industry, u.title,
             u.profile_picture_url, u.contact_number, u.membership_level,
             u.interview_form, c.name as chapter_name
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      ${whereClause}
      ORDER BY u.membership_level ASC, u.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit), offset);
    const membersResult = await pool.query(membersQuery, queryParams);

    res.json({
      members: membersResult.rows.map(member => ({
        id: member.id,
        name: member.name,
        company: member.company,
        industry: member.industry,
        title: member.title,
        profilePictureUrl: member.profile_picture_url,
        contactNumber: member.contact_number,
        membershipLevel: member.membership_level,
        chapterName: member.chapter_name,
        interviewData: member.interview_form ? true : false
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMembers / parseInt(limit)),
        totalMembers,
        limit: parseInt(limit)
      },
      userAccessLevel: req.user.membership_level
    });

  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ message: '獲取會員資料時發生錯誤' });
  }
});

// 新增：我的學員列表（教練專用）
// @route   GET /api/users/my-coachees
// @desc    列出指派給目前教練的學員（支援搜尋與分頁）
// @access  Private (Coach or Admin)
router.get('/my-coachees', requireCoach, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [
      'u.status = $1',
      'u.coach_user_id = $2',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`
    ];
    let params = ['active', req.user.id];
    let idx = 3;

    if (search && search.trim()) {
      whereConditions.push(`(u.name ILIKE $${idx} OR u.company ILIKE $${idx} OR u.title ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const listQuery = `
      SELECT u.id, u.name, u.company, u.industry, u.title,
             u.profile_picture_url, u.contact_number, u.membership_level,
             u.interview_form, c.name as chapter_name,
             COALESCE(t.pending_tasks, 0) AS pending_tasks,
             COALESCE(t.in_progress_tasks, 0) AS in_progress_tasks,
             COALESCE(t.completed_tasks, 0) AS completed_tasks,
             COALESCE(t.overdue_tasks, 0) AS overdue_tasks
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN (
        SELECT user_id,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
               SUM(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue_tasks
        FROM user_onboarding_tasks
        GROUP BY user_id
      ) t ON t.user_id = u.id
      ${whereClause}
      ORDER BY u.name ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), offset);

    const listResult = await pool.query(listQuery, params);

    res.json({
      coachees: listResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        company: row.company,
        industry: row.industry,
        title: row.title,
        profilePictureUrl: row.profile_picture_url,
        contactNumber: row.contact_number,
        membershipLevel: row.membership_level,
        chapterName: row.chapter_name,
        interviewData: row.interview_form ? true : false,
        taskCounts: {
          pending: Number(row.pending_tasks || 0),
          inProgress: Number(row.in_progress_tasks || 0),
          completed: Number(row.completed_tasks || 0),
          overdue: Number(row.overdue_tasks || 0)
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalMembers: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get coachees error:', error);
    res.status(500).json({ message: '獲取學員列表時發生錯誤' });
  }
});

// @route   GET /api/users/my-coachees/task-stats
// @access  Private (Coach or Admin)
router.get('/my-coachees/task-stats', requireCoach, async (req, res) => {
  try {
    const isAdmin = !!req.user.is_admin;
    const coachId = req.user.id;

    const statsQuery = `
      SELECT
        COUNT(t.id) AS total,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status <> 'completed' THEN 1 ELSE 0 END) AS overdue
      FROM user_onboarding_tasks t
      JOIN users u ON u.id = t.user_id
      WHERE u.status = 'active' ${isAdmin ? '' : 'AND u.coach_user_id = $1'}
    `;

    const args = isAdmin ? [] : [coachId];
    const result = await pool.query(statsQuery, args);
    const row = result.rows[0] || {};

    res.json({
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      inProgress: Number(row.in_progress || 0),
      completed: Number(row.completed || 0),
      overdue: Number(row.overdue || 0)
    });
  } catch (error) {
    console.error('Get my-coachees task stats error:', error);
    res.status(500).json({ message: '取得任務統計時發生錯誤' });
  }
});

// @route   GET /api/users/member/:id/interview
// @desc    Get member interview form by ID (based on access level)
// @access  Private
router.get('/member/:id/interview', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.name, u.company, u.industry, u.title,
              u.profile_picture_url, u.membership_level, u.interview_form,
              c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在或未啟用' });
    }

    const member = result.rows[0];

    // Check if interview form exists
    if (!member.interview_form) {
      return res.status(404).json({ message: '此會員尚未填寫面談表' });
    }

    // Safely parse interview_form
    let interviewForm = null;
    try {
      if (typeof member.interview_form === 'string') {
        interviewForm = JSON.parse(member.interview_form);
      } else if (typeof member.interview_form === 'object') {
        interviewForm = member.interview_form;
      }
    } catch (parseError) {
      console.error('Interview form parsing error:', parseError, 'Raw data:', member.interview_form);
      return res.status(500).json({ message: '面談表資料格式錯誤' });
    }

    if (!interviewForm) {
      return res.status(404).json({ message: '此會員尚未填寫面談表' });
    }

    res.json({
      member: {
        id: member.id,
        name: member.name,
        company: member.company,
        industry: member.industry,
        title: member.title,
        profilePictureUrl: member.profile_picture_url,
        membershipLevel: member.membership_level,
        chapterName: member.chapter_name
      },
      interviewForm
    });

  } catch (error) {
    console.error('Get member interview error:', error);
    res.status(500).json({ message: '獲取會員面談表時發生錯誤' });
  }
});

// @route   GET /api/users/member/:id
// @desc    Get member details by ID (based on access level)
// @access  Private
router.get('/member/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
              u.profile_picture_url, u.contact_number, u.membership_level,
              u.qr_code_url, u.coach_user_id, u.created_at, u.interview_form, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在或未啟用' });
    }

    const member = result.rows[0];

    res.json({
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        company: member.company,
        industry: member.industry,
        title: member.title,
        profilePictureUrl: member.profile_picture_url,
        contactNumber: member.contact_number,
        membershipLevel: member.membership_level,
        qrCodeUrl: `/api/qrcode/member/${member.id}`,
        chapterName: member.chapter_name,
        createdAt: member.created_at,
        coachUserId: member.coach_user_id,
        interviewData: !!member.interview_form
      }
    });

  } catch (error) {
    console.error('Get member details error:', error);
    res.status(500).json({ message: '獲取會員詳細資料時發生錯誤' });
  }
});

// -------- Onboarding Tasks Endpoints (for MemberDetail page) --------
// GET: 列出學員的入職任務（任何登入者可見）
router.get('/member/:id/onboarding-tasks', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });

    const result = await pool.query(
      `SELECT id, user_id, title, description, status, due_date, completed_at, created_at
       FROM user_onboarding_tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [memberId]
    );

    const tasks = result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      dueDate: r.due_date,
      completedAt: r.completed_at,
      createdAt: r.created_at
    }));

    res.json({ tasks });
  } catch (error) {
    console.error('Get onboarding tasks error:', error);
    res.status(500).json({ message: '獲取入職任務時發生錯誤' });
  }
});

// POST: 新增學員的入職任務（僅教練或管理員）
router.post('/member/:id/onboarding-tasks', requireCoach, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });

    const { title, description, dueDate } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: '請提供任務標題' });
    }

    const trimmedTitle = title.trim().slice(0, 200);
    const desc = typeof description === 'string' ? description : null;
    let due = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: '截止日期格式不正確' });
      }
      due = d.toISOString();
    }

    // 權限驗證：教練只能指派給自己的學員；管理員不受限制
    const isAdmin = !!req.user.is_admin;
    if (!isAdmin) {
      const checkRes = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND coach_user_id = $2 AND status = 'active'`,
        [memberId, req.user.id]
      );
      if (checkRes.rows.length === 0) {
        return res.status(403).json({ message: '僅能為指派給您的學員新增任務' });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO user_onboarding_tasks (user_id, title, description, due_date, created_by_coach_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, title, description, status, due_date, completed_at, created_at`,
      [memberId, trimmedTitle, desc, due, req.user.id]
    );

    const r = insertRes.rows[0];
    const task = {
      id: r.id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      dueDate: r.due_date,
      completedAt: r.completed_at,
      createdAt: r.created_at
    };

    res.json({ message: '任務已新增', task });
  } catch (error) {
    console.error('Create onboarding task error:', error);
    res.status(500).json({ message: '新增入職任務時發生錯誤' });
  }
});

// PUT: 更新任務狀態（本人、其教練或管理員可更新）
router.put('/onboarding-tasks/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { status } = req.body || {};
    if (!Number.isInteger(taskId)) return res.status(400).json({ message: '任務 ID 無效' });
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '狀態不正確' });
    }

    // 取得任務及會員資料
    const taskRes = await pool.query(
      `SELECT t.*, u.name as member_name, u.coach_user_id
       FROM user_onboarding_tasks t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) return res.status(404).json({ message: '任務不存在' });
    const taskRow = taskRes.rows[0];

    // 權限：本人、其教練或管理員
    const isOwner = taskRow.user_id === req.user.id;
    const isCoach = !!req.user.is_coach && req.user.id === taskRow.coach_user_id;
    const isAdmin = !!req.user.is_admin;
    if (!(isOwner || isCoach || isAdmin)) {
      return res.status(403).json({ message: '沒有權限更新此任務' });
    }

    // 更新任務狀態
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    const updateRes = await pool.query(
      `UPDATE user_onboarding_tasks
       SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, user_id, title, description, status, due_date, completed_at, created_at`,
      [status, completedAt, taskId]
    );

    const r = updateRes.rows[0];
    const updatedTask = {
      id: r.id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      status: r.status,
      dueDate: r.due_date,
      completedAt: r.completed_at,
      createdAt: r.created_at
    };

    // 事件觸發：完成任務時
    if (status === 'completed') {
      try {
        // 建立教練紀錄（若有教練）
        const coachId = taskRow.coach_user_id || (req.user.is_coach ? req.user.id : null);
        if (coachId) {
          await pool.query(
            `INSERT INTO coach_logs (coach_id, member_id, content) VALUES ($1, $2, $3)`,
            [coachId, taskRow.user_id, `【系統】會員 ${taskRow.member_name} 完成任務：「${taskRow.title}」`]
          );
        }

        // 通知：發送任務完成通知給學員
        await aiNotificationService.createNotification(
          taskRow.user_id,
          'task_completed',
          {
            title: '✅ 任務已完成',
            content: `您已完成任務：「${taskRow.title}」。`,
            priority: 1
          }
        );

        // 通知：發送任務完成通知給教練
        if (taskRow.coach_user_id) {
          await aiNotificationService.createNotification(
            taskRow.coach_user_id,
            'member_task_completed',
            {
              title: '🎉 學員完成任務',
              content: `您的學員 ${taskRow.member_name} 已完成任務：「${taskRow.title}」。`,
              relatedUserId: taskRow.user_id,
              priority: 1
            }
          );
        }

        // 授予榮譽徽章：首個任務完成
        try {
          const countRes = await pool.query(
            `SELECT COUNT(*)::int AS cnt FROM user_onboarding_tasks WHERE user_id = $1 AND status = 'completed'`,
            [taskRow.user_id]
          );
          const completedCount = countRes.rows[0]?.cnt || 0;
          if (completedCount === 1) {
            const badgeRes = await pool.query(`SELECT id, name FROM honor_badges WHERE code = $1`, ['first_task_completed']);
            if (badgeRes.rows.length > 0) {
              const badgeId = badgeRes.rows[0].id;
              const insBadge = await pool.query(
                `INSERT INTO user_honor_badges (user_id, badge_id, source_type, source_id, notes)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, badge_id) DO NOTHING
                 RETURNING id`,
                [taskRow.user_id, badgeId, 'onboarding_task', taskRow.id, `完成首個任務：「${taskRow.title}」`]
              );
              if (insBadge.rows.length > 0) {
                await aiNotificationService.createNotification(
                  taskRow.user_id,
                  'badge_awarded',
                  {
                    title: '🏅 獲得榮譽徽章',
                    content: '恭喜！您已獲得「首個任務完成」徽章。',
                    priority: 1
                  }
                );
              }
            }
          }
        } catch (badgeErr) {
          console.error('授予首個任務完成徽章失敗:', badgeErr);
        }

        // 若為 GBC 深度交流表，觸發 AI 掃描與智慧引薦 + 授予徽章
        const isGbc = typeof taskRow.title === 'string' && taskRow.title.includes('GBC 深度交流表');
        if (isGbc) {
          try {
            await aiNotificationService.scanAndNotifyOpportunities(taskRow.user_id);
          } catch (scanErr) {
            console.error('AI 掃描與智慧引薦失敗:', scanErr);
          }
          // 授予 GBC 檔案完成徽章
          try {
            const badgeRes2 = await pool.query(`SELECT id, name FROM honor_badges WHERE code = $1`, ['gbc_profile_complete']);
            if (badgeRes2.rows.length > 0) {
              const badgeId2 = badgeRes2.rows[0].id;
              const insBadge2 = await pool.query(
                `INSERT INTO user_honor_badges (user_id, badge_id, source_type, source_id, notes)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, badge_id) DO NOTHING
                 RETURNING id`,
                [taskRow.user_id, badgeId2, 'onboarding_task', taskRow.id, '完成 GBC 深度交流表']
              );
              if (insBadge2.rows.length > 0) {
                await aiNotificationService.createNotification(
                  taskRow.user_id,
                  'badge_awarded',
                  {
                    title: '🏅 獲得榮譽徽章',
                    content: '恭喜！您已獲得「GBC 檔案完成」徽章。',
                    priority: 1
                  }
                );
              }
            }
          } catch (gbcBadgeErr) {
            console.error('授予 GBC 檔案完成徽章失敗:', gbcBadgeErr);
          }
        }
      } catch (evtErr) {
        console.error('完成任務事件觸發失敗:', evtErr);
      }
    }

    res.json({ message: '任務已更新', task: updatedTask });
  } catch (error) {
    console.error('Update onboarding task error:', error);
    res.status(500).json({ message: '更新入職任務時發生錯誤' });
  }
});

// -------- Coach Logs Endpoints (for MemberDetail page) --------
// GET: 取得學員的教練紀錄（本人可見；其教練與管理員可見）
router.get('/member/:id/coach-logs', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });

    const userRes = await pool.query('SELECT coach_user_id FROM users WHERE id = $1', [memberId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: '會員不存在' });
    const coachUserId = userRes.rows[0].coach_user_id;

    const allow = req.user.id === memberId || !!req.user.is_admin || (coachUserId && req.user.id === coachUserId);
    if (!allow) return res.status(403).json({ message: '沒有權限查看教練紀錄' });

    const logsRes = await pool.query(
      `SELECT cl.id, cl.content, cl.created_at, u.name AS coach_name
       FROM coach_logs cl
       JOIN users u ON u.id = cl.coach_id
       WHERE cl.member_id = $1
       ORDER BY cl.created_at DESC`,
      [memberId]
    );

    const logs = logsRes.rows.map(r => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      coachName: r.coach_name
    }));

    res.json({ logs });
  } catch (error) {
    console.error('Get coach logs error:', error);
    res.status(500).json({ message: '獲取教練紀錄時發生錯誤' });
  }
});

// POST: 新增教練紀錄（僅該學員之教練或管理員）
router.post('/member/:id/coach-logs', requireCoach, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });
    const { content } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ message: '請輸入紀錄內容' });

    const isAdmin = !!req.user.is_admin;
    if (!isAdmin) {
      const checkRes = await pool.query('SELECT id FROM users WHERE id = $1 AND coach_user_id = $2', [memberId, req.user.id]);
      if (checkRes.rows.length === 0) return res.status(403).json({ message: '僅能為指派給您的學員新增教練紀錄' });
    }

    const insertRes = await pool.query(
      `INSERT INTO coach_logs (coach_id, member_id, content) VALUES ($1, $2, $3)`,
      [req.user.id, memberId, content.trim()]
    );

    const coachRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const log = {
      id: insertRes.rows[0].id,
      content: insertRes.rows[0].content,
      createdAt: insertRes.rows[0].created_at,
      coachName: coachRes.rows[0]?.name || '教練'
    };

    res.json({ message: '教練紀錄已新增', log });
  } catch (error) {
    console.error('Create coach log error:', error);
    res.status(500).json({ message: '新增教練紀錄時發生錯誤' });
  }
});

// 新增：批量分配入職任務給多位學員
router.post('/onboarding-tasks/bulk', requireCoach, async (req, res) => {
  const client = await pool.connect();
  try {
    const { memberIds, title, description, dueDate } = req.body || {};
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: '請提供至少一位學員 ID' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: '請提供任務標題' });
    }

    const trimmedTitle = title.trim().slice(0, 200);
    const desc = typeof description === 'string' ? description : null;
    let due = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: '截止日期格式不正確' });
      }
      due = d.toISOString();
    }

    // 權限驗證：教練只能分配給自己的學員；管理員不受此限制
    const isAdmin = !!req.user.is_admin;
    const coachId = req.user.id;

    if (!isAdmin) {
      const checkRes = await pool.query(
        `SELECT id FROM users WHERE id = ANY($1) AND coach_user_id = $2 AND status = 'active'`,
        [memberIds.map(id => parseInt(id, 10)).filter(Boolean), coachId]
      );
      if (checkRes.rows.length !== memberIds.length) {
        return res.status(403).json({ message: '包含未指派給您的學員，無法批量分配' });
      }
    }

    await client.query('BEGIN');

    // 動態批量 INSERT
    const values = [];
    const params = [];
    let idx = 1;

    memberIds.forEach((uid) => {
      const userId = parseInt(uid, 10);
      if (!Number.isInteger(userId)) return;
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(userId, trimmedTitle, desc, due);
    });

    if (values.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '沒有有效的學員 ID' });
    }

    const insertSql = `
      INSERT INTO user_onboarding_tasks (user_id, title, description, due_date, created_by_coach_id)
      SELECT v.user_id, v.title, v.description, v.due_date, $${idx}
      FROM (
        VALUES ${values.join(',')}
      ) AS v(user_id, title, description, due_date)
      RETURNING id
    `;
    params.push(coachId);

    const insertResult = await client.query(insertSql, params);

    await client.query('COMMIT');

    res.json({ message: '批量分配成功', createdCount: insertResult.rowCount || 0 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk create onboarding tasks error:', error);
    res.status(500).json({ message: '批量分配任務時發生錯誤' });
  } finally {
    client.release();
  }
});

// Ensure export at the very end of file
// @route   GET /api/users/core-members
// @desc    Get level 1 core members list
// @access  Private
router.get('/core-members', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.company, u.title, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.membership_level = 1 AND u.status = 'active'
       ORDER BY u.name ASC`
    );

    res.json({
      coreMembers: result.rows.map(member => ({
        id: member.id,
        name: member.name,
        company: member.company,
        title: member.title,
        chapterName: member.chapter_name
      }))
    });
  } catch (error) {
    console.error('Get core members error:', error);
    res.status(500).json({ message: '獲取核心人員列表時發生錯誤' });
  }
});

// @route   GET /api/users/referral-stats
// @desc    Get user's referral statistics for dashboard
// @access  Private
router.get('/referral-stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // 我確認的引薦總金額（作為被引薦人）
    const receivedStats = await pool.query(
      `SELECT COALESCE(SUM(referral_amount), 0) as total_received
       FROM referrals
       WHERE referred_to_id = $1 AND status = 'confirmed'`,
      [userId]
    );

    // 我發出且被確認的引薦總金額（作為引薦人）
    const sentStats = await pool.query(
      `SELECT COALESCE(SUM(referral_amount), 0) as total_sent
       FROM referrals
       WHERE referrer_id = $1 AND status = 'confirmed'`,
      [userId]
    );

    // 待處理的引薦數量
    const pendingReceived = await pool.query(
      `SELECT COUNT(*) as pending_received
       FROM referrals
       WHERE referred_to_id = $1 AND status = 'pending'`,
      [userId]
    );

    const pendingSent = await pool.query(
      `SELECT COUNT(*) as pending_sent
       FROM referrals
       WHERE referrer_id = $1 AND status = 'pending'`,
      [userId]
    );

    res.json({
      total_received: parseFloat(receivedStats.rows[0].total_received),
      total_sent: parseFloat(sentStats.rows[0].total_sent),
      pending_received: parseInt(pendingReceived.rows[0].pending_received),
      pending_sent: parseInt(pendingSent.rows[0].pending_sent)
    });
  } catch (error) {
    console.error('獲取引薦統計錯誤:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

module.exports = router;