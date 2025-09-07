const express = require('express');
const router = express.Router();
const NFCCheckin = require('../models/NFCCheckin');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { addClient, removeClient, broadcast } = require('../utils/sse');

// 從 URL 解析會員 ID 的函數
function parseMemberIdFromUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const memberIndex = pathParts.findIndex(part => part === 'member');
    if (memberIndex >= 0 && pathParts[memberIndex + 1] && /^\d+$/.test(pathParts[memberIndex + 1])) {
      return pathParts[memberIndex + 1];
    }
    // 也檢查 query 參數
    const memberId = urlObj.searchParams.get('memberId') || urlObj.searchParams.get('id');
    if (memberId && /^\d+$/.test(memberId)) {
      return memberId;
    }
  } catch (e) {
    console.error('解析 URL 失敗:', e.message);
  }
  return null;
}

// SSE 客戶端連接列表
// const sseClients = new Set(); // replaced by shared utils

// 封裝：向所有 SSE 客戶端廣播訊息
function sseBroadcast(event, dataObj) {
  broadcast(event, dataObj);
}

// 接收來自本地 NFC Gateway Service 的報到資料
router.post('/submit', async (req, res) => {
  try {
    const { cardUid, cardUrl, timestamp, readerName, source = 'nfc-gateway' } = req.body;
    
    // 驗證必要欄位 - 優先使用名片網址，其次使用UID
    if (!cardUrl && !cardUid) {
      return res.status(400).json({
        success: false,
        message: '缺少卡片網址或 UID'
      });
    }
    
    const normalizedCardUid = cardUid ? cardUid.toUpperCase() : null;
    const normalizedCardUrl = cardUrl ? cardUrl.trim() : null;
    
    // 查詢會員資料 - 優先使用名片網址查詢
    let memberInfo = null;
    try {
      let memberResult;
      if (normalizedCardUrl) {
        // 先嘗試用網址查詢
        memberResult = await pool.query(
          'SELECT id, name, email, company, industry, title, membership_level, status, nfc_card_url FROM users WHERE nfc_card_url = $1',
          [normalizedCardUrl]
        );
        
        // 如果網址查詢不到，嘗試從網址解析會員ID
        if (memberResult.rows.length === 0) {
          const memberIdFromUrl = parseMemberIdFromUrl(normalizedCardUrl);
          if (memberIdFromUrl) {
            memberResult = await pool.query(
              'SELECT id, name, email, company, industry, title, membership_level, status, nfc_card_url FROM users WHERE id = $1',
              [memberIdFromUrl]
            );
            
            // 如果找到會員且該會員的 nfcCardUrl 為空，自動更新
            if (memberResult.rows.length > 0 && !memberResult.rows[0].nfc_card_url) {
              await pool.query(
                'UPDATE users SET nfc_card_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [normalizedCardUrl, memberIdFromUrl]
              );
              console.log(`🔄 自動更新會員 ${memberResult.rows[0].name} 的 NFC 卡片網址: ${normalizedCardUrl}`);
            }
          }
        }
      } else {
        // 優先使用 nfc_uid 查詢，如果沒有結果再使用 nfc_card_id 查詢
        memberResult = await pool.query(
          'SELECT id, name, email, company, industry, title, membership_level, status, nfc_card_url, nfc_uid FROM users WHERE nfc_uid = $1',
          [normalizedCardUid]
        );
        
        // 如果通過 nfc_uid 沒有找到會員，再嘗試使用 nfc_card_id 查詢（向後兼容）
        if (memberResult.rows.length === 0) {
          memberResult = await pool.query(
            'SELECT id, name, email, company, industry, title, membership_level, status, nfc_card_url, nfc_uid FROM users WHERE nfc_card_id = $1',
            [normalizedCardUid]
          );
        }
      }
      
      if (memberResult.rows.length > 0) {
        memberInfo = memberResult.rows[0];
        console.log(`👤 識別到會員: ${memberInfo.name} (ID: ${memberInfo.id})`);
      } else {
        const identifier = normalizedCardUrl || normalizedCardUid;
        console.log(`❓ 未識別的 NFC 卡片: ${identifier}`);
      }
    } catch (dbError) {
      console.error('❌ 查詢會員資料失敗:', dbError.message);
      // 繼續處理，不因為會員查詢失敗而中斷報到記錄
    }
    
    // 創建新的報到記錄
    const identifier = normalizedCardUrl || normalizedCardUid;
    const checkinData = {
      cardUid: identifier, // 存儲實際使用的識別符（網址或UID）
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
    
    console.log(`✅ NFC 報到記錄已儲存: ${identifier} (ID: ${savedCheckin._id})`);

    // 自動同步到 PostgreSQL attendance_records 表（如果是已識別會員）
    if (memberInfo) {
      try {
        // 查找最近的活動作為預設活動
        const recentEventResult = await pool.query(
          'SELECT id, title FROM events WHERE event_date >= CURRENT_DATE - INTERVAL \'7 days\' ORDER BY event_date DESC LIMIT 1'
        );
        
        if (recentEventResult.rows.length > 0) {
          const event = recentEventResult.rows[0];
          
          // 檢查是否已經報到過
          const existingRecord = await pool.query(
            'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
            [memberInfo.id, event.id]
          );
          
          if (existingRecord.rows.length === 0) {
            // 新增出席記錄
            await pool.query(
              'INSERT INTO attendance_records (user_id, event_id, check_in_time) VALUES ($1, $2, $3)',
              [memberInfo.id, event.id, savedCheckin.checkinTime]
            );
            
            // 自動新增300元收入記錄
            await pool.query(
              'INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6)',
              [
                new Date().toISOString().split('T')[0],
                `${memberInfo.name} - ${event.title} 活動報到 (NFC)`,
                'income',
                300,
                'NFC 自動報到收入',
                memberInfo.id
              ]
            );
            
            console.log(`✅ 已自動同步到出席管理: ${memberInfo.name} -> ${event.title}`);
          } else {
            console.log(`ℹ️  ${memberInfo.name} 已經報到過活動 ${event.title}，跳過同步`);
          }
        } else {
          console.log('ℹ️  未找到近期活動，跳過出席記錄同步');
        }
      } catch (syncError) {
        console.error('❌ 同步到出席管理失敗:', syncError.message);
        // 不影響主要的 NFC 報到流程
      }
    }

    // 即時推播給前端（SSE）
    try {
      const formattedTime = typeof savedCheckin.getFormattedTime === 'function'
        ? savedCheckin.getFormattedTime()
        : (savedCheckin.formattedCheckinTime || (savedCheckin.checkinTime?.toISOString?.() || new Date().toISOString()));
      sseBroadcast('nfc-checkin', {
        id: savedCheckin._id,
        cardUid: savedCheckin.cardUid,
        checkinTime: formattedTime,
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
      checkinTime: (typeof savedCheckin.getFormattedTime === 'function')
        ? savedCheckin.getFormattedTime()
        : (savedCheckin.formattedCheckinTime || (savedCheckin.checkinTime?.toISOString?.() || new Date().toISOString())),
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

  // 保存客戶端連線（使用共用 SSE 客戶端池）
  addClient(res);

  // 心跳保活（每 25 秒）
  const keepAlive = setInterval(() => {
    try {
      res.write(`event: ping\n` + `data: ${JSON.stringify({ time: Date.now() })}\n\n`);
    } catch (e) {
      clearInterval(keepAlive);
      removeClient(res);
    }
  }, 25000);

  // 客戶端關閉時清理
  req.on('close', () => {
    clearInterval(keepAlive);
    removeClient(res);
  });
});

module.exports = router;