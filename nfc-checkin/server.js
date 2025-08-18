const express = require('express');
const path = require('path');
const { NFC } = require('nfc-pcsc');
const db = require('./db');

const app = express();
const PORT = 3000;

// 中間件設定
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 全域變數儲存最後報到資訊
let lastCheckinData = null;

// NFC 讀卡機初始化
const nfc = new NFC();

console.log('🔍 正在搜尋 NFC 讀卡機...');

nfc.on('reader', reader => {
  console.log(`✅ 找到 NFC 讀卡機: ${reader.reader.name}`);
  console.log('📱 等待 NFC 卡片...');

  reader.on('card', card => {
    const cardUid = card.uid;
    console.log(`\n🏷️  偵測到卡片 UID: ${cardUid}`);
    
    // 將報到資訊寫入資料庫
    db.addCheckin(cardUid, (err, id) => {
      if (err) {
        console.error('❌ 報到失敗:', err.message);
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
        
        lastCheckinData = {
          id: id,
          card_uid: cardUid,
          checkin_time: checkinTime
        };
        
        console.log(`✅ 報到成功! 卡號: ${cardUid}, 時間: ${checkinTime}`);
      }
    });
  });

  reader.on('card.off', card => {
    console.log('📱 卡片已移除，等待下一張卡片...');
  });

  reader.on('error', err => {
    console.error('❌ NFC 讀卡機錯誤:', err.message);
  });
});

nfc.on('error', err => {
  console.error('❌ NFC 初始化錯誤:', err.message);
  console.log('請確認:');
  console.log('1. ACR122U NFC 讀卡機已正確連接');
  console.log('2. 已安裝相關驅動程式');
  console.log('3. 沒有其他程式正在使用讀卡機');
});

// API 路由

// 取得最後一筆報到紀錄
app.get('/last-checkin', (req, res) => {
  db.getLastCheckin((err, row) => {
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
        res.json({ message: '尚無報到紀錄' });
      }
    }
  });
});

// 取得所有報到紀錄
app.get('/all-checkins', (req, res) => {
  db.getAllCheckins((err, rows) => {
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

// 系統狀態檢查
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'NFC 報到系統運行中',
    timestamp: new Date().toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei'
    })
  });
});

// 首頁路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`\n🚀 NFC 報到系統已啟動`);
  console.log(`📱 網頁介面: http://localhost:${PORT}`);
  console.log(`🔗 API 端點:`);
  console.log(`   - GET /last-checkin    (最後報到紀錄)`);
  console.log(`   - GET /all-checkins    (所有報到紀錄)`);
  console.log(`   - GET /status          (系統狀態)`);
  console.log(`\n等待 NFC 卡片刷卡...\n`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n正在關閉 NFC 報到系統...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在關閉 NFC 報到系統...');
  process.exit(0);
});