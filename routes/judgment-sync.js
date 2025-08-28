const express = require('express');
const router = express.Router();
const judgmentSyncService = require('../services/judgmentSyncService');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

// 管理員或核心會員權限檢查
const requireAdminOrLevel1 = (req, res, next) => {
  if (req.user.membership_level === 'admin' || req.user.membership_level <= 1) {
    next();
  } else {
    res.status(403).json({ message: '需要管理員或核心會員權限' });
  }
};

/**
 * 獲取同步狀態
 */
router.get('/status', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const syncLogs = await judgmentSyncService.getSyncStatus();
    const now = new Date();
    const currentHour = now.getHours();
    const isApiAvailable = judgmentSyncService.isApiAvailable();
    
    // 獲取環境變量狀態
    const devForceEnabled = process.env.JUDICIAL_DEV_FORCE === 'true';
    
    res.json({
      success: true,
      data: {
        isRunning: judgmentSyncService.isRunning,
        currentSyncId: judgmentSyncService.currentSyncId,
        isApiAvailable: isApiAvailable,
        recentLogs: syncLogs,
        // 調試信息
        debugInfo: {
          currentTime: now.toISOString(),
          currentHour: currentHour,
          taiwanTime: now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
          devForceEnabled: devForceEnabled,
          apiServiceWindow: '00:00 - 06:00 (台北時間)',
          isInServiceWindow: currentHour >= 0 && currentHour < 6,
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    console.error('獲取同步狀態失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取同步狀態失敗',
      error: error.message
    });
  }
});

/**
 * 手動觸發同步
 */
router.post('/manual-sync', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    if (judgmentSyncService.isRunning) {
      return res.status(400).json({
        success: false,
        message: '同步作業已在進行中，請稍後再試'
      });
    }

    const { forceSync } = req.body;
    const isApiAvailable = judgmentSyncService.isApiAvailable();
    
    // 檢查API可用性，除非強制同步
    if (!isApiAvailable && !forceSync) {
      const now = new Date();
      const currentHour = now.getHours();
      return res.status(400).json({
        success: false,
        message: `司法院 API 僅在凌晨 0-6 點提供服務，當前時間 ${currentHour}:${String(now.getMinutes()).padStart(2, '0')} 不在服務時間內`,
        debugInfo: {
          currentHour: currentHour,
          serviceWindow: '00:00 - 06:00',
          suggestion: '請在服務時間內重試，或聯繫管理員啟用開發模式'
        }
      });
    }

    // 記錄強制同步
    if (forceSync && !isApiAvailable) {
      console.warn(`⚠️ 管理員強制同步：用戶 ${req.user.username} 在非服務時間啟動同步`);
    }

    // 非同步執行同步作業
    judgmentSyncService.manualSync().catch(error => {
      console.error('手動同步失敗:', error);
    });

    res.json({
      success: true,
      message: forceSync ? '強制同步作業已開始，請稍後查看狀態' : '同步作業已開始，請稍後查看狀態'
    });
  } catch (error) {
    console.error('觸發手動同步失敗:', error);
    res.status(500).json({
      success: false,
      message: '觸發同步失敗',
      error: error.message
    });
  }
});

/**
 * 管理員功能：切換開發模式
 */
router.post('/toggle-dev-mode', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {

    const { enable } = req.body;
    
    // 注意：這只是臨時設置，重啟後會恢復
    process.env.JUDICIAL_DEV_FORCE = enable ? 'true' : 'false';
    
    console.log(`🔧 管理員 ${req.user.username} ${enable ? '啟用' : '停用'}了開發模式`);
    
    res.json({
      success: true,
      message: `開發模式已${enable ? '啟用' : '停用'}（重啟後恢復預設值）`,
      devModeEnabled: enable
    });
  } catch (error) {
    console.error('切換開發模式失敗:', error);
    res.status(500).json({
      success: false,
      message: '切換開發模式失敗',
      error: error.message
    });
  }
});

/**
 * 搜尋裁判書（從本地資料庫）
 */
router.get('/search', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const {
      q: query,
      limit = 20,
      offset = 0,
      riskLevel,
      caseType,
      dateFrom,
      dateTo
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      riskLevel,
      caseType,
      dateFrom,
      dateTo
    };

    const result = await judgmentSyncService.searchJudgments(query, options);
    
    res.json(result);
  } catch (error) {
    console.error('搜尋裁判書失敗:', error);
    res.status(500).json({
      success: false,
      message: '搜尋裁判書失敗',
      error: error.message
    });
  }
});

/**
 * 獲取裁判書詳細內容
 */
router.get('/judgment/:jid', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { jid } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM judgments WHERE jid = $1',
      [jid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的裁判書'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('獲取裁判書詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取裁判書詳情失敗',
      error: error.message
    });
  }
});

/**
 * 獲取統計資訊
 */
router.get('/statistics', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { pool } = require('../config/database');
    
    // 總裁判書數量
    const totalResult = await pool.query('SELECT COUNT(*) FROM judgments');
    const total = parseInt(totalResult.rows[0].count);

    // 按風險等級統計
    const riskStatsResult = await pool.query(`
      SELECT risk_level, COUNT(*) as count 
      FROM judgments 
      GROUP BY risk_level
    `);

    // 按案件類型統計
    const caseTypeStatsResult = await pool.query(`
      SELECT case_type, COUNT(*) as count 
      FROM judgments 
      WHERE case_type IS NOT NULL
      GROUP BY case_type
      ORDER BY count DESC
    `);

    // 最近 7 天的同步記錄
    const recentSyncsResult = await pool.query(`
      SELECT sync_date, status, total_fetched, new_records, updated_records, errors
      FROM judgment_sync_logs 
      WHERE sync_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY sync_date DESC
    `);

    // 最新更新時間
    const lastUpdateResult = await pool.query(`
      SELECT MAX(updated_at) as last_update 
      FROM judgments
    `);

    res.json({
      success: true,
      data: {
        total,
        riskLevelStats: riskStatsResult.rows,
        caseTypeStats: caseTypeStatsResult.rows,
        recentSyncs: recentSyncsResult.rows,
        lastUpdate: lastUpdateResult.rows[0]?.last_update
      }
    });
  } catch (error) {
    console.error('獲取統計資訊失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計資訊失敗',
      error: error.message
    });
  }
});

module.exports = router;