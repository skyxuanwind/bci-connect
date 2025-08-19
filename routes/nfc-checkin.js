const express = require('express');
const router = express.Router();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { authenticateToken } = require('../middleware/auth');

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