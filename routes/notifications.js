const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { AINotificationService } = require('../services/aiNotificationService');
const { AIProfileService } = require('../services/aiProfileService');

const aiNotificationService = new AINotificationService();
const aiProfileService = new AIProfileService();

/**
 * 獲取用戶通知列表
 * GET /api/notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status = 'all',
      priority 
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        an.*,
        CASE 
          WHEN an.related_user_id IS NOT NULL THEN (
            SELECT json_build_object(
              'id', u.id,
              'name', u.name,
              'company', u.company,
              'industry', u.industry,
              'profilePicture', u.profile_picture_url
            )
            FROM users u WHERE u.id = an.related_user_id
          )
          ELSE NULL
        END as related_user,
        CASE 
          WHEN an.related_wish_id IS NOT NULL THEN (
            SELECT json_build_object(
              'id', mw.id,
              'title', mw.title,
              'category', mw.category
            )
            FROM member_wishes mw WHERE mw.id = an.related_wish_id
          )
          ELSE NULL
        END as related_wish
      FROM ai_notifications an
      WHERE an.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;

    // 添加篩選條件
    if (type) {
      query += ` AND an.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status !== 'all') {
      query += ` AND an.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      query += ` AND an.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    // 排序和分頁
    query += ` ORDER BY an.priority DESC, an.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // 獲取總數
    let countQuery = `
      SELECT COUNT(*) as total
      FROM ai_notifications an
      WHERE an.user_id = $1
    `;
    
    const countParams = [userId];
    let countParamIndex = 2;

    if (type) {
      countQuery += ` AND an.type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (status !== 'all') {
      countQuery += ` AND an.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (priority) {
      countQuery += ` AND an.priority = $${countParamIndex}`;
      countParams.push(priority);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // 獲取未讀數量
    const unreadResult = await pool.query(
      'SELECT COUNT(*) as unread FROM ai_notifications WHERE user_id = $1 AND status = $2',
      [userId, 'unread']
    );
    const unreadCount = parseInt(unreadResult.rows[0].unread);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      aiReasoning: row.ai_reasoning,
      status: row.status,
      priority: row.priority,
      actionUrl: row.action_url,
      actionData: row.action_data,
      relatedUser: row.related_user,
      relatedWish: row.related_wish,
      createdAt: row.created_at,
      readAt: row.read_at
    }));

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ 獲取通知列表失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取通知列表失敗' 
    });
  }
});

/**
 * 獲取通知統計
 * GET /api/notifications/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        type,
        status,
        COUNT(*) as count
      FROM ai_notifications 
      WHERE user_id = $1
      GROUP BY type, status
      ORDER BY type, status
    `, [userId]);

    // 獲取最近7天的通知趨勢
    const trendResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        type,
        COUNT(*) as count
      FROM ai_notifications 
      WHERE user_id = $1 
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at), type
      ORDER BY date DESC, type
    `, [userId]);

    // 組織統計數據
    const stats = {};
    result.rows.forEach(row => {
      if (!stats[row.type]) {
        stats[row.type] = { total: 0, unread: 0, read: 0, dismissed: 0 };
      }
      stats[row.type][row.status] = parseInt(row.count);
      stats[row.type].total += parseInt(row.count);
    });

    // 組織趨勢數據
    const trends = {};
    trendResult.rows.forEach(row => {
      const date = row.date.toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = {};
      }
      trends[date][row.type] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        stats,
        trends
      }
    });
  } catch (error) {
    console.error('❌ 獲取通知統計失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取通知統計失敗' 
    });
  }
});

/**
 * 標記通知為已讀
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(`
      UPDATE ai_notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'unread'
      RETURNING *
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '通知不存在或已讀' 
      });
    }

    res.json({
      success: true,
      message: '通知已標記為已讀',
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        readAt: result.rows[0].read_at
      }
    });
  } catch (error) {
    console.error('❌ 標記通知已讀失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '標記通知已讀失敗' 
    });
  }
});

/**
 * 批量標記通知為已讀
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, ids } = req.body;

    let query = `
      UPDATE ai_notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status = 'unread'
    `;
    const params = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query += ` AND id = ANY($${paramIndex})`;
      params.push(ids);
      paramIndex++;
    }

    query += ' RETURNING id';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `已標記 ${result.rows.length} 個通知為已讀`,
      data: {
        updatedCount: result.rows.length,
        updatedIds: result.rows.map(row => row.id)
      }
    });
  } catch (error) {
    console.error('❌ 批量標記已讀失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '批量標記已讀失敗' 
    });
  }
});

/**
 * 忽略通知
 * PUT /api/notifications/:id/dismiss
 */
router.put('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(`
      UPDATE ai_notifications 
      SET status = 'dismissed'
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '通知不存在' 
      });
    }

    res.json({
      success: true,
      message: '通知已忽略',
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('❌ 忽略通知失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '忽略通知失敗' 
    });
  }
});

/**
 * 刪除通知
 * DELETE /api/notifications/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM ai_notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '通知不存在' 
      });
    }

    res.json({
      success: true,
      message: '通知已刪除'
    });
  } catch (error) {
    console.error('❌ 刪除通知失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除通知失敗' 
    });
  }
});

/**
 * 獲取AI推薦的機會
 * GET /api/notifications/opportunities
 */
router.get('/opportunities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    // 主動掃描新機會
    console.log('🔍 為用戶掃描新機會...');
    await aiNotificationService.scanAndNotifyOpportunities(userId);

    // 獲取最新的機會通知
    const result = await pool.query(`
      SELECT 
        an.*,
        CASE 
          WHEN an.related_user_id IS NOT NULL THEN (
            SELECT json_build_object(
              'id', u.id,
              'name', u.name,
              'company', u.company,
              'industry', u.industry,
              'title', u.title,
              'profilePicture', u.profile_picture_url
            )
            FROM users u WHERE u.id = an.related_user_id
          )
          ELSE NULL
        END as related_user,
        CASE 
          WHEN an.related_wish_id IS NOT NULL THEN (
            SELECT json_build_object(
              'id', mw.id,
              'title', mw.title,
              'description', mw.description,
              'category', mw.category
            )
            FROM member_wishes mw WHERE mw.id = an.related_wish_id
          )
          ELSE NULL
        END as related_wish
      FROM ai_notifications an
      WHERE an.user_id = $1 
      AND an.notification_type IN ('collaboration_opportunity', 'wish_opportunity', 'market_opportunity')
      AND an.status != 'dismissed'
      ORDER BY an.priority DESC, an.created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    const opportunities = result.rows.map(row => ({
      id: row.id,
      type: row.notification_type,
      title: row.title,
      description: row.content,
      message: row.content,
      aiReasoning: row.ai_reasoning,
      status: row.status,
      priority: row.priority,
      actionUrl: row.action_url || null,
      actionData: row.action_data || null,
      relatedUser: row.related_user,
      relatedWish: row.related_wish,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      opportunities,
      totalCount: opportunities.length,
      data: {
        opportunities,
        totalCount: opportunities.length
      }
    });
  } catch (error) {
    console.error('❌ 獲取AI機會推薦失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取AI機會推薦失敗' 
    });
  }
});

/**
 * 手動觸發AI機會掃描
 * POST /api/notifications/scan-opportunities
 */
router.post('/scan-opportunities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🤖 手動觸發用戶 ${userId} 的AI機會掃描...`);
    
    // 異步執行掃描
    setImmediate(async () => {
      try {
        await aiNotificationService.scanForOpportunities(userId);
        console.log(`✅ 用戶 ${userId} 的AI機會掃描完成`);
      } catch (error) {
        console.error(`❌ 用戶 ${userId} 的AI機會掃描失敗:`, error);
      }
    });

    res.json({
      success: true,
      message: 'AI正在為您掃描新機會，請稍後查看通知',
      data: {
        scanTriggered: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 觸發AI掃描失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '觸發AI掃描失敗' 
    });
  }
});

/**
 * 獲取通知偏好設定
 * GET /api/notifications/preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 從用戶的AI深度畫像中獲取通知偏好
    const profile = await aiProfileService.getCurrentProfile(userId);
    const preferences = profile?.notificationPreferences || {
      collaborationOpportunity: true,
      wishOpportunity: true,
      meetingInsights: true,
      marketOpportunity: true,
      emailNotifications: false,
      pushNotifications: true,
      minMatchingScore: 70,
      maxDailyNotifications: 5
    };

    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    console.error('❌ 獲取通知偏好失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取通知偏好失敗' 
    });
  }
});

/**
 * 更新通知偏好設定
 * PUT /api/notifications/preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: '無效的偏好設定' 
      });
    }

    // 更新用戶的AI深度畫像中的通知偏好
    const currentProfile = await aiProfileService.getCurrentProfile(userId);
    const updatedProfile = {
      ...currentProfile,
      notificationPreferences: {
        ...currentProfile?.notificationPreferences,
        ...preferences
      }
    };

    await aiProfileService.updateProfile(userId, { notificationPreferences: updatedProfile.notificationPreferences });

    res.json({
      success: true,
      message: '通知偏好已更新',
      data: {
        preferences: updatedProfile.notificationPreferences
      }
    });
  } catch (error) {
    console.error('❌ 更新通知偏好失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新通知偏好失敗' 
    });
  }
});

module.exports = router;