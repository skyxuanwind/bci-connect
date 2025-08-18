// 嘗試載入 nfc-pcsc 套件，如果不存在則設為 null
let NFC = null;
try {
  const nfcPcsc = require('nfc-pcsc');
  NFC = nfcPcsc.NFC;
  console.log('✅ NFC-PCSC 套件載入成功');
} catch (error) {
  console.log('⚠️  NFC-PCSC 套件未安裝或不可用 (這在生產環境是正常的)');
  console.log('   本地 NFC 功能將被停用');
}

const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const express = require('express');

// 建立 Express 應用程式
const app = express();
app.use(cors());
app.use(express.json());

// 建立 HTTP 伺服器
const server = http.createServer(app);

// 建立 Socket.IO 伺服器
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5001"],
    methods: ["GET", "POST"]
  }
});

// NFC 讀卡機狀態
let nfcReader = null;
let isReading = false;
let connectedClients = new Set();

console.log('🔧 啟動 NFC 本地伺服器...');
console.log('📡 支援的 NFC 讀卡機: ACR122U, SCL3711 等 PC/SC 相容設備');

// Socket.IO 連線處理
io.on('connection', (socket) => {
  console.log(`🔗 客戶端已連線: ${socket.id}`);
  connectedClients.add(socket.id);
  
  // 發送當前 NFC 讀卡機狀態
  socket.emit('nfc-status', {
    readerConnected: nfcReader !== null,
    isReading: isReading
  });
  
  // 處理開始 NFC 讀取請求
  socket.on('start-nfc-reading', () => {
    console.log('📱 收到開始 NFC 讀取請求');
    startNFCReading(socket);
  });
  
  // 處理停止 NFC 讀取請求
  socket.on('stop-nfc-reading', () => {
    console.log('⏹️ 收到停止 NFC 讀取請求');
    stopNFCReading(socket);
  });
  
  // 處理客戶端斷線
  socket.on('disconnect', () => {
    console.log(`❌ 客戶端已斷線: ${socket.id}`);
    connectedClients.delete(socket.id);
    
    // 如果沒有客戶端連線，停止 NFC 讀取
    if (connectedClients.size === 0 && isReading) {
      stopNFCReading();
    }
  });
});

// 初始化 NFC 讀卡機
function initializeNFC() {
  // 檢查 NFC 套件是否可用
  if (!NFC) {
    console.log('❌ NFC-PCSC 套件不可用，跳過 NFC 初始化');
    // 通知所有客戶端 NFC 不可用
    io.emit('nfc-status', {
      readerConnected: false,
      readerName: null,
      isReading: false,
      error: 'NFC-PCSC 套件在此環境中不可用'
    });
    return;
  }
  
  try {
    const nfc = new NFC();
    
    nfc.on('reader', reader => {
      console.log(`🎯 NFC 讀卡機已連接: ${reader.reader.name}`);
      nfcReader = reader;
      
      // 通知所有客戶端讀卡機已連接
      io.emit('nfc-status', {
        readerConnected: true,
        readerName: reader.reader.name,
        isReading: isReading
      });
      
      // 監聽卡片事件
      reader.on('card', card => {
        if (isReading) {
          console.log(`💳 檢測到 NFC 卡片:`, {
            uid: card.uid,
            atr: card.atr.toString('hex'),
            type: card.type
          });
          
          // 發送卡片資料到所有連接的客戶端
          io.emit('nfc-card-detected', {
            uid: card.uid,
            atr: card.atr.toString('hex'),
            type: card.type,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      reader.on('card.off', card => {
        if (isReading) {
          console.log(`📤 NFC 卡片已移除: ${card.uid}`);
          io.emit('nfc-card-removed', {
            uid: card.uid,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      reader.on('error', err => {
        console.error(`❌ NFC 讀卡機錯誤:`, err);
        io.emit('nfc-error', {
          message: err.message,
          timestamp: new Date().toISOString()
        });
      });
      
      reader.on('end', () => {
        console.log(`🔌 NFC 讀卡機已斷線: ${reader.reader.name}`);
        nfcReader = null;
        isReading = false;
        
        // 通知所有客戶端讀卡機已斷線
        io.emit('nfc-status', {
          readerConnected: false,
          isReading: false
        });
      });
    });
    
    nfc.on('error', err => {
      console.error('❌ NFC 初始化錯誤:', err);
      
      // 通知客戶端 NFC 初始化失敗
      io.emit('nfc-error', {
        message: 'NFC 讀卡機初始化失敗: ' + err.message,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('❌ NFC 模組載入失敗:', error);
    console.log('💡 請確認:');
    console.log('   1. ACR122U 讀卡機已正確連接');
    console.log('   2. 已安裝相關驅動程式');
    console.log('   3. 讀卡機未被其他應用程式佔用');
  }
}

// 開始 NFC 讀取
function startNFCReading(socket = null) {
  if (!NFC) {
    const errorMsg = 'NFC-PCSC 套件在此環境中不可用';
    console.log(`❌ ${errorMsg}`);
    if (socket) {
      socket.emit('nfc-error', { message: errorMsg });
    }
    return;
  }
  
  if (!nfcReader) {
    const errorMsg = 'NFC 讀卡機未連接';
    console.log(`❌ ${errorMsg}`);
    if (socket) {
      socket.emit('nfc-error', { message: errorMsg });
    }
    return;
  }
  
  if (isReading) {
    const infoMsg = 'NFC 讀取已在進行中';
    console.log(`ℹ️ ${infoMsg}`);
    if (socket) {
      socket.emit('nfc-info', { message: infoMsg });
    }
    return;
  }
  
  isReading = true;
  console.log('🚀 開始 NFC 讀取...');
  
  // 通知所有客戶端開始讀取
  io.emit('nfc-status', {
    readerConnected: true,
    isReading: true
  });
  
  io.emit('nfc-reading-started', {
    message: '請將 NFC 卡片靠近讀卡機...',
    timestamp: new Date().toISOString()
  });
}

// 停止 NFC 讀取
function stopNFCReading(socket = null) {
  if (!NFC) {
    const errorMsg = 'NFC-PCSC 套件在此環境中不可用';
    console.log(`❌ ${errorMsg}`);
    if (socket) {
      socket.emit('nfc-error', { message: errorMsg });
    }
    return;
  }
  
  if (!isReading) {
    const infoMsg = 'NFC 讀取未在進行中';
    console.log(`ℹ️ ${infoMsg}`);
    if (socket) {
      socket.emit('nfc-info', { message: infoMsg });
    }
    return;
  }
  
  isReading = false;
  console.log('⏹️ 停止 NFC 讀取');
  
  // 通知所有客戶端停止讀取
  io.emit('nfc-status', {
    readerConnected: nfcReader !== null,
    isReading: false
  });
  
  io.emit('nfc-reading-stopped', {
    message: 'NFC 讀取已停止',
    timestamp: new Date().toISOString()
  });
}

// REST API 端點
app.get('/api/nfc/status', (req, res) => {
  res.json({
    success: true,
    nfcAvailable: NFC !== null,
    readerConnected: nfcReader !== null,
    readerName: nfcReader ? nfcReader.reader.name : null,
    isReading: isReading,
    connectedClients: connectedClients.size,
    message: NFC ? 'NFC 服務可用' : 'NFC-PCSC 套件在此環境中不可用'
  });
});

app.post('/api/nfc/start', (req, res) => {
  startNFCReading();
  res.json({
    success: true,
    message: 'NFC 讀取已啟動'
  });
});

app.post('/api/nfc/stop', (req, res) => {
  stopNFCReading();
  res.json({
    success: true,
    message: 'NFC 讀取已停止'
  });
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nfcReaderConnected: nfcReader !== null,
    isReading: isReading
  });
});

// 啟動伺服器
const PORT = process.env.NFC_SERVER_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 NFC 本地伺服器運行在 http://localhost:${PORT}`);
  console.log(`🔌 WebSocket 伺服器運行在 ws://localhost:${PORT}`);
  console.log('📋 可用的 API 端點:');
  console.log(`   GET  /api/nfc/status - 獲取 NFC 狀態`);
  console.log(`   POST /api/nfc/start  - 開始 NFC 讀取`);
  console.log(`   POST /api/nfc/stop   - 停止 NFC 讀取`);
  console.log(`   GET  /health        - 健康檢查`);
  console.log('');
  console.log('🔧 正在初始化 NFC 讀卡機...');
  
  // 初始化 NFC
  initializeNFC();
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉 NFC 伺服器...');
  
  if (isReading) {
    stopNFCReading();
  }
  
  server.close(() => {
    console.log('✅ NFC 伺服器已關閉');
    process.exit(0);
  });
});

module.exports = { app, server, io };