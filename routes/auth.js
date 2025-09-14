const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const multer = require('multer');
const { pool } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { 
  generateVerificationCode, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} = require('../services/emailService');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

// Debug route to check environment and database status
router.get('/debug', async (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set',
        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set'
      },
      database: {
        postgresql: 'Unknown',
        mongodb: 'Unknown'
      }
    };

    // Test PostgreSQL connection
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      debugInfo.database.postgresql = 'Connected';
      debugInfo.database.postgresqlTime = result.rows[0].current_time;
    } catch (error) {
      debugInfo.database.postgresql = `Error: ${error.message}`;
    }

    // Test MongoDB connection (if mongoose is available)
    try {
      const mongoose = require('mongoose');
      debugInfo.database.mongodb = `State: ${mongoose.connection.readyState}`;
    } catch (error) {
      debugInfo.database.mongodb = `Error: ${error.message}`;
    }

    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug route failed',
      message: error.message
    });
  }
});

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

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public// 發送Email驗證碼
router.post('/send-verification', async (req, res) => {
  try {
    const { email, name } = req.body;

    console.log('[SendVerification] Incoming request', { email, name });
    
    // 驗證必要參數
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email和姓名為必填項目' 
      });
    }
    
    // 驗證Email格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email格式不正確' 
      });
    }
    
    // 檢查Email是否已被註冊
    const existingUsers = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUsers.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '此Email已被註冊' 
      });
    }
    
    // 生成驗證碼
    const verificationCode = generateVerificationCode();
    const maskedCode = verificationCode.slice(0, 2) + '****';
    
    // 刪除舊的驗證碼記錄（如果存在）
    await pool.query(
      'DELETE FROM email_verifications WHERE email = $1',
      [email]
    );
    
    // 儲存驗證碼到資料庫
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分鐘後過期
    await pool.query(
      'INSERT INTO email_verifications (email, verification_code, name, expires_at) VALUES ($1, $2, $3, $4)',
      [email, verificationCode, name, expiresAt]
    );

    console.log('[SendVerification] Code generated and saved', { email, code: maskedCode, expiresAt });
    
    // 發送驗證碼Email
    await sendEmailVerification({
      email,
      name,
      verificationCode
    });

    console.log('[SendVerification] Email dispatch completed', { email });
    
    res.json({ 
      success: true, 
      message: '驗證碼已發送至您的Email信箱，請查收' 
    });
    
  } catch (error) {
    console.error('[SendVerification] Error:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: '發送驗證碼失敗，請稍後再試' 
    });
  }
});

// 驗證Email驗證碼
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    
    // 驗證必要參數
    if (!email || !verificationCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email和驗證碼為必填項目' 
      });
    }
    
    // 查找驗證碼記錄
    const verifications = await pool.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND verification_code = $2 AND expires_at > NOW() AND is_verified = FALSE',
      [email, verificationCode]
    );
    
    if (verifications.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '驗證碼無效或已過期' 
      });
    }
    
    // 標記為已驗證
    await pool.query(
      'UPDATE email_verifications SET is_verified = TRUE WHERE email = $1 AND verification_code = $2',
      [email, verificationCode]
    );
    
    res.json({ 
      success: true, 
      message: 'Email驗證成功' 
    });
    
  } catch (error) {
    console.error('驗證Email錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '驗證失敗，請稍後再試' 
    });
  }
});

// 註冊路由
router.post('/register', upload.single('avatar'), async (req, res) => {  try {
    const {
      name,
      email,
      password,
      company,
      industry,
      title,
      contactNumber,
      chapterId
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: '姓名、電子郵件和密碼為必填項目' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '請輸入有效的電子郵件地址' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密碼長度至少需要6個字符' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: '此電子郵件已被註冊' });
    }

    // 檢查Email是否已通過驗證
    const emailVerifications = await pool.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND is_verified = TRUE',
      [email]
    );
    
    if (emailVerifications.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '請先完成Email驗證' 
      });
    }

    // Validate chapter exists
    if (chapterId) {
      const chapterExists = await pool.query(
        'SELECT id FROM chapters WHERE id = $1',
        [chapterId]
      );
      
      if (chapterExists.rows.length === 0) {
        return res.status(400).json({ message: '選擇的分會不存在' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique NFC card ID
    const nfcCardId = `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        // Continue without avatar if upload fails
      }
    }

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users 
       (name, email, password, company, industry, title, contact_number, chapter_id, nfc_card_id, profile_picture_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval')
       RETURNING id, name, email, company, industry, title, contact_number, chapter_id, profile_picture_url, status, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        company?.trim() || null,
        industry?.trim() || null,
        title?.trim() || null,
        contactNumber?.trim() || null,
        chapterId || null,
        nfcCardId,
        profilePictureUrl
      ]
    );

    const newUser = result.rows[0];

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email: newUser.email,
        name: newUser.name
      });
      console.log(`Welcome email sent to: ${newUser.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue execution - don't fail the registration if email fails
    }

    // 清理Email驗證記錄
    try {
      await pool.query(
        'DELETE FROM email_verifications WHERE email = $1',
        [email]
      );
    } catch (cleanupError) {
      console.error('清理Email驗證記錄失敗:', cleanupError);
      // 不影響註冊流程，只記錄錯誤
    }

    res.status(201).json({
      message: '註冊成功！您的帳號正在等待管理員審核',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        company: newUser.company,
        industry: newUser.industry,
        title: newUser.title,
        contactNumber: newUser.contact_number,
        chapterId: newUser.chapter_id,
        status: newUser.status,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '註冊過程中發生錯誤，請稍後再試' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: '請輸入電子郵件和密碼' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '請輸入有效的電子郵件地址' });
    }

    // Find user
    const result = await pool.query(
      `SELECT u.*, c.name as chapter_name 
       FROM users u 
       LEFT JOIN chapters c ON u.chapter_id = c.id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '電子郵件或密碼錯誤' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '電子郵件或密碼錯誤' });
    }

    // Check user status
    if (user.status === 'pending_approval') {
      return res.status(403).json({ message: '您的帳號正在等待管理員審核，請稍後再試' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: '您的帳號已被暫停，請聯繫管理員' });
    }

    if (user.status === 'blacklisted') {
      return res.status(403).json({ message: '您的帳號已被停用' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login (optional)
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Set token as httpOnly cookie
    res.cookie('token', token, {
      httpOnly: false, // Allow JavaScript access for frontend
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: '登入成功',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        industry: user.industry,
        title: user.title,
        profilePictureUrl: user.profile_picture_url,
        contactNumber: user.contact_number,
        chapterId: user.chapter_id,
        chapterName: user.chapter_name,
        membershipLevel: user.membership_level,
        status: user.status,
        nfcCardId: user.nfc_card_id,
        qrCodeUrl: user.qr_code_url,
        isCoach: !!user.is_coach,
        coachUserId: user.coach_user_id,
        mbti: user.mbti,
        mbtiPublic: user.mbti_public
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登入過程中發生錯誤，請稍後再試' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, c.name as chapter_name 
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        industry: user.industry,
        title: user.title,
        profilePictureUrl: user.profile_picture_url,
        contactNumber: user.contact_number,
        chapterId: user.chapter_id,
        chapterName: user.chapter_name,
        membershipLevel: user.membership_level,
        status: user.status,
        nfcCardId: user.nfc_card_id,
        nfcCardUrl: user.nfc_card_url,
        qrCodeUrl: `/api/qrcode/member/${user.id}`,
        interviewForm: interviewForm,
        createdAt: user.created_at,
        mbti: user.mbti,
        mbtiPublic: user.mbti_public
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ message: '獲取用戶信息時發生錯誤' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: '登出成功' });
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ message: '請輸入電子郵件地址' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: '請輸入有效的電子郵件地址' });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: '如果該電子郵件地址存在於我們的系統中，您將收到密碼重置郵件' });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetToken: resetToken
      });
      console.log(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue execution - don't fail the request if email fails
      // The reset token is still saved in database
    }

    res.json({ message: '如果該電子郵件地址存在於我們的系統中，您將收到密碼重置郵件' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: '處理請求時發生錯誤，請稍後再試' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validation
    if (!token || !password) {
      return res.status(400).json({ message: '重置令牌和新密碼為必填項目' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密碼長度至少需要6個字符' });
    }

    // Find user with valid reset token
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: '重置令牌無效或已過期' });
    }

    const user = userResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: '密碼重置成功，請使用新密碼登入' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: '重置密碼時發生錯誤，請稍後再試' });
  }
});

module.exports = router;