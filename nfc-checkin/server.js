const express = require('express');
const { WebSocketServer } = require('ws');
const { NFC } = require('nfc-pcsc');

const app = express();
const PORT = 3000;

// 提供前端頁面
app.use(express.static('public'));

// 啟動 HTTP server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// 啟動 WebSocket server
const wss = new WebSocketServer({ server });

// 當有瀏覽器連線
wss.on('connection', (ws) => {
  console.log('🌐 前端已連線 WebSocket');
  ws.send(JSON.stringify({ msg: '已連線 NFC 系統，請刷卡' }));
});

// 啟動 NFC 讀卡
const nfc = new NFC();

nfc.on('reader', reader => {
  console.log(`📶 偵測到讀卡機: ${reader.reader.name}`);

  reader.on('card', card => {
    console.log(`💳 卡片 UID: ${card.uid}`);

    // 廣播給所有前端
    wss.clients.forEach(client => {
      client.send(JSON.stringify({ uid: card.uid, time: new Date() }));
    });
  });

  reader.on('error', err => {
    console.error(`❌ 讀卡機錯誤: ${err}`);
  });

  reader.on('end', () => {
    console.log(`🔌 讀卡機移除: ${reader.reader.name}`);
  });
});

nfc.on('error', err => {
  console.error('❌ NFC 錯誤:', err);
});