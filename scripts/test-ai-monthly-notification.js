#!/usr/bin/env node
require('dotenv').config();

const { pool, initializeDatabase } = require('../config/database');
const { notifyAllActiveUsers, logSendEvent } = require('../services/goalReminderService');

(async () => {
  try {
    console.log('🛠 初始化資料庫...');
    await initializeDatabase();

    const THRESHOLD = Number(process.env.GOAL_REMINDER_THRESHOLD || 0.5);
    console.log('🚦 觸發月度 AI 通知（目標達成率提醒）...');
    const result = await notifyAllActiveUsers('monthly', THRESHOLD);
    const sentCount = result.results.filter(r => r.sent).length;

    console.log('✅ 測試結果:', {
      totalUsers: result.count,
      sentCount,
      failCount: result.count - sentCount
    });

    console.log('📝 寫入發送紀錄...');
    await logSendEvent({
      jobName: 'ai_goal_reminder_monthly_test',
      range: 'monthly',
      threshold: THRESHOLD,
      totalUsers: result.count,
      sentCount,
      failCount: result.count - sentCount,
      results: result.results,
      scheduledFor: null
    });

    console.log('🎉 測試完成。');
  } catch (e) {
    console.error('❌ 測試失敗:', e?.message || e);
  } finally {
    try { await pool.end(); } catch {}
    process.exit(0);
  }
})();