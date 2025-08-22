const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// NFC 讀卡機相關（改為可選依賴，缺失時啟動降級模式而非直接退出）
let NFC = null;
let nfcModuleAvailable = false;
try {
  const nfcPcsc = require('nfc-pcsc');
  NFC = nfcPcsc.NFC;
  nfcModuleAvailable = true;
  console.log('✅ NFC-PCSC 套件載入成功');
} catch (error) {
  nfcModuleAvailable = false;
  console.log('⚠️  NFC-PCSC 套件未安裝或不可用，將以「降級模式」啟動（不讀取實體卡片）');
  console.log('   如需啟用實體讀卡，請於本機執行: cd nfc-gateway-service && npm install nfc-pcsc');
}

const app = express();
const PORT = process.env.PORT || 3002;

// 雲端 API 設定
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://bci-connect.onrender.com';

// 中間件設定
app.use(cors());
app.use(express.json());

// NFC 讀卡機狀態
let nfcReader = null;
let isNFCActive = false;
let lastCardUid = null;
let lastScanTime = null;

// 初始化 NFC 讀卡機
function initializeNFCReader() {
  if (!nfcModuleAvailable || !NFC) {
    console.log('❌ NFC 模組不可用，無法啟動讀卡機（仍可使用 API 與測試上傳端點）');
    return false;
  }

  try {
    console.log('🔍 正在搜尋 NFC 讀卡機...');
    const nfc = new NFC();

    nfc.on('reader', reader => {
      console.log(`✅ 找到 NFC 讀卡機: ${reader.reader.name}`);
      console.log('📱 等待 NFC 卡片...');
      nfcReader = reader;

      reader.on('card', async card => {
        const cardUid = card.uid;
        const currentTime = Date.now();
        
        // 防止重複讀取同一張卡片（3秒內）
        if (lastCardUid === cardUid && currentTime - lastScanTime < 3000) {
          console.log(`⏭️  忽略重複卡片: ${cardUid}`);
          return;
        }
        
        lastCardUid = cardUid;
        lastScanTime = currentTime;
        
        console.log(`\n🏷️  偵測到卡片 UID: ${cardUid}`);
        
        // 上傳到雲端 API
        try {
          const response = await axios.post(`${CLOUD_API_URL}/api/nfc-checkin/submit`, {
            cardUid: cardUid,
            timestamp: new Date().toISOString(),
            source: 'nfc-gateway'
          });
          
          if (response.data.success) {
            console.log(`✅ 報到成功上傳到雲端! 卡號: ${cardUid}`);
            console.log(`   時間: ${response.data.checkinTime}`);
            console.log(`   ID: ${response.data.id}`);
          } else {
            console.log(`❌ 雲端報到失敗: ${response.data.message}`);
          }
        } catch (error) {
          console.error(`❌ 上傳到雲端失敗:`, error.message);
          if (error.response) {
            console.error(`   狀態碼: ${error.response.status}`);
            console.error(`   錯誤訊息: ${error.response.data?.message || error.response.statusText}`);
          }
        }
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

    isNFCActive = true;
    return true;
  } catch (error) {
    console.error('❌ NFC 讀卡機初始化失敗:', error.message);
    return false;
  }
}

// API 路由

// 啟動 NFC 讀卡機
app.post('/api/nfc-checkin/start-reader', (req, res) => {
  console.log('📡 收到啟動 NFC 讀卡機請求');
  
  if (!nfcModuleAvailable) {
    return res.status(503).json({
      success: false,
      message: 'NFC 模組不可用，已在降級模式運行（無法使用實體讀卡）'
    });
  }
  
  if (isNFCActive && nfcReader) {
    res.json({
      success: true,
      message: 'NFC 讀卡機已在運行中',
      readerName: nfcReader.reader.name
    });
    return;
  }

  const success = initializeNFCReader();
  if (success) {
    res.json({
      success: true,
      message: 'NFC 讀卡機啟動成功',
      readerName: nfcReader ? nfcReader.reader.name : null
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'NFC 讀卡機啟動失敗'
    });
  }
});

// 獲取 NFC 狀態
app.get('/api/nfc-checkin/status', (req, res) => {
  res.json({
    status: 'running',
    nfcModuleAvailable,
    nfcActive: isNFCActive && !!nfcReader,
    readerConnected: nfcReader !== null,
    readerName: nfcReader ? nfcReader.reader.name : null,
    message: nfcModuleAvailable
      ? (isNFCActive ? 'NFC Gateway Service 運行中' : 'NFC 讀卡機未啟動')
      : 'NFC 模組不可用（降級模式）',
    cloudApiUrl: CLOUD_API_URL,
    lastCardUid: lastCardUid,
    lastScanTime: lastScanTime ? new Date(lastScanTime).toLocaleString('zh-TW') : null,
    timestamp: new Date().toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei'
    })
  });
});

// 手動測試上傳
app.post('/api/nfc-checkin/test-upload', async (req, res) => {
  const { cardUid } = req.body;
  
  if (!cardUid) {
    return res.status(400).json({
      success: false,
      message: '請提供卡片 UID'
    });
  }
  
  try {
    const response = await axios.post(`${CLOUD_API_URL}/api/nfc-checkin/submit`, {
      cardUid: cardUid,
      timestamp: new Date().toISOString(),
      source: 'manual-test'
    });
    
    res.json({
      success: true,
      message: '測試上傳成功',
      cloudResponse: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '測試上傳失敗',
      error: error.message
    });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NFC Gateway Service',
    timestamp: new Date().toISOString(),
    nfcModuleAvailable,
    nfcActive: isNFCActive,
    readerConnected: nfcReader !== null
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`\n🚀 NFC Gateway Service 已啟動`);
  console.log(`📱 本地服務: http://localhost:${PORT}`);
  console.log(`☁️  雲端 API: ${CLOUD_API_URL}`);
  console.log(`🔗 API 端點:`);
  console.log(`   POST /api/nfc-checkin/start-reader  - 啟動 NFC 讀卡機`);
  console.log(`   GET  /api/nfc-checkin/status        - 獲取 NFC 狀態`);
  console.log(`   POST /api/nfc-checkin/test-upload   - 手動測試上傳`);
  console.log(`   GET  /health                        - 健康檢查`);
  console.log(`\n等待啟動指令...\n`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n正在關閉 NFC Gateway Service...');
  if (nfcReader) {
    try {
      nfcReader.close();
    } catch (error) {
      console.error('關閉 NFC 讀卡機錯誤:', error.message);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在關閉 NFC Gateway Service...');
  if (nfcReader) {
    try {
      nfcReader.close();
    } catch (error) {
      console.error('關閉 NFC 讀卡機錯誤:', error.message);
    }
  }
  process.exit(0);
});