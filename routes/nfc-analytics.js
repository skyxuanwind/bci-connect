const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 獲取名片數據分析儀表板
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取名片ID
    const cardResult = await pool.query(
      'SELECT id FROM nfc_cards WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    
    if (cardResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          totalViews: 0,
          todayViews: 0,
          weekViews: 0,
          monthViews: 0,
          contentAnalytics: [],
          sourceAnalytics: [],
          locationAnalytics: [],
          deviceAnalytics: [],
          timeSeriesData: []
        }
      });
    }
    
    const cardId = cardResult.rows[0].id;
    
    // 1. 總瀏覽量統計
    const viewStats = await pool.query(`
      SELECT 
        COUNT(*) as total_views,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_views,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_views,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_views
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'view'
    `, [cardId]);
    
    // 2. 內容區塊點擊分析（熱點分析）
    const contentAnalytics = await pool.query(`
      SELECT 
        additional_data->>'content_type' as content_type,
        additional_data->>'content_id' as content_id,
        COUNT(*) as click_count
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'contact_click'
        AND additional_data->>'content_type' IS NOT NULL
      GROUP BY additional_data->>'content_type', additional_data->>'content_id'
      ORDER BY click_count DESC
    `, [cardId]);
    
    // 3. 來源分析
    const sourceAnalytics = await pool.query(`
      SELECT 
        CASE 
          WHEN referrer LIKE '%nfc%' OR additional_data->>'source' = 'nfc' THEN 'NFC'
          WHEN referrer LIKE '%qr%' OR additional_data->>'source' = 'qr' THEN 'QR Code'
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          ELSE 'Other'
        END as source_type,
        COUNT(*) as count
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'view'
      GROUP BY source_type
      ORDER BY count DESC
    `, [cardId]);
    
    // 4. 地區分析
    const locationAnalytics = await pool.query(`
      SELECT 
        COALESCE(location_country, 'Unknown') as country,
        COALESCE(location_city, 'Unknown') as city,
        COUNT(*) as count
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'view'
      GROUP BY location_country, location_city
      ORDER BY count DESC
      LIMIT 10
    `, [cardId]);
    
    // 5. 設備分析
    const deviceAnalytics = await pool.query(`
      SELECT 
        COALESCE(device_type, 'Unknown') as device_type,
        COALESCE(browser, 'Unknown') as browser,
        COUNT(*) as count
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'view'
      GROUP BY device_type, browser
      ORDER BY count DESC
      LIMIT 10
    `, [cardId]);
    
    // 6. 時間序列數據（過去30天）
    const timeSeriesData = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as views
      FROM nfc_card_analytics 
      WHERE card_id = $1 AND event_type = 'view'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [cardId]);
    
    const stats = viewStats.rows[0];
    
    res.json({
      success: true,
      data: {
        totalViews: parseInt(stats.total_views),
        todayViews: parseInt(stats.today_views),
        weekViews: parseInt(stats.week_views),
        monthViews: parseInt(stats.month_views),
        contentAnalytics: contentAnalytics.rows,
        sourceAnalytics: sourceAnalytics.rows,
        locationAnalytics: locationAnalytics.rows,
        deviceAnalytics: deviceAnalytics.rows,
        timeSeriesData: timeSeriesData.rows
      }
    });
    
  } catch (error) {
    console.error('獲取分析數據錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '服務器錯誤' 
    });
  }
});

// 記錄名片訪問事件
router.post('/track', async (req, res) => {
  try {
    const { 
      cardId, 
      eventType, 
      contentType, 
      contentId, 
      source,
      userAgent,
      referrer 
    } = req.body;

    // 後端容錯：cardId 必須為正整數
    const rawId = typeof cardId === 'string' ? cardId.trim() : cardId;
    const cardIdStr = String(rawId || '');
    if (!cardIdStr || !/^\d+$/.test(cardIdStr)) {
      return res.json({ success: true, skipped: true, reason: 'invalid_cardId' });
    }
    const cardIdInt = parseInt(cardIdStr, 10);

    // 後端容錯：確認卡片是否存在
    const exists = await pool.query('SELECT 1 FROM nfc_cards WHERE id = $1 LIMIT 1', [cardIdInt]);
    if (exists.rowCount === 0) {
      return res.json({ success: true, skipped: true, reason: 'card_not_found' });
    }
    
    // 獲取訪客IP
    const visitorIp = req.ip || (req.connection && req.connection.remoteAddress);
    
    // 解析設備和瀏覽器信息
    const deviceInfo = parseUserAgent(userAgent);

    // 兼容 contentType/contentId 與 content_type/content_id
    const normalizedContentType = contentType || req.body.content_type || null;
    const normalizedContentId = contentId || req.body.content_id || null;
    
    // 構建額外數據
    const additionalData = {
      source: source,
      content_type: normalizedContentType,
      content_id: normalizedContentId
    };
    
    // 插入分析記錄
    await pool.query(`
      INSERT INTO nfc_card_analytics (
        card_id, event_type, visitor_ip, visitor_user_agent, 
        referrer, device_type, browser, additional_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      cardIdInt, 
      eventType, 
      visitorIp, 
      userAgent, 
      referrer, 
      deviceInfo.device, 
      deviceInfo.browser, 
      JSON.stringify(additionalData)
    ]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('記錄訪問事件錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '記錄失敗' 
    });
  }
});

// 解析User Agent的輔助函數
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { device: 'Unknown', browser: 'Unknown' };
  }
  
  let device = 'Desktop';
  let browser = 'Unknown';
  
  // 檢測設備類型
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    device = 'Mobile';
  } else if (/Tablet|iPad/.test(userAgent)) {
    device = 'Tablet';
  }
  
  // 檢測瀏覽器
  if (/Chrome/.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Firefox/.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Safari/.test(userAgent)) {
    browser = 'Safari';
  } else if (/Edge/.test(userAgent)) {
    browser = 'Edge';
  }
  
  return { device, browser };
}

module.exports = router;