const express = require('express');
const router = express.Router();
const NFCCheckin = require('../models/NFCCheckin');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

// SSE 客戶端連接列表
const sseClients = new Set();

// 封裝：向所有 SSE 客戶端廣播訊息
function sseBroadcast(event, dataObj) {
  const data = `event: ${event}\n` + `data: ${JSON.stringify(dataObj)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch (e) {
      // 移除失效連線
      try { sseClients.delete(res); } catch (_) {}
    }
  }
}

// 接收來自本地 NFC Gateway Service 的報到資料
router.post('/submit', async (req, res) => {
  try {
    const { cardUid, timestamp, readerName, source = 'nfc-gateway' } = req.body;
    
    // 驗證必要欄位
    if (!cardUid) {
      return res.status(400).json({
        success: false,
        message: '缺少卡片 UID'
      });
    }
    
    const normalizedCardUid = cardUid.toUpperCase();
    
    // 查詢會員資料
    let memberInfo = null;
    try {
      const memberResult = await pool.query(
        'SELECT id, name, email, company, industry, title, membership_level, status FROM users WHERE nfc_card_id = $1',
        [normalizedCardUid]
      );
      
      if (memberResult.rows.length > 0) {
        memberInfo = memberResult.rows[0];
        console.log(`👤 識別到會員: ${memberInfo.name} (ID: ${memberInfo.id})`);
      } else {
        console.log(`❓ 未識別的 NFC 卡片: ${normalizedCardUid}`);
      }
    } catch (dbError) {
      console.error('❌ 查詢會員資料失敗:', dbError.message);
      // 繼續處理，不因為會員查詢失敗而中斷報到記錄
    }
    
    // 創建新的報到記錄
    const checkinData = {
      cardUid: normalizedCardUid,
      checkinTime: timestamp ? new Date(timestamp) : new Date(),
      readerName: readerName || null,
      source: source,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      notes: memberInfo ? `會員報到: ${memberInfo.name} (${memberInfo.company || '未設定公司'})` : '未識別會員'
    };
    
    const newCheckin = new NFCCheckin(checkinData);
    const savedCheckin = await newCheckin.save();
    
    const responseMessage = memberInfo 
      ? `✅ ${memberInfo.name} 報到成功！`
      : `✅ NFC 卡片報到成功（未識別會員）`;
    
    console.log(`✅ NFC 報到記錄已儲存: ${normalizedCardUid} (ID: ${savedCheckin._id})`);

    // 即時推播給前端（SSE）
    try {
      sseBroadcast('nfc-checkin', {
        id: savedCheckin._id,
        cardUid: savedCheckin.cardUid,
        checkinTime: savedCheckin.formattedCheckinTime,
        readerName: savedCheckin.readerName,
        source: savedCheckin.source,
        timestamp: savedCheckin.checkinTime.toISOString(),
        member: memberInfo ? {
          id: memberInfo.id,
          name: memberInfo.name,
          email: memberInfo.email,
          company: memberInfo.company,
          industry: memberInfo.industry,
          title: memberInfo.title,
          membershipLevel: memberInfo.membership_level,
          status: memberInfo.status
        } : null,
        isRegisteredMember: !!memberInfo
      });
    } catch (e) {
      console.warn('SSE 廣播失敗（不影響報到流程）:', e?.message || e);
    }
    
    res.json({
      success: true,
      message: responseMessage,
      checkinId: savedCheckin._id,
      cardUid: savedCheckin.cardUid,
      checkinTime: savedCheckin.formattedCheckinTime,
      timestamp: savedCheckin.checkinTime.toISOString(),
      member: memberInfo ? {
        id: memberInfo.id,
        name: memberInfo.name,
        email: memberInfo.email,
        company: memberInfo.company,
        industry: memberInfo.industry,
        title: memberInfo.title,
        membershipLevel: memberInfo.membership_level,
        status: memberInfo.status
      } : null,
      isRegisteredMember: !!memberInfo
    });
    
  } catch (error) {
    console.error('❌ NFC 報到儲存失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '報到儲存失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取所有報到記錄（需要認證）
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, cardUid, startDate, endDate } = req.query;
    
    // 建立查詢條件
    const filter = {};
    
    if (cardUid) {
      filter.cardUid = cardUid.toUpperCase();
    }
    
    if (startDate || endDate) {
      filter.checkinTime = {};
      if (startDate) {
        filter.checkinTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.checkinTime.$lte = new Date(endDate);
      }
    }
    
    // 分頁設定
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 查詢資料
    const [records, total] = await Promise.all([
      NFCCheckin.findActive(filter)
        .sort({ checkinTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      NFCCheckin.countCheckins(filter)
    ]);
    
    // 取得對應會員資料
    const cardUids = [...new Set((records || []).map(r => (r.cardUid || '').toUpperCase()).filter(Boolean))];
    const memberMap = {};
    if (cardUids.length > 0) {
      try {
        const members = await pool.query(
          "SELECT id, name, email, company, industry, title, membership_level, status, UPPER(nfc_card_id) AS nfc_card_id FROM users WHERE UPPER(nfc_card_id) = ANY($1)",
          [cardUids]
        );
        for (const m of members.rows) {
          memberMap[m.nfc_card_id] = {
            id: m.id,
            name: m.name,
            email: m.email,
            company: m.company,
            industry: m.industry,
            title: m.title,
            membershipLevel: m.membership_level,
            status: m.status
          };
        }
      } catch (e) {
        console.warn('查詢會員資料失敗（records）：', e.message);
      }
    }
    
    // 格式化回應資料
    const formattedRecords = (records || []).map(record => {
      const key = (record.cardUid || '').toUpperCase();
      const member = memberMap[key] || null;
      return {
        id: record._id,
        cardUid: record.cardUid,
        checkinTime: record.checkinTime.toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        readerName: record.readerName,
        source: record.source,
        timestamp: record.checkinTime.toISOString(),
        member
      };
    });
    
    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ 查詢報到記錄失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '查詢報到記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取最後一筆報到記錄（公開訪問）
router.get('/last-checkin', async (req, res) => {
  try {
    const lastCheckin = await NFCCheckin.findLastCheckin();
    
    if (!lastCheckin) {
      return res.json({
        success: true,
        message: '尚無報到記錄',
        data: null
      });
    }

    // 查詢對應會員
    let member = null;
    try {
      const mr = await pool.query(
        'SELECT id, name, email, company, industry, title, membership_level, status FROM users WHERE UPPER(nfc_card_id) = $1',
        [String(lastCheckin.cardUid || '').toUpperCase()]
      );
      if (mr.rows.length > 0) {
        const m = mr.rows[0];
        member = {
          id: m.id,
          name: m.name,
          email: m.email,
          company: m.company,
          industry: m.industry,
          title: m.title,
          membershipLevel: m.membership_level,
          status: m.status
        };
      }
    } catch (e) {
      console.warn('查詢會員資料失敗（last-checkin）：', e.message);
    }
    
    res.json({
      success: true,
      data: {
        id: lastCheckin._id,
        cardUid: lastCheckin.cardUid,
        checkinTime: lastCheckin.formattedCheckinTime,
        readerName: lastCheckin.readerName,
        source: lastCheckin.source,
        timestamp: lastCheckin.checkinTime.toISOString(),
        member
      }
    });
    
  } catch (error) {
    console.error('❌ 查詢最後報到記錄失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '查詢最後報到記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取今日報到記錄（需要認證）
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const todayCheckins = await NFCCheckin.findTodayCheckins();
    
    const formattedRecords = todayCheckins.map(record => ({
      id: record._id,
      cardUid: record.cardUid,
      checkinTime: record.formattedCheckinTime,
      readerName: record.readerName,
      source: record.source,
      timestamp: record.checkinTime.toISOString()
    }));
    
    res.json({
      success: true,
      data: formattedRecords,
      count: formattedRecords.length
    });
    
  } catch (error) {
    console.error('❌ 查詢今日報到記錄失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '查詢今日報到記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取特定卡號的報到記錄（需要認證）
router.get('/card/:cardUid', authenticateToken, async (req, res) => {
  try {
    const { cardUid } = req.params;
    const { limit = 20 } = req.query;
    
    const records = await NFCCheckin.findByCardUid(cardUid)
      .limit(parseInt(limit));
    
    const formattedRecords = records.map(record => ({
      id: record._id,
      cardUid: record.cardUid,
      checkinTime: record.formattedCheckinTime,
      readerName: record.readerName,
      source: record.source,
      timestamp: record.checkinTime.toISOString()
    }));
    
    res.json({
      success: true,
      data: formattedRecords,
      cardUid: cardUid.toUpperCase(),
      count: formattedRecords.length
    });
    
  } catch (error) {
    console.error('❌ 查詢卡號報到記錄失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '查詢卡號報到記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取報到統計（需要認證）
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [totalCheckins, todayCheckins] = await Promise.all([
      NFCCheckin.countCheckins(),
      NFCCheckin.findTodayCheckins()
    ]);
    
    // 統計今日不重複卡號數量
    const uniqueCardsToday = new Set(todayCheckins.map(record => record.cardUid)).size;
    
    res.json({
      success: true,
      stats: {
        totalCheckins: totalCheckins,
        todayCheckins: todayCheckins.length,
        uniqueCardsToday: uniqueCardsToday,
        lastUpdate: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ 查詢報到統計失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '查詢報到統計失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 手動新增報到記錄（需要認證）
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { cardUid, notes } = req.body;
    
    if (!cardUid) {
      return res.status(400).json({
        success: false,
        message: '請提供卡片 UID'
      });
    }
    
    const checkinData = {
      cardUid: cardUid.toUpperCase(),
      source: 'manual',
      notes: notes || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    const newCheckin = new NFCCheckin(checkinData);
    const savedCheckin = await newCheckin.save();
    
    console.log(`✅ 手動報到記錄已儲存: ${cardUid} (ID: ${savedCheckin._id})`);
    
    res.json({
      success: true,
      message: '手動報到成功',
      data: {
        id: savedCheckin._id,
        cardUid: savedCheckin.cardUid,
        checkinTime: savedCheckin.formattedCheckinTime,
        source: savedCheckin.source,
        notes: savedCheckin.notes
      }
    });
    
  } catch (error) {
    console.error('❌ 手動報到失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '手動報到失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 刪除報到記錄（軟刪除，需要認證）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkin = await NFCCheckin.findById(id);
    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的報到記錄'
      });
    }
    
    await checkin.softDelete();
    
    console.log(`✅ 報到記錄已刪除: ${id}`);
    
    res.json({
      success: true,
      message: '報到記錄已刪除'
    });
    
  } catch (error) {
    console.error('❌ 刪除報到記錄失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '刪除報到記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 建立 SSE 事件串流端點
router.get('/events', (req, res) => {
  // 設定 SSE header
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // 若部署跨網域，CORS 交由全域中介處理；此處保留基礎允許
  res.flushHeaders?.();

  // 先發送一個心跳，避免某些代理關閉連線
  res.write(`event: ping\n` + `data: ${JSON.stringify({ time: Date.now() })}\n\n`);

  // 保存客戶端連線
  sseClients.add(res);

  // 心跳保活（每 25 秒）
  const keepAlive = setInterval(() => {
    try {
      res.write(`event: ping\n` + `data: ${JSON.stringify({ time: Date.now() })}\n\n`);
    } catch (e) {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  // 客戶端關閉時清理
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

module.exports = router;