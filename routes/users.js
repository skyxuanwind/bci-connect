const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel, requireCoach } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

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
      `SELECT id, name, company, title
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
    
    res.json({
      success: true,
      user: result.rows[0]
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

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
              u.profile_picture_url, u.contact_number, u.membership_level,
              u.status, u.qr_code_url, u.interview_form, u.created_at,
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
        createdAt: user.created_at
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
      contactNumber
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

    // Update user profile
    const updateQuery = profilePictureUrl 
      ? `UPDATE users 
         SET name = $1, company = $2, industry = $3, title = $4, 
             contact_number = $5, profile_picture_url = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, name, company, industry, title, contact_number, profile_picture_url`
      : `UPDATE users 
         SET name = $1, company = $2, industry = $3, title = $4, 
             contact_number = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, name, company, industry, title, contact_number, profile_picture_url`;
    
    const updateParams = profilePictureUrl 
      ? [
          name.trim(),
          company?.trim() || null,
          industry?.trim() || null,
          title?.trim() || null,
          contactNumber?.trim() || null,
          profilePictureUrl,
          req.user.id
        ]
      : [
          name.trim(),
          company?.trim() || null,
          industry?.trim() || null,
          title?.trim() || null,
          contactNumber?.trim() || null,
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
             u.interview_form, c.name as chapter_name
      FROM users u
      LEFT JOIN chapters c ON u.chapter_id = c.id
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
        interviewData: row.interview_form ? true : false
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

    // 取消會員等級限制：所有會員皆可查看該會員的面談資料

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
      `SELECT u.id, u.name, u.company, u.industry, u.title,
              u.profile_picture_url, u.contact_number, u.membership_level,
              u.qr_code_url, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在或未啟用' });
    }

    const member = result.rows[0];

    // 取消會員等級限制：所有會員皆可查看會員詳細資料


    res.json({
      member: {
        id: member.id,
        name: member.name,
        company: member.company,
        industry: member.industry,
        title: member.title,
        profilePictureUrl: member.profile_picture_url,
        contactNumber: member.contact_number,
        membershipLevel: member.membership_level,
        qrCodeUrl: `/api/qrcode/member/${member.id}`,
        chapterName: member.chapter_name
      }
    });

  } catch (error) {
    console.error('Get member details error:', error);
    res.status(500).json({ message: '獲取會員詳細資料時發生錯誤' });
  }
});

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

    // 獲取我確認的引薦總金額（作為被引薦人）
    const receivedStats = await pool.query(
      `SELECT COALESCE(SUM(referral_amount), 0) as total_received
       FROM referrals
       WHERE referred_to_id = $1 AND status = 'confirmed'`,
      [userId]
    );

    // 獲取我發出且被確認的引薦總金額（作為引薦人）
    const sentStats = await pool.query(
      `SELECT COALESCE(SUM(referral_amount), 0) as total_sent
       FROM referrals
       WHERE referrer_id = $1 AND status = 'confirmed'`,
      [userId]
    );

    // 獲取待處理的引薦數量
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