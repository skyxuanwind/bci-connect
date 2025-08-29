const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { AIMatchingService } = require('../services/aiMatchingService');
const { AINotificationService } = require('../services/aiNotificationService');
const { AIProfileService } = require('../services/aiProfileService');

const aiMatchingService = new AIMatchingService();
const aiNotificationService = new AINotificationService();
const aiProfileService = new AIProfileService();

/**
 * 創建新許願
 * POST /api/wishes
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, tags, priority, expiresAt } = req.body;
    const userId = req.user.id;

    // 驗證必填欄位
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: '標題和描述為必填欄位' 
      });
    }

    // 使用AI分析許願內容
    console.log('🤖 開始AI分析許願內容...');
    const extractedIntents = await aiMatchingService.analyzeWishContent(
      description, 
      title, 
      category
    );

    // 創建許願記錄
    const result = await pool.query(`
      INSERT INTO member_wishes 
      (user_id, title, description, category, tags, ai_extracted_intents, priority, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      userId,
      title,
      description,
      category || null,
      tags || [],
      JSON.stringify(extractedIntents),
      priority || 1,
      expiresAt || null
    ]);

    const wish = result.rows[0];

    // 記錄用戶活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'wish_created', $2)
    `, [userId, JSON.stringify({ wish_id: wish.id, title, category })]);

    // 異步執行AI媒合和通知
    setImmediate(async () => {
      try {
        console.log('🔍 開始尋找匹配會員...');
        const matchingResults = await aiMatchingService.findMatchingMembers(
          wish.id, 
          extractedIntents, 
          10
        );

        console.log(`✅ 找到 ${matchingResults.length} 個匹配會員`);

        // 為高匹配度的會員發送通知
        for (const match of matchingResults) {
          if (match.score >= 80) {
            await aiNotificationService.sendWishOpportunityNotification(
              match.member.id,
              wish.id,
              wish,
              match.score
            );
          }
        }
      } catch (error) {
        console.error('❌ 異步AI媒合失敗:', error);
      }
    });

    res.json({
      success: true,
      message: '許願創建成功，AI正在為您尋找最佳匹配！',
      data: {
        id: wish.id,
        title: wish.title,
        description: wish.description,
        category: wish.category,
        tags: wish.tags,
        extractedIntents,
        status: wish.status,
        priority: wish.priority,
        createdAt: wish.created_at
      }
    });
  } catch (error) {
    console.error('❌ 創建許願失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '創建許願失敗，請稍後再試' 
    });
  }
});

/**
 * 獲取許願列表
 * GET /api/wishes
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status = 'active', 
      userId, 
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        mw.*,
        u.name as user_name,
        u.company as user_company,
        u.industry as user_industry,
        u.profile_picture_url
      FROM member_wishes mw
      JOIN users u ON mw.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // 添加篩選條件
    if (status !== 'all') {
      query += ` AND mw.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND mw.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (userId) {
      query += ` AND mw.user_id = $${paramIndex}`;
      params.push(parseInt(userId));
      paramIndex++;
    }

    if (search) {
      query += ` AND (mw.title ILIKE $${paramIndex} OR mw.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 排除過期的許願
    query += ` AND (mw.expires_at IS NULL OR mw.expires_at > CURRENT_TIMESTAMP)`;

    // 排序和分頁
    query += ` ORDER BY mw.priority DESC, mw.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // 獲取總數
    let countQuery = `
      SELECT COUNT(*) as total
      FROM member_wishes mw
      JOIN users u ON mw.user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = params.slice(0, -2); // 移除 limit 和 offset
    let countParamIndex = 1;

    if (status !== 'all') {
      countQuery += ` AND mw.status = $${countParamIndex}`;
      countParamIndex++;
    }

    if (category) {
      countQuery += ` AND mw.category = $${countParamIndex}`;
      countParamIndex++;
    }

    if (userId) {
      countQuery += ` AND mw.user_id = $${countParamIndex}`;
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (mw.title ILIKE $${countParamIndex} OR mw.description ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    countQuery += ` AND (mw.expires_at IS NULL OR mw.expires_at > CURRENT_TIMESTAMP)`;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags,
      extractedIntents: row.ai_extracted_intents,
      status: row.status,
      priority: row.priority,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        company: row.user_company,
        industry: row.user_industry,
        profilePicture: row.profile_picture_url
      }
    }));

    res.json({
      success: true,
      data: {
        wishes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ 獲取許願列表失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取許願列表失敗' 
    });
  }
});

/**
 * 獲取單個許願詳情
 * GET /api/wishes/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const wishId = req.params.id;

    const result = await pool.query(`
      SELECT 
        mw.*,
        u.name as user_name,
        u.company as user_company,
        u.industry as user_industry,
        u.title as user_title,
        u.profile_picture_url
      FROM member_wishes mw
      JOIN users u ON mw.user_id = u.id
      WHERE mw.id = $1
    `, [wishId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '許願不存在' 
      });
    }

    const wish = result.rows[0];

    // 獲取匹配結果
    const matchingResults = await aiMatchingService.getMatchingResultsForWish(wishId, 10);

    // 記錄瀏覽活動
    if (req.user.id !== wish.user_id) {
      await pool.query(`
        INSERT INTO member_activities (user_id, activity_type, activity_data)
        VALUES ($1, 'wish_viewed', $2)
      `, [req.user.id, JSON.stringify({ wish_id: wishId, owner_id: wish.user_id })]);
    }

    res.json({
      success: true,
      data: {
        id: wish.id,
        title: wish.title,
        description: wish.description,
        category: wish.category,
        tags: wish.tags,
        extractedIntents: wish.ai_extracted_intents,
        status: wish.status,
        priority: wish.priority,
        expiresAt: wish.expires_at,
        createdAt: wish.created_at,
        updatedAt: wish.updated_at,
        user: {
          id: wish.user_id,
          name: wish.user_name,
          company: wish.user_company,
          industry: wish.user_industry,
          title: wish.user_title,
          profilePicture: wish.profile_picture_url
        },
        matchingResults
      }
    });
  } catch (error) {
    console.error('❌ 獲取許願詳情失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取許願詳情失敗' 
    });
  }
});

/**
 * 更新許願
 * PUT /api/wishes/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const wishId = req.params.id;
    const { title, description, category, tags, priority, status, expiresAt } = req.body;
    const userId = req.user.id;

    // 檢查許願是否存在且屬於當前用戶
    const existingWish = await pool.query(
      'SELECT * FROM member_wishes WHERE id = $1 AND user_id = $2',
      [wishId, userId]
    );

    if (existingWish.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '許願不存在或無權限修改' 
      });
    }

    // 如果內容有變更，重新進行AI分析
    let extractedIntents = existingWish.rows[0].ai_extracted_intents;
    if (title !== existingWish.rows[0].title || description !== existingWish.rows[0].description) {
      extractedIntents = await aiMatchingService.analyzeWishContent(
        description || existingWish.rows[0].description,
        title || existingWish.rows[0].title,
        category || existingWish.rows[0].category
      );
    }

    // 更新許願
    const result = await pool.query(`
      UPDATE member_wishes 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        tags = COALESCE($4, tags),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        expires_at = COALESCE($7, expires_at),
        ai_extracted_intents = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
      title, description, category, tags, priority, status, expiresAt,
      JSON.stringify(extractedIntents), wishId, userId
    ]);

    const updatedWish = result.rows[0];

    // 記錄活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'wish_updated', $2)
    `, [userId, JSON.stringify({ wish_id: wishId, changes: { title, description, category, status } })]);

    // 如果內容有重大變更，重新執行匹配
    if (title !== existingWish.rows[0].title || description !== existingWish.rows[0].description) {
      setImmediate(async () => {
        try {
          await aiMatchingService.findMatchingMembers(wishId, extractedIntents, 10);
        } catch (error) {
          console.error('❌ 重新匹配失敗:', error);
        }
      });
    }

    res.json({
      success: true,
      message: '許願更新成功',
      data: {
        id: updatedWish.id,
        title: updatedWish.title,
        description: updatedWish.description,
        category: updatedWish.category,
        tags: updatedWish.tags,
        extractedIntents,
        status: updatedWish.status,
        priority: updatedWish.priority,
        expiresAt: updatedWish.expires_at,
        updatedAt: updatedWish.updated_at
      }
    });
  } catch (error) {
    console.error('❌ 更新許願失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新許願失敗' 
    });
  }
});

/**
 * 刪除許願
 * DELETE /api/wishes/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const wishId = req.params.id;
    const userId = req.user.id;

    // 檢查許願是否存在且屬於當前用戶
    const result = await pool.query(
      'DELETE FROM member_wishes WHERE id = $1 AND user_id = $2 RETURNING *',
      [wishId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '許願不存在或無權限刪除' 
      });
    }

    // 記錄活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'wish_deleted', $2)
    `, [userId, JSON.stringify({ wish_id: wishId, title: result.rows[0].title })]);

    res.json({
      success: true,
      message: '許願刪除成功'
    });
  } catch (error) {
    console.error('❌ 刪除許願失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除許願失敗' 
    });
  }
});

/**
 * 獲取許願的匹配結果
 * GET /api/wishes/:id/matches
 */
router.get('/:id/matches', authenticateToken, async (req, res) => {
  try {
    const wishId = req.params.id;
    const { limit = 10 } = req.query;

    // 檢查許願是否存在且用戶有權限查看
    const wishResult = await pool.query(
      'SELECT user_id FROM member_wishes WHERE id = $1',
      [wishId]
    );

    if (wishResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '許願不存在' 
      });
    }

    // 只有許願發布者可以查看匹配結果
    if (wishResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: '無權限查看匹配結果' 
      });
    }

    const matchingResults = await aiMatchingService.getMatchingResultsForWish(wishId, parseInt(limit));

    res.json({
      success: true,
      data: {
        wishId: parseInt(wishId),
        matches: matchingResults
      }
    });
  } catch (error) {
    console.error('❌ 獲取匹配結果失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取匹配結果失敗' 
    });
  }
});

/**
 * 智慧搜尋許願
 * POST /api/wishes/search
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    const { category, priority, limit = 10 } = filters;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: '搜尋查詢不能為空' 
      });
    }

    // 使用AI分析搜尋意圖
    const searchIntents = await aiMatchingService.analyzeWishContent(query, '', category);

    // 構建搜尋查詢
    let searchQuery = `
      SELECT 
        mw.*,
        u.name as user_name,
        u.company as user_company,
        u.industry as user_industry,
        u.profile_picture_url,
        ts_rank(to_tsvector('english', mw.title || ' ' || mw.description), plainto_tsquery('english', $1)) as relevance_score
      FROM member_wishes mw
      JOIN users u ON mw.user_id = u.id
      WHERE mw.status = 'active'
      AND (mw.expires_at IS NULL OR mw.expires_at > CURRENT_TIMESTAMP)
      AND (
        to_tsvector('english', mw.title || ' ' || mw.description) @@ plainto_tsquery('english', $1)
        OR mw.title ILIKE $2
        OR mw.description ILIKE $2
      )
    `;

    const params = [query, `%${query}%`];
    let paramIndex = 3;

    if (category) {
      searchQuery += ` AND mw.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (priority) {
      searchQuery += ` AND mw.priority = $${paramIndex}`;
      params.push(parseInt(priority));
      paramIndex++;
    }

    searchQuery += ` ORDER BY relevance_score DESC, mw.priority DESC, mw.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await pool.query(searchQuery, params);

    // 記錄搜尋活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'wish_search', $2)
    `, [req.user.id, JSON.stringify({ query, filters, results_count: result.rows.length })]);

    const wishes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags,
      extractedIntents: row.ai_extracted_intents,
      status: row.status,
      priority: row.priority,
      relevanceScore: parseFloat(row.relevance_score || 0),
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        company: row.user_company,
        industry: row.user_industry,
        profilePicture: row.profile_picture_url
      }
    }));

    res.json({
      success: true,
      data: {
        query,
        searchIntents,
        wishes,
        totalResults: wishes.length
      }
    });
  } catch (error) {
    console.error('❌ 智慧搜尋失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '智慧搜尋失敗' 
    });
  }
});

/**
 * 獲取許願分類統計
 * GET /api/wishes/stats/categories
 */
router.get('/stats/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(priority) as avg_priority
      FROM member_wishes 
      WHERE status = 'active'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      GROUP BY category
      ORDER BY count DESC
    `);

    const categories = result.rows.map(row => ({
      category: row.category || '未分類',
      count: parseInt(row.count),
      avgPriority: parseFloat(row.avg_priority || 0)
    }));

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('❌ 獲取分類統計失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取分類統計失敗' 
    });
  }
});

module.exports = router;