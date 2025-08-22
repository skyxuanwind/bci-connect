const express = require('express');
const router = express.Router();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { authenticateToken } = require('../middleware/auth');
const NFCCheckin = require('../models/NFCCheckin');
const { connectMongoDB } = require('../config/mongodb');
const mongoose = require('mongoose');
const { addClient, removeClient, broadcast } = require('../utils/sse');
const { pool } = require('../config/database');

// NFC 讀卡機相關
let NFC = null;
try {
  const nfcPcsc = require('nfc-pcsc');
  NFC = nfcPcsc.NFC;
  console.log('✅ NFC-PCSC 套件載入成功 (NFC 報到系統)');
} catch (error) {
  console.log('⚠️  NFC-PCSC 套件未安裝或不可用 (NFC 報到系統)');
}

// SQLite 資料庫設定
const dbPath = path.join(__dirname, '..', 'nfc-attendance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('NFC 報到資料庫連線錯誤:', err.message);
  } else {
    console.log('✅ NFC 報到 SQLite 資料庫連線成功');
  }
});

// 建立 NFC 報到資料表
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS nfc_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_uid TEXT NOT NULL,
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_name TEXT,
      notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('建立 NFC 報到資料表錯誤:', err.message);
    } else {
      console.log('✅ NFC 報到資料表已準備就緒');
    }
  });
});

// NFC 讀卡機實例
let nfcReader = null;
let isNFCActive = false;

// 初始化 NFC 讀卡機
function initializeNFCReader() {
  if (!NFC) {
    // 在生產環境中，提供模擬 NFC 功能
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  生產環境：啟用模擬 NFC 模式');
      isNFCActive = true;
      nfcReader = { simulated: true };
      return true;
    } else {
      console.log('❌ NFC-PCSC 套件不可用，無法啟動 NFC 報到功能');
      return false;
    }
  }

  try {
    const nfc = new NFC();
    
    nfc.on('reader', reader => {
      console.log(`✅ NFC 報到讀卡機已連接: ${reader.reader.name}`);
      nfcReader = reader;
      
      reader.on('card', card => {
        const cardUid = card.uid;
        console.log(`\n🏷️  NFC 報到偵測到卡片 UID: ${cardUid}`);
        
        // 將報到資訊寫入資料庫
        addNFCCheckin(cardUid, (err, id) => {
          if (err) {
            console.error('❌ NFC 報到失敗:', err.message);
          } else {
            const checkinTime = new Date().toLocaleString('zh-TW', {
              timeZone: 'Asia/Taipei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            console.log(`✅ NFC 報到成功! 卡號: ${cardUid}, 時間: ${checkinTime}`);
          }
        });
      });

      reader.on('card.off', card => {
        console.log('📱 NFC 卡片已移除，等待下一張卡片...');
      });

      reader.on('error', err => {
        console.error('❌ NFC 報到讀卡機錯誤:', err.message);
      });
    });

    nfc.on('error', err => {
      console.error('❌ NFC 報到初始化錯誤:', err.message);
    });

    isNFCActive = true;
    return true;
  } catch (error) {
    console.error('❌ NFC 報到讀卡機初始化失敗:', error.message);
    return false;
  }
}

// 資料庫操作函數
function addNFCCheckin(cardUid, callback) {
  const stmt = db.prepare('INSERT INTO nfc_attendance (card_uid) VALUES (?)');
  stmt.run(cardUid, function(err) {
    if (err) {
      console.error('新增 NFC 報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      console.log(`✅ 卡號 ${cardUid} NFC 報到成功，ID: ${this.lastID}`);
      callback(null, this.lastID);
    }
  });
  stmt.finalize();
}

function getLastNFCCheckin(callback) {
  db.get(`
    SELECT id, card_uid, checkin_time, user_name, notes
    FROM nfc_attendance 
    ORDER BY id DESC 
    LIMIT 1
  `, (err, row) => {
    if (err) {
      console.error('查詢最後 NFC 報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      callback(null, row);
    }
  });
}

function getAllNFCCheckins(callback) {
  db.all(`
    SELECT id, card_uid, checkin_time, user_name, notes
    FROM nfc_attendance 
    ORDER BY id DESC
    LIMIT 100
  `, (err, rows) => {
    if (err) {
      console.error('查詢所有 NFC 報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// API 路由

// 取得最後一筆 NFC 報到紀錄 (公開訪問，用於顯示)
router.get('/last-checkin', (req, res) => {
  getLastNFCCheckin((err, row) => {
    if (err) {
      res.status(500).json({ error: '查詢資料庫錯誤' });
    } else {
      if (row) {
        // 格式化時間
        const formattedTime = new Date(row.checkin_time).toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        res.json({
          ...row,
          checkin_time: formattedTime
        });
      } else {
        res.json({ message: '尚無 NFC 報到紀錄' });
      }
    }
  });
});

// 取得所有 NFC 報到紀錄 (需要認證)
router.get('/all-checkins', authenticateToken, (req, res) => {
  getAllNFCCheckins((err, rows) => {
    if (err) {
      res.status(500).json({ error: '查詢資料庫錯誤' });
    } else {
      const formattedRows = rows.map(row => ({
        ...row,
        checkin_time: new Date(row.checkin_time).toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }));
      res.json(formattedRows);
    }
  });
});

// 取得 NFC 系統狀態 (公開訪問，用於顯示)
router.get('/status', (req, res) => {
  const isSimulated = nfcReader && nfcReader.simulated;
  res.json({
    status: 'running',
    nfcActive: isNFCActive,
    readerConnected: nfcReader !== null,
    simulated: isSimulated,
    message: isSimulated ? 'NFC 報到系統運行中 (模擬模式)' : 'NFC 報到系統運行中',
    timestamp: new Date().toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei'
    })
  });
});

// 手動新增 NFC 報到紀錄 (需要認證)
router.post('/manual-checkin', authenticateToken, (req, res) => {
  const { cardUid, userName, notes } = req.body;
  
  if (!cardUid) {
    return res.status(400).json({ success: false, message: '缺少卡片 UID' });
  }
  
  const stmt = db.prepare('INSERT INTO nfc_attendance (card_uid, user_name, notes) VALUES (?, ?, ?)');
  stmt.run(cardUid, userName || null, notes || null, function(err) {
    if (err) {
      console.error('手動新增 NFC 報到紀錄錯誤:', err.message);
      res.status(500).json({ success: false, message: '新增報到紀錄失敗' });
    } else {
      const checkinTime = new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      res.json({ 
        success: true, 
        message: `手動新增 NFC 報到成功`,
        data: {
          id: this.lastID,
          card_uid: cardUid,
          user_name: userName,
          notes: notes,
          checkin_time: checkinTime
        }
      });
    }
  });
  stmt.finalize();
});

// 啟動 NFC 讀卡機
router.post('/start-reader', authenticateToken, (req, res) => {
  if (isNFCActive) {
    const isSimulated = nfcReader && nfcReader.simulated;
    const message = isSimulated ? 'NFC 讀卡機已在運行中 (模擬模式)' : 'NFC 讀卡機已在運行中';
    res.json({ success: true, message });
  } else {
    const success = initializeNFCReader();
    if (success) {
      const isSimulated = nfcReader && nfcReader.simulated;
      const message = isSimulated ? 'NFC 讀卡機啟動成功 (模擬模式)' : 'NFC 讀卡機啟動成功';
      res.json({ success: true, message });
    } else {
      res.status(500).json({ success: false, message: 'NFC 讀卡機啟動失敗' });
    }
  }
});

// 模擬 NFC 卡片掃描 (僅在生產環境的模擬模式下可用)
router.post('/simulate-scan', authenticateToken, (req, res) => {
  const { cardUid } = req.body;
  
  if (!cardUid) {
    return res.status(400).json({ success: false, message: '請提供卡片 UID' });
  }
  
  const isSimulated = nfcReader && nfcReader.simulated;
  if (!isSimulated) {
    return res.status(400).json({ success: false, message: '此功能僅在模擬模式下可用' });
  }
  
  // 模擬卡片掃描
  console.log(`🏷️  模擬 NFC 報到偵測到卡片 UID: ${cardUid}`);
  
  addNFCCheckin(cardUid, (err, id) => {
    if (err) {
      console.error('❌ 模擬 NFC 報到失敗:', err.message);
      res.status(500).json({ success: false, message: '報到失敗' });
    } else {
      const checkinTime = new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      console.log(`✅ 模擬 NFC 報到成功! 卡號: ${cardUid}, 時間: ${checkinTime}`);
      res.json({ 
        success: true, 
        message: '模擬 NFC 報到成功',
        cardUid,
        checkinTime,
        id
      });
    }
  });
});

// 系統管理 - 啟動 NFC 系統
router.post('/start-system', authenticateToken, (req, res) => {
  const { exec } = require('child_process');
  const path = require('path');
  
  // 獲取項目根目錄路徑
  const projectRoot = path.resolve(__dirname, '..');
  const scriptPath = path.join(projectRoot, 'start-nfc-system.sh');
  
  console.log('🚀 執行 NFC 系統啟動腳本:', scriptPath);
  
  // 執行啟動腳本
  exec(`bash "${scriptPath}"`, { cwd: projectRoot }, (error, stdout, stderr) => {
    if (error) {
      console.error('啟動腳本執行錯誤:', error);
      return res.status(500).json({
        success: false,
        error: '系統啟動失敗',
        details: error.message,
        stderr: stderr
      });
    }
    
    console.log('✅ NFC 系統啟動腳本執行完成');
    console.log('輸出:', stdout);
    
    res.json({
      success: true,
      message: 'NFC 系統啟動成功',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

// 系統管理 - 停止 NFC 系統
router.post('/stop-system', authenticateToken, (req, res) => {
  const { exec } = require('child_process');
  const path = require('path');
  
  // 獲取項目根目錄路徑
  const projectRoot = path.resolve(__dirname, '..');
  const scriptPath = path.join(projectRoot, 'stop-nfc-system.sh');
  
  console.log('🛑 執行 NFC 系統停止腳本:', scriptPath);
  
  // 執行停止腳本
  exec(`bash "${scriptPath}"`, { cwd: projectRoot }, (error, stdout, stderr) => {
    if (error) {
      console.error('停止腳本執行錯誤:', error);
      return res.status(500).json({
        success: false,
        error: '系統停止失敗',
        details: error.message,
        stderr: stderr
      });
    }
    
    console.log('✅ NFC 系統停止腳本執行完成');
    console.log('輸出:', stdout);
    
    res.json({
      success: true,
      message: 'NFC 系統停止成功',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

// 接收本地 NFC Gateway Service 上傳的報到資料 (公開訪問)
router.post('/submit', async (req, res) => {
  try {
    const { cardUid, timestamp, source } = req.body;
    
    if (!cardUid) {
      return res.status(400).json({
        success: false,
        message: '缺少卡片 UID'
      });
    }
    
    // 創建新的報到紀錄
    const checkinData = {
      cardUid: cardUid.toUpperCase(),
      checkinTime: timestamp ? new Date(timestamp) : new Date(),
      source: source || 'nfc-gateway',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    const newCheckin = new NFCCheckin(checkinData);
    const savedCheckin = await newCheckin.save();
    
    const formattedTime = typeof savedCheckin.getFormattedTime === 'function'
      ? savedCheckin.getFormattedTime()
      : (savedCheckin.formattedCheckinTime || (savedCheckin.checkinTime?.toISOString?.() || new Date().toISOString()));
    
    // 嘗試識別會員並同步到出席管理 + 交易
    const normalizedCardUid = checkinData.cardUid;
    let memberInfo = null;
    try {
      const memberResult = await pool.query(
        'SELECT id, name, email, company, industry, title, membership_level, status FROM users WHERE nfc_card_id = $1',
        [normalizedCardUid]
      );
      if (memberResult.rows.length > 0) {
        memberInfo = memberResult.rows[0];
      }
    } catch (err) {
      console.warn('查詢會員資料失敗(legacy submit):', err?.message || err);
    }

    if (memberInfo) {
      try {
        const recentEventResult = await pool.query(
          "SELECT id, title FROM events WHERE event_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY event_date DESC LIMIT 1"
        );
        if (recentEventResult.rows.length > 0) {
          const event = recentEventResult.rows[0];
          const existingRecord = await pool.query(
            'SELECT id FROM attendance_records WHERE user_id = $1 AND event_id = $2',
            [memberInfo.id, event.id]
          );
          if (existingRecord.rows.length === 0) {
            await pool.query(
              'INSERT INTO attendance_records (user_id, event_id, check_in_time) VALUES ($1, $2, $3)',
              [memberInfo.id, event.id, savedCheckin.checkinTime]
            );
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
            console.log(`✅ (legacy) 已同步出席與收入: ${memberInfo.name} -> ${event.title}`);
          }
        }
      } catch (syncErr) {
        console.warn('同步出席/交易失敗(legacy submit):', syncErr?.message || syncErr);
      }
    }

    // SSE 廣播，讓前端顯示彈窗
    try {
      broadcast('nfc-checkin', {
        id: savedCheckin._id,
        cardUid: savedCheckin.cardUid,
        checkinTime: formattedTime,
        readerName: savedCheckin.readerName,
        source: savedCheckin.source,
        timestamp: savedCheckin.checkinTime?.toISOString?.() || new Date().toISOString(),
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
      console.warn('SSE 廣播失敗 (legacy submit):', e?.message || e);
    }
    
    console.log(`✅ NFC 報到資料已儲存到 MongoDB! 卡號: ${cardUid}, 時間: ${formattedTime}`);
    
    res.json({
      success: true,
      message: memberInfo ? `✅ ${memberInfo.name} 報到成功！` : 'NFC 報到成功',
      id: savedCheckin._id,
      cardUid: savedCheckin.cardUid,
      checkinTime: formattedTime,
      source: savedCheckin.source,
      member: memberInfo || null,
      isRegisteredMember: !!memberInfo,
    });
    
  } catch (error) {
    console.error('❌ 儲存 NFC 報到資料失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '儲存報到資料失敗',
      error: error.message
    });
  }
});

// 查詢所有報到紀錄 (需要認證)
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, cardUid, startDate, endDate } = req.query;
    
    // 建立查詢條件
    let filter = {};
    
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
    
    // 執行查詢
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const records = await NFCCheckin.findActive(filter)
      .sort({ checkinTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await NFCCheckin.countCheckins(filter);
    
    // 格式化回應資料
    const formattedRecords = records.map(record => ({
      id: record._id,
      cardUid: record.cardUid,
      checkinTime: record.getFormattedTime(),
      source: record.source,
      notes: record.notes,
      createdAt: record.createdAt
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
    console.error('❌ 查詢報到紀錄失敗:', error.message);
    console.error('❌ 錯誤詳情:', error.stack);
    console.error('❌ MongoDB 連接狀態:', mongoose.connection.readyState);
    res.status(500).json({
      success: false,
      message: '查詢報到紀錄失敗',
      error: error.message,
      mongoStatus: mongoose.connection.readyState
    });
  }
});

// 初始化 NFC 讀卡機 (如果可用)
if (NFC) {
  setTimeout(() => {
    initializeNFCReader();
  }, 2000); // 延遲 2 秒啟動，避免與其他 NFC 服務衝突
}

// 程式結束時關閉資料庫
process.on('SIGINT', () => {
  console.log('\n正在關閉 NFC 報到資料庫...');
  db.close((err) => {
    if (err) {
      console.error('關閉 NFC 報到資料庫錯誤:', err.message);
    } else {
      console.log('✅ NFC 報到資料庫連線已關閉');
    }
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在關閉 NFC 報到資料庫...');
  db.close((err) => {
    if (err) {
      console.error('關閉 NFC 報到資料庫錯誤:', err.message);
    } else {
      console.log('✅ NFC 報到資料庫連線已關閉');
    }
  });
});

module.exports = router;
// Provide a shared SSE endpoint alias here too, so any clients listening on /api/nfc-checkin/events also receive events
router.get('/events', (req, res) => {
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders?.();

res.write(`event: ping\n` + `data: ${JSON.stringify({ time: Date.now() })}\n\n`);
addClient(res);

const keepAlive = setInterval(() => {
try {
res.write(`event: ping\n` + `data: ${JSON.stringify({ time: Date.now() })}\n\n`);
} catch (e) {
clearInterval(keepAlive);
removeClient(res);
}
}, 25000);

req.on('close', () => {
clearInterval(keepAlive);
removeClient(res);
});
});