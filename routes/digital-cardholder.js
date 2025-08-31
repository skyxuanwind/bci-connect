const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const router = express.Router();

// JWT 中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登入權限' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '無效的登入權限' });
    }
    req.user = user;
    next();
  });
};

// 用戶註冊
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, company, title } = req.body;

    // 檢查必填欄位
    if (!name || !email || !password) {
      return res.status(400).json({ error: '姓名、電子郵件和密碼為必填欄位' });
    }

    // 檢查電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '請輸入有效的電子郵件地址' });
    }

    // 檢查密碼強度
    if (password.length < 6) {
      return res.status(400).json({ error: '密碼長度至少需要6個字符' });
    }

    // 檢查電子郵件是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM digital_cardholders WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '此電子郵件已被註冊' });
    }

    // 加密密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 生成驗證令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 插入新用戶
    const result = await pool.query(
      `INSERT INTO digital_cardholders 
       (name, email, password, phone, company, title, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, email, phone, company, title, is_verified, created_at`,
      [name, email, hashedPassword, phone, company, title, verificationToken]
    );

    const newUser = result.rows[0];

    // 生成 JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '註冊成功',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        company: newUser.company,
        title: newUser.title,
        is_verified: newUser.is_verified,
        created_at: newUser.created_at
      },
      token
    });

  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
});

// 用戶登入
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '請輸入電子郵件和密碼' });
    }

    // 查找用戶
    const result = await pool.query(
      'SELECT * FROM digital_cardholders WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '電子郵件或密碼錯誤' });
    }

    const user = result.rows[0];

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '電子郵件或密碼錯誤' });
    }

    // 生成 JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: '登入成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        title: user.title,
        is_verified: user.is_verified,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
});

// 獲取用戶資料
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, company, title, is_verified, created_at, updated_at FROM digital_cardholders WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('獲取用戶資料錯誤:', error);
    res.status(500).json({ error: '獲取用戶資料失敗' });
  }
});

// 更新用戶資料
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, company, title } = req.body;

    if (!name) {
      return res.status(400).json({ error: '姓名為必填欄位' });
    }

    const result = await pool.query(
      `UPDATE digital_cardholders 
       SET name = $1, phone = $2, company = $3, title = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, name, email, phone, company, title, is_verified, created_at, updated_at`,
      [name, phone, company, title, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      message: '用戶資料更新成功',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('更新用戶資料錯誤:', error);
    res.status(500).json({ error: '更新用戶資料失敗' });
  }
});

// 收藏名片
router.post('/collections', authenticateToken, async (req, res) => {
  try {
    const { member_card_id, notes, tags } = req.body;

    if (!member_card_id) {
      return res.status(400).json({ error: '名片ID為必填欄位' });
    }

    // 檢查名片是否存在
    const cardCheck = await pool.query(
      'SELECT id FROM member_cards WHERE id = $1',
      [member_card_id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: '名片不存在' });
    }

    // 檢查是否已收藏
    const existingCollection = await pool.query(
      'SELECT id FROM card_collections WHERE cardholder_id = $1 AND member_card_id = $2',
      [req.user.id, member_card_id]
    );

    if (existingCollection.rows.length > 0) {
      return res.status(400).json({ error: '此名片已在您的收藏中' });
    }

    // 新增收藏
    const result = await pool.query(
      `INSERT INTO card_collections (cardholder_id, member_card_id, notes, tags) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [req.user.id, member_card_id, notes, tags]
    );

    res.status(201).json({
      message: '名片收藏成功',
      collection: result.rows[0]
    });

  } catch (error) {
    console.error('收藏名片錯誤:', error);
    res.status(500).json({ error: '收藏名片失敗' });
  }
});

// 獲取收藏列表
router.get('/collections', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        cc.*,
        mc.name as card_name,
        mc.title as card_title,
        mc.company as card_company,
        mc.email as card_email,
        mc.phone as card_phone,
        mc.template_id,
        u.name as member_name
      FROM card_collections cc
      JOIN member_cards mc ON cc.member_card_id = mc.id
      JOIN users u ON mc.user_id = u.id
      WHERE cc.cardholder_id = $1
    `;

    const queryParams = [req.user.id];
    let paramIndex = 2;

    // 搜尋功能
    if (search) {
      query += ` AND (mc.name ILIKE $${paramIndex} OR mc.company ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // 標籤篩選
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query += ` AND cc.tags && $${paramIndex}`;
      queryParams.push(tagArray);
      paramIndex++;
    }

    query += ` ORDER BY cc.collected_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // 獲取總數
    let countQuery = `
      SELECT COUNT(*) 
      FROM card_collections cc
      JOIN member_cards mc ON cc.member_card_id = mc.id
      JOIN users u ON mc.user_id = u.id
      WHERE cc.cardholder_id = $1
    `;
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (search) {
      countQuery += ` AND (mc.name ILIKE $${countParamIndex} OR mc.company ILIKE $${countParamIndex} OR u.name ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      countQuery += ` AND cc.tags && $${countParamIndex}`;
      countParams.push(tagArray);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      collections: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('獲取收藏列表錯誤:', error);
    res.status(500).json({ error: '獲取收藏列表失敗' });
  }
});

// 更新收藏備註和標籤
router.put('/collections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, tags, is_favorite } = req.body;

    const result = await pool.query(
      `UPDATE card_collections 
       SET notes = $1, tags = $2, is_favorite = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 AND cardholder_id = $5 
       RETURNING *`,
      [notes, tags, is_favorite, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '收藏記錄不存在' });
    }

    res.json({
      message: '收藏更新成功',
      collection: result.rows[0]
    });

  } catch (error) {
    console.error('更新收藏錯誤:', error);
    res.status(500).json({ error: '更新收藏失敗' });
  }
});

// 刪除收藏
router.delete('/collections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM card_collections WHERE id = $1 AND cardholder_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '收藏記錄不存在' });
    }

    res.json({ message: '收藏刪除成功' });

  } catch (error) {
    console.error('刪除收藏錯誤:', error);
    res.status(500).json({ error: '刪除收藏失敗' });
  }
});

// 檢查名片是否已收藏
router.get('/collections/check/:member_card_id', authenticateToken, async (req, res) => {
  try {
    const { member_card_id } = req.params;

    const result = await pool.query(
      'SELECT id FROM card_collections WHERE cardholder_id = $1 AND member_card_id = $2',
      [req.user.id, member_card_id]
    );

    res.json({ is_collected: result.rows.length > 0 });

  } catch (error) {
    console.error('檢查收藏狀態錯誤:', error);
    res.status(500).json({ error: '檢查收藏狀態失敗' });
  }
});

module.exports = router;