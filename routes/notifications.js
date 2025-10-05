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
      query += ` AND an.notification_type = $${paramIndex}`;
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
      countQuery += ` AND an.notification_type = $${countParamIndex}`;
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

    // 聚合各類型與狀態
    const result = await pool.query(`
      SELECT 
        notification_type AS type,
        status,
        COUNT(*) AS count
      FROM ai_notifications 
      WHERE user_id = $1
      GROUP BY notification_type, status
      ORDER BY notification_type, status
    `, [userId]);

    // 最近7天的通知趨勢
    const trendResult = await pool.query(`
      SELECT 
        DATE(created_at) AS date,
        notification_type AS type,
        COUNT(*) AS count
      FROM ai_notifications 
      WHERE user_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at), notification_type
      ORDER BY date DESC, notification_type
    `, [userId]);

    // 對應到前端顯示的類型鍵值
    const typeMap = {
      collaboration_recommendation: 'collaboration',
      meeting_insights: 'meeting',
      market_opportunity: 'market'
    };

    // 彙總前端所需的統計資料
    const aggregated = { total: 0, unread: 0, collaboration: 0, meeting: 0, market: 0 };

    // 可選：詳細分類統計（保留以備未來使用）
    const byTypeStatus = {};

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      const uiKey = typeMap[row.type];

      // 詳細分類統計
      if (!byTypeStatus[row.type]) {
        byTypeStatus[row.type] = { total: 0, unread: 0, read: 0, dismissed: 0 };
      }
      byTypeStatus[row.type][row.status] = (byTypeStatus[row.type][row.status] || 0) + count;
      byTypeStatus[row.type].total += count;

      // 前端所需統計
      aggregated.total += count;
      if (row.status === 'unread') aggregated.unread += count;
      if (uiKey) aggregated[uiKey] += count;
    });

    // 組織趨勢數據（以 UI 類型鍵值呈現）
    const trends = {};
    trendResult.rows.forEach(row => {
      const uiKey = typeMap[row.type];
      const dateStr = (row.date instanceof Date ? row.date : new Date(row.date)).toISOString().split('T')[0];
      if (!trends[dateStr]) trends[dateStr] = {};
      if (uiKey) {
        trends[dateStr][uiKey] = (trends[dateStr][uiKey] || 0) + parseInt(row.count);
      }
    });

    res.json({
      success: true,
      data: {
        total: aggregated.total,
        unread: aggregated.unread,
        collaboration: aggregated.collaboration,
        wish: aggregated.wish,
        meeting: aggregated.meeting,
        market: aggregated.market,
        // 附帶詳細統計與趨勢（前端目前未使用，保留以備後續圖表需求）
        details: {
          byTypeStatus,
          trends
        }
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
      AND an.notification_type IN ('collaboration_opportunity', 'market_opportunity')
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

// 已移除：願望板AI掃描端點（scan-opportunities）

/**
 * 獲取通知偏好設定
 * GET /api/notifications/preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 從用戶的AI深度畫像中獲取通知偏好
    const profile = await aiProfileService.getCurrentProfile(userId);
    const rawPrefs = profile?.notificationPreferences || {
      collaborationOpportunity: true,
      meetingInsights: true,
      marketOpportunity: true,
      emailNotifications: false,
      pushNotifications: true,
      maxDailyNotifications: 5
    };
    // 移除願望相關偏好欄位以保持一致性
    const { wishOpportunity, minMatchingScore, ...preferences } = rawPrefs;

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
    // 合併並移除願望相關偏好欄位
    const merged = {
      ...currentProfile?.notificationPreferences,
      ...preferences
    };
    delete merged.wishOpportunity;
    delete merged.minMatchingScore;
    const updatedProfile = {
      ...currentProfile,
      notificationPreferences: merged
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