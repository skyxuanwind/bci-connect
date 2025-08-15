const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel } = require('../middleware/auth');
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

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.industry, u.title,
              u.profile_picture_url, u.contact_number, u.membership_level,
              u.status, u.nfc_card_id, u.qr_code_url, u.created_at,
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
        nfcCardId: user.nfc_card_id,
        qrCodeUrl: `/api/qrcode/member/${user.id}`,
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
    
    // Determine accessible membership levels based on user's level
    let accessibleLevels = [];
    switch (req.user.membership_level) {
      case 1: // Level 1 can see all levels
        accessibleLevels = [1, 2, 3];
        break;
      case 2: // Level 2 can see level 2 and 3
        accessibleLevels = [2, 3];
        break;
      case 3: // Level 3 can only see level 3
        accessibleLevels = [3];
        break;
      default:
        return res.status(403).json({ message: '無權限查看會員列表' });
    }

    let whereConditions = [
      'u.status = $1',
      `u.membership_level = ANY($2)`
    ];
    let queryParams = ['active', accessibleLevels];
    let paramIndex = 3;

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
             c.name as chapter_name
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
        chapterName: member.chapter_name
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
    console.error('Get members error:', error);
    res.status(500).json({ message: '獲取會員列表時發生錯誤' });
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

    // Check access permission based on membership level
    const canAccess = (
      (req.user.membership_level === 1) || // Level 1 can see all
      (req.user.membership_level === 2 && member.membership_level >= 2) || // Level 2 can see 2,3
      (req.user.membership_level === 3 && member.membership_level === 3) // Level 3 can see only 3
    );

    if (!canAccess) {
      return res.status(403).json({ message: '無權限查看此會員資料' });
    }

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
    res.status(500).json({ message: '獲取一級核心人員列表時發生錯誤' });
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