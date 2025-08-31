const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const router = express.Router();

// JWT 驗證中間件 (專用於數位名片夾用戶)
const authenticateCardholderToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登入才能使用此功能' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '無效的登入狀態' });
    }
    
    // 確保這是數位名片夾用戶的 token
    if (user.type !== 'cardholder') {
      return res.status(403).json({ error: '無效的用戶類型' });
    }
    
    req.user = user;
    next();
  });
};

// ========== 認證相關路由 ==========

// 註冊數位名片夾用戶
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, company, title } = req.body;

    // 驗證必填欄位
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
      'SELECT id FROM digital_card_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '此電子郵件已被註冊' });
    }

    // 加密密碼
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 生成驗證 token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 創建用戶
    const result = await pool.query(
      `INSERT INTO digital_card_users 
       (name, email, password, phone, company, title, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, email, phone, company, title, is_verified`,
      [name, email.toLowerCase(), hashedPassword, phone, company, title, verificationToken]
    );

    const user = result.rows[0];

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        type: 'cardholder' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '註冊成功',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        title: user.title,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '請輸入電子郵件和密碼' });
    }

    // 查找用戶
    const result = await pool.query(
      'SELECT * FROM digital_card_users WHERE email = $1',
      [email.toLowerCase()]
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

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        type: 'cardholder' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登入成功',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        title: user.title,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
});

// 獲取用戶資料
router.get('/profile', authenticateCardholderToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, company, title, avatar_url, is_verified, preferences FROM digital_card_users WHERE id = $1',
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
router.put('/profile', authenticateCardholderToken, async (req, res) => {
  try {
    const { name, phone, company, title, preferences } = req.body;

    const result = await pool.query(
      `UPDATE digital_card_users 
       SET name = $1, phone = $2, company = $3, title = $4, preferences = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING id, name, email, phone, company, title, avatar_url, is_verified, preferences`,
      [name, phone, company, title, preferences, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      message: '資料更新成功',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('更新用戶資料錯誤:', error);
    res.status(500).json({ error: '更新資料失敗' });
  }
});

// ========== 名片收藏功能 ==========

// 收藏名片
router.post('/collections', authenticateCardholderToken, async (req, res) => {
  try {
    const { card_id, notes, tags, folder_name } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: '名片ID為必填欄位' });
    }

    // 檢查名片是否存在且為公開狀態
    const cardCheck = await pool.query(
      'SELECT id FROM nfc_member_cards WHERE id = $1 AND is_active = true AND is_public = true',
      [card_id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: '名片不存在或未公開' });
    }

    // 檢查是否已收藏
    const existingCollection = await pool.query(
      'SELECT id FROM nfc_card_collections WHERE user_id = $1 AND card_id = $2',
      [req.user.id, card_id]
    );

    if (existingCollection.rows.length > 0) {
      return res.status(400).json({ error: '此名片已在您的收藏中' });
    }

    // 新增收藏
    const result = await pool.query(
      `INSERT INTO nfc_card_collections (user_id, card_id, notes, tags, folder_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [req.user.id, card_id, notes, tags, folder_name]
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
router.get('/collections', authenticateCardholderToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags, folder, is_favorite } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ncc.*,
        nmc.custom_url_slug,
        nmc.view_count,
        nct.name as template_name,
        nct.category as template_category,
        u.name as member_name,
        u.email as member_email,
        u.company as member_company,
        u.title as member_title,
        u.profile_picture_url
      FROM nfc_card_collections ncc
      JOIN nfc_member_cards nmc ON ncc.card_id = nmc.id
      JOIN nfc_card_templates nct ON nmc.template_id = nct.id
      JOIN users u ON nmc.user_id = u.id
      WHERE ncc.user_id = $1 AND nmc.is_active = true AND nmc.is_public = true
    `;

    const queryParams = [req.user.id];
    let paramIndex = 2;

    // 搜尋功能
    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.company ILIKE $${paramIndex} OR ncc.notes ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // 標籤篩選
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query += ` AND ncc.tags && $${paramIndex}`;
      queryParams.push(tagArray);
      paramIndex++;
    }

    // 資料夾篩選
    if (folder) {
      query += ` AND ncc.folder_name = $${paramIndex}`;
      queryParams.push(folder);
      paramIndex++;
    }

    // 我的最愛篩選
    if (is_favorite === 'true') {
      query += ` AND ncc.is_favorite = true`;
    }

    query += ` ORDER BY ncc.collected_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // 獲取總數
    let countQuery = `
      SELECT COUNT(*) 
      FROM nfc_card_collections ncc
      JOIN nfc_member_cards nmc ON ncc.card_id = nmc.id
      JOIN users u ON nmc.user_id = u.id
      WHERE ncc.user_id = $1 AND nmc.is_active = true AND nmc.is_public = true
    `;
    const countParams = [req.user.id];
    let countParamIndex = 2;

    if (search) {
      countQuery += ` AND (u.name ILIKE $${countParamIndex} OR u.company ILIKE $${countParamIndex} OR ncc.notes ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      countQuery += ` AND ncc.tags && $${countParamIndex}`;
      countParams.push(tagArray);
      countParamIndex++;
    }

    if (folder) {
      countQuery += ` AND ncc.folder_name = $${countParamIndex}`;
      countParams.push(folder);
      countParamIndex++;
    }

    if (is_favorite === 'true') {
      countQuery += ` AND ncc.is_favorite = true`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      collections: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasNextPage: (page * limit) < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('獲取收藏列表錯誤:', error);
    res.status(500).json({ error: '獲取收藏列表失敗' });
  }
});

// 更新收藏資料
router.put('/collections/:id', authenticateCardholderToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, tags, is_favorite, folder_name } = req.body;

    const result = await pool.query(
      `UPDATE nfc_card_collections 
       SET notes = $1, tags = $2, is_favorite = $3, folder_name = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6 
       RETURNING *`,
      [notes, tags, is_favorite, folder_name, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到此收藏記錄' });
    }

    res.json({
      message: '收藏資料更新成功',
      collection: result.rows[0]
    });

  } catch (error) {
    console.error('更新收藏資料錯誤:', error);
    res.status(500).json({ error: '更新收藏資料失敗' });
  }
});

// 刪除收藏
router.delete('/collections/:id', authenticateCardholderToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM nfc_card_collections WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到此收藏記錄' });
    }

    res.json({ message: '收藏刪除成功' });

  } catch (error) {
    console.error('刪除收藏錯誤:', error);
    res.status(500).json({ error: '刪除收藏失敗' });
  }
});

// 檢查名片是否已收藏
router.get('/collections/check/:card_id', authenticateCardholderToken, async (req, res) => {
  try {
    const { card_id } = req.params;

    const result = await pool.query(
      'SELECT id, is_favorite FROM nfc_card_collections WHERE user_id = $1 AND card_id = $2',
      [req.user.id, card_id]
    );

    res.json({
      isCollected: result.rows.length > 0,
      collectionData: result.rows[0] || null
    });

  } catch (error) {
    console.error('檢查收藏狀態錯誤:', error);
    res.status(500).json({ error: '檢查收藏狀態失敗' });
  }
});

// 獲取資料夾列表
router.get('/folders', authenticateCardholderToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT folder_name, COUNT(*) as card_count
       FROM nfc_card_collections 
       WHERE user_id = $1 AND folder_name IS NOT NULL
       GROUP BY folder_name
       ORDER BY folder_name ASC`,
      [req.user.id]
    );

    res.json({ folders: result.rows });

  } catch (error) {
    console.error('獲取資料夾列表錯誤:', error);
    res.status(500).json({ error: '獲取資料夾列表失敗' });
  }
});

// 獲取統計數據
router.get('/stats', authenticateCardholderToken, async (req, res) => {
  try {
    // 總收藏數
    const totalCollections = await pool.query(
      'SELECT COUNT(*) as count FROM nfc_card_collections WHERE user_id = $1',
      [req.user.id]
    );

    // 我的最愛數
    const favoriteCount = await pool.query(
      'SELECT COUNT(*) as count FROM nfc_card_collections WHERE user_id = $1 AND is_favorite = true',
      [req.user.id]
    );

    // 資料夾數
    const folderCount = await pool.query(
      'SELECT COUNT(DISTINCT folder_name) as count FROM nfc_card_collections WHERE user_id = $1 AND folder_name IS NOT NULL',
      [req.user.id]
    );

    // 最近收藏的名片
    const recentCollections = await pool.query(
      `SELECT 
         ncc.collected_at,
         u.name as member_name,
         u.company as member_company
       FROM nfc_card_collections ncc
       JOIN nfc_member_cards nmc ON ncc.card_id = nmc.id
       JOIN users u ON nmc.user_id = u.id
       WHERE ncc.user_id = $1
       ORDER BY ncc.collected_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({
      totalCollections: parseInt(totalCollections.rows[0].count),
      favoriteCount: parseInt(favoriteCount.rows[0].count),
      folderCount: parseInt(folderCount.rows[0].count),
      recentCollections: recentCollections.rows
    });

  } catch (error) {
    console.error('獲取統計數據錯誤:', error);
    res.status(500).json({ error: '獲取統計數據失敗' });
  }
});

module.exports = router;