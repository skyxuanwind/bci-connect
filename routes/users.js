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







// Configure multer for coach log attachments (allow images, PDFs, and text)
const uploadCoachLogs = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain'
    );
    if (allowed) return cb(null, true);
    return cb(new Error('僅允許上傳圖片、PDF 或純文字檔'), false);
  }
});

// 獲取用戶公開資訊 (不需要認證)
router.get('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, name, company, title, mbti, mbti_public, email, profile_picture_url
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
      title: row.title,
      email: row.email,
      profilePictureUrl: row.profile_picture_url
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

// 列出所有用戶（供管理端/測試腳本使用）
// @route   GET /api/users
// @desc    Get all users (basic fields)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, company, industry, title,
             membership_level, status, is_coach, coach_user_id
      FROM users
      ORDER BY id ASC
    `);

    return res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users list error:', error);
    return res.status(500).json({ message: '獲取用戶列表時發生錯誤' });
  }
});

// 學員目錄：顯示所有有被指派教練的學員（包含其他教練的學員）
router.get('/all-coachees', requireCoach, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', noInterview, noNfc, sort } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [
      'u.status = $1',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`,
      'u.coach_user_id IS NOT NULL' // 只顯示有被指派教練的學員
    ];
    let params = ['active'];
    let idx = 2;

    if (search && search.trim()) {
      whereConditions.push(`(u.name ILIKE $${idx} OR u.company ILIKE $${idx} OR u.title ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    // 後端過濾條件
    if (noInterview === 'true') {
      whereConditions.push('u.interview_form IS NULL');
    }
    if (noNfc === 'true') {
      whereConditions.push('(u.nfc_card_id IS NULL AND u.nfc_card_url IS NULL)');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    // 排序子句
    let orderClause = 'ORDER BY u.name ASC';
    if (sort === 'overdue_desc') {
      orderClause = 'ORDER BY COALESCE(t.overdue_tasks, 0) DESC, u.name ASC';
    } else if (sort === 'meetings_desc') {
      orderClause = 'ORDER BY COALESCE(m.meetings_count, 0) DESC, u.name ASC';
    }

    const listQuery = `
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
             u.profile_picture_url, u.contact_number, u.membership_level,
             u.interview_form, c.name as chapter_name,
             coach.id as coach_id, coach.name as coach_name, coach.email as coach_email,
             COALESCE(t.pending_tasks, 0) AS pending_tasks,
             COALESCE(t.in_progress_tasks, 0) AS in_progress_tasks,
             COALESCE(t.completed_tasks, 0) AS completed_tasks,
             COALESCE(t.overdue_tasks, 0) AS overdue_tasks
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      LEFT JOIN (
        SELECT user_id,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
               SUM(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue_tasks
        FROM user_onboarding_tasks
        GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS meetings_count FROM (
          SELECT requester_id AS user_id FROM meetings
          UNION ALL
          SELECT attendee_id AS user_id FROM meetings
        ) s GROUP BY user_id
      ) m ON m.user_id = u.id
      ${whereClause}
      ${orderClause}
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
        coachUserId: row.coach_id,
        coach: {
          id: row.coach_id,
          name: row.coach_name,
          email: row.coach_email
        },
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
    console.error('Get all coachees error:', error);
    res.status(500).json({ message: '獲取學員目錄時發生錯誤' });
  }
});

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
    const { page = 1, limit = 20, search = '', noInterview, noNfc, sort, includeInactive } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const coachId = req.user.id;

    let whereConditions = [
      '($1::boolean IS TRUE OR u.status = $2)',
      'u.coach_user_id = $3',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`
    ];
    let params = [includeInactive === 'true', 'active', coachId];
    let idx = 4;

    if (search && search.trim()) {
      whereConditions.push(`(u.name ILIKE $${idx} OR u.company ILIKE $${idx} OR u.title ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    // 新增：後端過濾條件
    if (noInterview === 'true') {
      whereConditions.push('u.interview_form IS NULL');
    }
    if (noNfc === 'true') {
      whereConditions.push('(u.nfc_card_id IS NULL AND u.nfc_card_url IS NULL)');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    // 新增：排序子句與會議次數統計
    let orderClause = 'ORDER BY u.name ASC';
    if (sort === 'overdue_desc') {
      orderClause = 'ORDER BY COALESCE(t.overdue_tasks, 0) DESC, u.name ASC';
    } else if (sort === 'meetings_desc') {
      orderClause = 'ORDER BY COALESCE(m.meetings_count, 0) DESC, u.name ASC';
    }

    const listQuery = `
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
             u.profile_picture_url, u.contact_number, u.membership_level,
             u.interview_form, c.name as chapter_name,
             coach.id as coach_id, coach.name as coach_name, coach.email as coach_email,
             COALESCE(t.pending_tasks, 0) AS pending_tasks,
             COALESCE(t.in_progress_tasks, 0) AS in_progress_tasks,
             COALESCE(t.completed_tasks, 0) AS completed_tasks,
             COALESCE(t.overdue_tasks, 0) AS overdue_tasks
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      LEFT JOIN (
        SELECT user_id,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
               SUM(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue_tasks
        FROM user_onboarding_tasks
        GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS meetings_count FROM (
          SELECT requester_id AS user_id FROM meetings
          UNION ALL
          SELECT attendee_id AS user_id FROM meetings
        ) s GROUP BY user_id
      ) m ON m.user_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), offset);

    const listResult = await pool.query(listQuery, params);

    res.json({
      coachees: listResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company,
        industry: row.industry,
        title: row.title,
        profilePictureUrl: row.profile_picture_url,
        contactNumber: row.contact_number,
        membershipLevel: row.membership_level,
        chapterName: row.chapter_name,
        interviewData: row.interview_form ? true : false,
        coachUserId: row.coach_id, // 添加coachUserId字段
        coach: {
          id: row.coach_id,
          name: row.coach_name,
          email: row.coach_email
        },
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

// @route   GET /api/users/my-coachees/progress
// @desc    取得指派給目前教練的學員之多維度進度概況
// @access  Private (Coach or Admin)
router.get('/my-coachees/progress', requireCoach, async (req, res) => {
  try {
    const coachId = req.user.id;

    const params = [coachId];

    const query = `
      SELECT
        u.id AS user_id,
        (u.interview_form IS NOT NULL) AS has_interview,
        (u.mbti_type IS NOT NULL) AS has_mbti_type,
        (u.nfc_card_id IS NOT NULL OR u.nfc_card_url IS NOT NULL) AS has_nfc_card,
        (u.profile_picture_url IS NOT NULL AND u.profile_picture_url <> '') AS has_profile_picture,
        (u.contact_number IS NOT NULL AND u.contact_number <> '') AS has_contact_number,
        COALESCE(w.wallet_count, 0) AS wallet_count,
        COALESCE(m.meetings_count, 0) AS meetings_count,
        COALESCE(rs.sent_count, 0) AS referrals_sent,
        COALESCE(rr.received_confirmed, 0) AS referrals_received_confirmed,
        COALESCE(bm.bm_card_clicks, 0) AS bm_card_clicks,
        COALESCE(bm.bm_cta_clicks, 0) AS bm_cta_clicks,
        COALESCE(t.pending, 0) AS pending_tasks,
        COALESCE(t.in_progress, 0) AS in_progress_tasks,
        COALESCE(t.completed, 0) AS completed_tasks,
        COALESCE(t.overdue, 0) AS overdue_tasks,
        (COALESCE(fv.viewed, 0) > 0) AS foundation_viewed,
        COALESCE(er.events_count, 0) AS events_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS wallet_count
        FROM nfc_card_collections
        GROUP BY user_id
      ) w ON w.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS meetings_count FROM (
          SELECT requester_id AS user_id FROM meetings
          UNION ALL
          SELECT attendee_id AS user_id FROM meetings
        ) s GROUP BY user_id
      ) m ON m.user_id = u.id
      LEFT JOIN (
        SELECT referrer_id AS user_id, COUNT(*) AS sent_count
        FROM referrals
        GROUP BY referrer_id
      ) rs ON rs.user_id = u.id
      LEFT JOIN (
        SELECT referred_to_id AS user_id, COUNT(*) AS received_confirmed
        FROM referrals
        WHERE status = 'confirmed'
        GROUP BY referred_to_id
      ) rr ON rr.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue
        FROM user_onboarding_tasks
        GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT target_member_id AS user_id,
               COUNT(*) FILTER (WHERE event_type = 'card_click') AS bm_card_clicks,
               COUNT(*) FILTER (WHERE event_type = 'cta_click') AS bm_cta_clicks
        FROM business_media_analytics
        WHERE target_member_id IS NOT NULL
        GROUP BY target_member_id
      ) bm ON bm.user_id = u.id
      LEFT JOIN (
        SELECT user_id, 1 AS viewed
        FROM member_activities
        WHERE activity_type = 'foundation_viewed'
        GROUP BY user_id
      ) fv ON fv.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS events_count
        FROM event_registrations
        GROUP BY user_id
      ) er ON er.user_id = u.id
      WHERE u.status = 'active' AND u.coach_user_id = $1
    `;

    const result = await pool.query(query, params);

    const progress = result.rows.map(r => {
      const hasInterview = r.has_interview === true || r.has_interview === 't';
      const hasMbtiType = r.has_mbti_type === true || r.has_mbti_type === 't';
      const hasNfcCard = r.has_nfc_card === true || r.has_nfc_card === 't';
      const hasProfilePicture = r.has_profile_picture === true || r.has_profile_picture === 't';
      const hasContactNumber = r.has_contact_number === true || r.has_contact_number === 't';
      const foundationViewed = r.foundation_viewed === true || r.foundation_viewed === 't';
      const eventsCount = Number(r.events_count || 0);

      // 計分規則（採用先前建議）：
      // 基礎資料完成度（60分）：面談(40) + 大頭貼(10) + 聯絡方式(10)
      // 系統理解度（40分）：地基勾選(15) + NFC卡(15) + 活動報名(>=1)(10)
      // MBTI 選填加分：若填寫，整體 +10 分，上限 100
      const profileScore = (hasInterview ? 40 : 0) + (hasProfilePicture ? 10 : 0) + (hasContactNumber ? 10 : 0);
      const systemScore = (foundationViewed ? 15 : 0) + (hasNfcCard ? 15 : 0) + (eventsCount > 0 ? 10 : 0);
      const baseScore = profileScore + systemScore; // 0 ~ 100
      const bonusMbti = hasMbtiType ? 10 : 0;
      const overallPercent = Math.min(100, baseScore + bonusMbti);

      return {
        userId: r.user_id,
        hasInterview,
        hasMbtiType,
        hasNfcCard,
        hasProfilePicture,
        hasContactNumber,
        foundationViewed,
        walletCount: Number(r.wallet_count || 0),
        meetingsCount: Number(r.meetings_count || 0),
        referralsSent: Number(r.referrals_sent || 0),
        referralsReceivedConfirmed: Number(r.referrals_received_confirmed || 0),
        eventsCount,
        taskCounts: {
          pending: Number(r.pending_tasks || 0),
          inProgress: Number(r.in_progress_tasks || 0),
          completed: Number(r.completed_tasks || 0),
          overdue: Number(r.overdue_tasks || 0)
        },
        businessMedia: {
          cardClicks: Number(r.bm_card_clicks || 0),
          ctaClicks: Number(r.bm_cta_clicks || 0)
        },
        progress: {
          profileScore,
          systemScore,
          bonusMbti,
          overallPercent
        }
      };
    });

    res.json({ progress });
  } catch (error) {
    console.error('Get my-coachees progress error:', error);
    res.status(500).json({ message: '取得學員進度概況時發生錯誤' });
  }
});
// @access  Private (Coach or Admin)
router.get('/my-coachees/task-stats', requireCoach, async (req, res) => {
  try {
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
      WHERE u.status = 'active' AND u.coach_user_id = $1
    `;

    const args = [coachId];
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

    // 權限：本人、其教練或管理員
    const userRes = await pool.query('SELECT coach_user_id FROM users WHERE id = $1', [memberId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: '會員不存在' });
    const coachUserId = userRes.rows[0].coach_user_id;
    const allow = req.user.id === memberId || !!req.user.is_admin || (coachUserId && req.user.id === coachUserId);
    if (!allow) return res.status(403).json({ message: '沒有權限查看入職任務' });

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

    // 權限驗證：教練只能指派給自己的學員；真正的管理員不受限制
    const isRealAdmin = req.user.membership_level === 1 && req.user.email.includes('admin');
    if (!isRealAdmin) {
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
      `SELECT cl.id, cl.content, cl.attachments, cl.created_at, u.name AS coach_name
       FROM coach_logs cl
       JOIN users u ON u.id = cl.coach_id
       WHERE cl.member_id = $1
       ORDER BY cl.created_at DESC`,
      [memberId]
    );

    const logs = logsRes.rows.map(r => ({
      id: r.id,
      content: r.content,
      attachments: Array.isArray(r.attachments) ? r.attachments : [],
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
router.post('/member/:id/coach-logs', requireCoach, uploadCoachLogs.array('files', 5), async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });
    const content = (req.body?.content || '').trim();
    if (!content) return res.status(400).json({ message: '請輸入紀錄內容' });

    const isAdmin = !!req.user.is_admin;
    if (!isAdmin) {
      const checkRes = await pool.query('SELECT id FROM users WHERE id = $1 AND coach_user_id = $2', [memberId, req.user.id]);
      if (checkRes.rows.length === 0) return res.status(403).json({ message: '僅能為指派給您的學員新增教練紀錄' });
    }

    // 上傳附件（允許圖片與PDF、TXT等；使用 resource_type: 'auto'）
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'bci-connect/coach-logs',
                resource_type: 'auto'
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
          attachments.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type,
            bytes: uploadResult.bytes,
            originalFilename: file.originalname,
            mimeType: file.mimetype
          });
        } catch (err) {
          console.error('Attachment upload failed:', err);
        }
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO coach_logs (coach_id, member_id, content, attachments) VALUES ($1, $2, $3, $4) RETURNING id, content, attachments, created_at`,
      [req.user.id, memberId, content, JSON.stringify(attachments)]
    );

    const coachRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const row = insertRes.rows[0];
    const log = {
      id: row.id,
      content: row.content,
      attachments: Array.isArray(row.attachments) ? row.attachments : row.attachments ? row.attachments : [],
      createdAt: row.created_at,
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
        `SELECT id FROM users WHERE id = ANY($1::int[]) AND coach_user_id = $2 AND status = 'active'`,
        [memberIds.map(id => parseInt(id, 10)).filter(Boolean), coachId]
      );
      if (checkRes.rows.length !== memberIds.length) {
        return res.status(403).json({ message: '包含未指派給您的學員，無法批量分配' });
      }
    }

    await client.query('BEGIN');

    // 動態批量 INSERT（加入型別轉換避免 NULL 型別推斷錯誤）
    const values = [];
    const params = [];
    let idx = 1;

    memberIds.forEach((uid) => {
      const userId = parseInt(uid, 10);
      if (!Number.isInteger(userId)) return;
      values.push(`($${idx++}::int, $${idx++}::varchar(200), $${idx++}::text, $${idx++}::timestamp)`);
      params.push(userId, trimmedTitle, desc, due);
    });

    if (values.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '沒有有效的學員 ID' });
    }

    const insertSql = `
      INSERT INTO user_onboarding_tasks (user_id, title, description, due_date, created_by_coach_id)
      SELECT v.user_id, v.title, v.description, v.due_date, $${idx}::int
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

// @route   GET /api/users/staff-members
// @desc    Get all staff members (membership level 2)
// @access  Private
router.get('/staff-members', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.company, u.title, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.membership_level = 2 AND u.status = 'active'
       ORDER BY u.name ASC`
    );

    res.json({
      staffMembers: result.rows.map(member => ({
        id: member.id,
        name: member.name,
        company: member.company,
        title: member.title,
        chapterName: member.chapter_name
      }))
    });
  } catch (error) {
    console.error('Get staff members error:', error);
    res.status(500).json({ message: '獲取幹部人員列表時發生錯誤' });
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

// -------- Project Plan Endpoints (auto-evaluated 12-item plan) --------
router.get('/member/:id/project-plan', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    if (!Number.isInteger(memberId)) return res.status(400).json({ message: '會員 ID 無效' });

    // 權限：本人、其教練或管理員
    const userRes = await pool.query('SELECT coach_user_id FROM users WHERE id = $1', [memberId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: '會員不存在' });
    const coachUserId = userRes.rows[0].coach_user_id;
    const allow = req.user.id === memberId || !!req.user.is_admin || (coachUserId && req.user.id === coachUserId);
    if (!allow) return res.status(403).json({ message: '沒有權限查看專案計畫' });

    // 聚合該學員的多維度資料（重用 my-coachees/progress 的欄位邏輯）
    const query = `
      SELECT
        u.id AS user_id,
        (u.interview_form IS NOT NULL) AS has_interview,
        (u.mbti_type IS NOT NULL) AS has_mbti_type,
        (u.nfc_card_id IS NOT NULL OR u.nfc_card_url IS NOT NULL) AS has_nfc_card,
        (u.profile_picture_url IS NOT NULL AND u.profile_picture_url <> '') AS has_profile_picture,
        (u.contact_number IS NOT NULL AND u.contact_number <> '') AS has_contact_number,
        COALESCE(w.wallet_count, 0) AS wallet_count,
        COALESCE(m.meetings_count, 0) AS meetings_count,
        COALESCE(rs.sent_count, 0) AS referrals_sent,
        COALESCE(rr.received_confirmed, 0) AS referrals_received_confirmed,
        COALESCE(bm.bm_card_clicks, 0) AS bm_card_clicks,
        COALESCE(bm.bm_cta_clicks, 0) AS bm_cta_clicks,
        (COALESCE(fv.viewed, 0) > 0) AS foundation_viewed,
        COALESCE(er.events_count, 0) AS events_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS wallet_count
        FROM nfc_card_collections
        GROUP BY user_id
      ) w ON w.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS meetings_count FROM (
          SELECT requester_id AS user_id FROM meetings
          UNION ALL
          SELECT attendee_id AS user_id FROM meetings
        ) s GROUP BY user_id
      ) m ON m.user_id = u.id
      LEFT JOIN (
        SELECT referrer_id AS user_id, COUNT(*) AS sent_count
        FROM referrals
        GROUP BY referrer_id
      ) rs ON rs.user_id = u.id
      LEFT JOIN (
        SELECT referred_to_id AS user_id, COUNT(*) AS received_confirmed
        FROM referrals
        WHERE status = 'confirmed'
        GROUP BY referred_to_id
      ) rr ON rr.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN due_date IS NOT NULL AND due_date < NOW() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue
        FROM user_onboarding_tasks
        GROUP BY user_id
      ) t ON t.user_id = u.id
      LEFT JOIN (
        SELECT target_member_id AS user_id,
               COUNT(*) FILTER (WHERE event_type = 'card_click') AS bm_card_clicks,
               COUNT(*) FILTER (WHERE event_type = 'cta_click') AS bm_cta_clicks
        FROM business_media_analytics
        WHERE target_member_id IS NOT NULL
        GROUP BY target_member_id
      ) bm ON bm.user_id = u.id
      LEFT JOIN (
        SELECT user_id, 1 AS viewed
        FROM member_activities
        WHERE activity_type = 'foundation_viewed'
        GROUP BY user_id
      ) fv ON fv.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS events_count
        FROM event_registrations
        GROUP BY user_id
      ) er ON er.user_id = u.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [memberId]);
    if (result.rows.length === 0) return res.status(404).json({ message: '會員不存在或未啟用' });
    const r = result.rows[0];

    const hasInterview = r.has_interview === true || r.has_interview === 't';
    const hasMbtiType = r.has_mbti_type === true || r.has_mbti_type === 't';
    const hasNfcCard = r.has_nfc_card === true || r.has_nfc_card === 't';
    const hasProfilePicture = r.has_profile_picture === true || r.has_profile_picture === 't';
    const hasContactNumber = r.has_contact_number === true || r.has_contact_number === 't';
    const foundationViewed = r.foundation_viewed === true || r.foundation_viewed === 't';
    const eventsCount = Number(r.events_count || 0);
    const walletCount = Number(r.wallet_count || 0);
    const meetingsCount = Number(r.meetings_count || 0);
    const referralsSent = Number(r.referrals_sent || 0);
    const referralsReceivedConfirmed = Number(r.referrals_received_confirmed || 0);
    // const bmCardClicks = Number(r.bm_card_clicks || 0);
    // const bmCtaClicks = Number(r.bm_cta_clicks || 0);

    // GBC 深度交流表完成（以任務標題包含關鍵字且為完成狀態為準）
    const gbcRes = await pool.query(
      `SELECT 1 FROM user_onboarding_tasks WHERE user_id = $1 AND status = 'completed' AND title ILIKE '%GBC%深度交流表%' LIMIT 1`,
      [memberId]
    );
    const gbcCompleted = gbcRes.rows.length > 0;

    const items = [
      { key: 'interview_form', title: '完成一對一面談表', auto: true, completed: hasInterview },
      { key: 'profile_picture', title: '上傳個人頭像', auto: true, completed: hasProfilePicture },
      { key: 'contact_number', title: '填寫聯絡電話', auto: true, completed: hasContactNumber },
      { key: 'mbti_type', title: '完成 MBTI 測評', auto: true, completed: hasMbtiType },
      { key: 'foundation_viewed', title: '閱讀「商會地基」', auto: true, completed: foundationViewed },
      { key: 'nfc_card', title: '申請並啟用 NFC 名片', auto: true, completed: hasNfcCard },
      { key: 'event_participation', title: '參加至少 1 場活動', auto: true, completed: eventsCount > 0, value: eventsCount },
      { key: 'meeting', title: '進行至少 1 次會議', auto: true, completed: meetingsCount > 0, value: meetingsCount },
      { key: 'referral_sent', title: '發出至少 1 次引薦', auto: true, completed: referralsSent > 0, value: referralsSent },
      { key: 'referral_received_confirmed', title: '獲得 1 次確認之引薦', auto: true, completed: referralsReceivedConfirmed > 0, value: referralsReceivedConfirmed },
      { key: 'wallet_collection', title: '數位錢包收錄至少 1 張名片', auto: true, completed: walletCount > 0, value: walletCount },
      { key: 'gbc_profile', title: '完成 GBC 深度交流表', auto: true, completed: gbcCompleted }
    ];

    const total = items.length;
    const completedCount = items.filter(i => i.completed).length;
    const percent = Math.round((completedCount / total) * 100);

    res.json({
      memberId,
      summary: {
        total,
        completedCount,
        percent,
        lastUpdated: new Date().toISOString()
      },
      items
    });
  } catch (error) {
    console.error('Get project plan error:', error);
    res.status(500).json({ message: '獲取專案計畫時發生錯誤' });
  }
});

module.exports = router;