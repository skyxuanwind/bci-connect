const express = require('express');
const router = express.Router();
const NFCCheckin = require('../models/NFCCheckin');
const { authenticateToken } = require('../middleware/auth');

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
    
    // 創建新的報到記錄
    const checkinData = {
      cardUid: cardUid.toUpperCase(),
      checkinTime: timestamp ? new Date(timestamp) : new Date(),
      readerName: readerName || null,
      source: source,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    const newCheckin = new NFCCheckin(checkinData);
    const savedCheckin = await newCheckin.save();
    
    console.log(`✅ NFC 報到記錄已儲存: ${cardUid} (ID: ${savedCheckin._id})`);
    
    res.json({
      success: true,
      message: 'NFC 報到成功',
      checkinId: savedCheckin._id,
      cardUid: savedCheckin.cardUid,
      checkinTime: savedCheckin.formattedCheckinTime,
      timestamp: savedCheckin.checkinTime.toISOString()
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
    
    // 格式化回應資料
    const formattedRecords = records.map(record => ({
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
      timestamp: record.checkinTime.toISOString()
    }));
    
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
    
    res.json({
      success: true,
      data: {
        id: lastCheckin._id,
        cardUid: lastCheckin.cardUid,
        checkinTime: lastCheckin.formattedCheckinTime,
        readerName: lastCheckin.readerName,
        source: lastCheckin.source,
        timestamp: lastCheckin.checkinTime.toISOString()
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

module.exports = router;