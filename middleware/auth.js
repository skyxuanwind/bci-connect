const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Auth middleware - Request:', req.method, req.path);
    console.log('Auth middleware - Headers:', req.headers);
    console.log('Auth middleware - Cookies:', req.cookies);
    
    // Try to get token from Authorization header first, then from cookies
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token && req.cookies) {
      token = req.cookies.token;
      console.log('Auth middleware - Token from cookie:', token);
    }

    if (!token) {
      console.log('Auth middleware - No token provided in header or cookie');
      return res.status(401).json({ message: '存取被拒絕，需要認證令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, name, email, company, industry, title, membership_level, status, chapter_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '無效的令牌，用戶不存在' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: '帳號未啟用或已被停用' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: '無效的令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: '令牌已過期' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  console.log('RequireAdmin middleware - User:', req.user);
  if (!req.user) {
    console.log('RequireAdmin middleware - No user found');
    return res.status(401).json({ message: '需要認證' });
  }

  // Admin check - assuming admin has membership_level 1 and specific email
  if (req.user.membership_level !== 1 || !req.user.email.includes('admin')) {
    return res.status(403).json({ message: '需要管理員權限' });
  }

  next();
};

// Check membership level access
const requireMembershipLevel = (requiredLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '需要認證' });
    }

    // Lower number = higher level (1 is highest, 3 is lowest)
    if (req.user.membership_level > requiredLevel) {
      return res.status(403).json({ message: '權限不足，需要更高的會員等級' });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireMembershipLevel,
  generateToken
};