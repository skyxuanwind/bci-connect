# NFC 報到系統

這是一個完整的三層 NFC 報到系統，包含本地端 NFC Gateway Service、雲端 Express API 和 React 前端。

## 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │    │  雲端 Express   │    │ 本地 NFC Gateway│
│  (Port: 3000)   │◄──►│   API Server    │◄──►│   Service       │
│                 │    │  (Port: 5000)   │    │  (Port: 3002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    MongoDB      │    │   ACR122U NFC   │
                       │   資料庫儲存     │    │     讀卡機      │
                       └─────────────────┘    └─────────────────┘
```

## 功能特色

### 🎯 核心功能
- **NFC 卡片讀取**: 使用 ACR122U 讀卡機讀取 NFC 卡號
- **即時報到**: 讀取卡片後立即上傳到雲端儲存
- **防重複讀取**: 5秒內同一張卡片不會重複處理
- **報到記錄查詢**: 提供完整的報到記錄查詢功能
- **狀態監控**: 即時顯示 NFC Gateway Service 狀態

### 🔧 技術特色
- **三層架構**: 前端、API、本地服務分離
- **雲端部署友好**: 雲端不需要直接存取 NFC 硬體
- **MongoDB 儲存**: 使用 MongoDB 儲存報到記錄
- **RESTful API**: 標準化的 API 設計
- **現代化 UI**: React + Tailwind CSS

## 快速開始

### 1. 環境需求

- Node.js 16+
- MongoDB
- ACR122U NFC 讀卡機
- macOS (已測試)

### 2. 安裝依賴

```bash
# 安裝主項目依賴
npm install

# 安裝本地 NFC Gateway Service 依賴
cd nfc-gateway-service
npm install
cd ..

# 安裝前端依賴
cd client
npm install
cd ..
```

### 3. 環境配置

```bash
# 複製環境變數配置文件
cp .env.example .env
cp nfc-gateway-service/.env.example nfc-gateway-service/.env

# 編輯 .env 文件，設定 MongoDB 連接字串
# MONGODB_URI=mongodb://localhost:27017/bci_connect
```

### 4. 啟動服務

#### 啟動 MongoDB
```bash
# macOS 使用 Homebrew
brew services start mongodb-community

# 或直接啟動
mongod
```

#### 啟動雲端 API 服務器
```bash
npm start
# 服務將在 http://localhost:5000 啟動
```

#### 啟動本地 NFC Gateway Service
```bash
cd nfc-gateway-service
npm start
# 服務將在 http://localhost:3002 啟動
```

#### 啟動前端
```bash
cd client
npm start
# 前端將在 http://localhost:3000 啟動
```

## 使用說明

### 1. 訪問 NFC 報到系統

1. 打開瀏覽器訪問 `http://localhost:3000`
2. 登入系統
3. 導航到 `/nfc-report-system` 頁面

### 2. 開始使用 NFC 報到

1. **檢查 Gateway 狀態**: 頁面會自動檢查本地 NFC Gateway Service 狀態
2. **啟動讀卡機**: 點擊「啟動 NFC 讀卡機」按鈕
3. **放置 NFC 卡片**: 將 NFC 卡片放在 ACR122U 讀卡機上
4. **查看結果**: 系統會顯示讀取的卡號和報到狀態
5. **查看記錄**: 在「最近報到記錄」區域查看報到歷史

### 3. API 端點

#### 雲端 API (Port: 5000)
- `POST /api/nfc-checkin/submit` - 接收報到資料
- `GET /api/nfc-checkin/records` - 查詢報到記錄

#### 本地 Gateway Service (Port: 3002)
- `POST /api/nfc-checkin/start-reader` - 啟動 NFC 讀卡機
- `GET /api/nfc-checkin/status` - 獲取服務狀態
- `POST /api/nfc-checkin/test-upload` - 測試上傳功能
- `GET /health` - 健康檢查

## 故障排除

### NFC 讀卡機問題

1. **讀卡機無法識別**
   ```bash
   # 檢查讀卡機連接
   system_profiler SPUSBDataType | grep -A 10 "ACR122U"
   ```

2. **權限問題**
   ```bash
   # 可能需要 sudo 權限啟動 Gateway Service
   sudo npm start
   ```

### 服務連接問題

1. **Gateway Service 無法連接**
   - 確認 Gateway Service 已啟動 (Port: 3002)
   - 檢查防火牆設定
   - 確認 `.env` 中的 `NFC_GATEWAY_URL` 設定正確

2. **MongoDB 連接問題**
   - 確認 MongoDB 服務已啟動
   - 檢查 `MONGODB_URI` 設定
   - 確認資料庫權限

### 常見錯誤

1. **「PCSC service not available」**
   ```bash
   # macOS 重啟 PCSC 服務
   sudo launchctl unload /System/Library/LaunchDaemons/com.apple.securityd.plist
   sudo launchctl load /System/Library/LaunchDaemons/com.apple.securityd.plist
   ```

2. **「Card reader not found」**
   - 重新插拔 USB 讀卡機
   - 重啟 Gateway Service

## 開發說明

### 項目結構

```
.
├── client/                 # React 前端
│   └── src/pages/NFCReportSystem.js
├── nfc-gateway-service/    # 本地 NFC Gateway Service
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── routes/
│   └── nfc-checkin.js     # NFC API 路由
├── models/
│   └── NFCCheckin.js      # MongoDB 模型
├── config/
│   └── mongodb.js         # MongoDB 配置
└── server.js              # 主服務器
```

### 資料庫 Schema

```javascript
{
  cardUid: String,        // NFC 卡號
  checkinTime: Date,      // 報到時間
  readerName: String,     // 讀卡機名稱
  source: String,         // 來源 (gateway)
  ipAddress: String,      // IP 地址
  userAgent: String,      // 用戶代理
  notes: String,          // 備註
  isDeleted: Boolean      // 軟刪除標記
}
```

### 自定義配置

1. **修改防重複讀取時間**
   ```javascript
   // nfc-gateway-service/server.js
   const DUPLICATE_PREVENTION_TIME = 5000; // 毫秒
   ```

2. **修改上傳 API 端點**
   ```javascript
   // nfc-gateway-service/server.js
   const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://localhost:5000';
   ```

## 部署說明

### 雲端部署 (Render/Vercel)

1. **部署 Express API**
   - 上傳代碼到 GitHub
   - 在 Render 創建 Web Service
   - 設定環境變數 (特別是 `MONGODB_URI`)
   - 部署完成後獲得 API URL

2. **部署 React 前端**
   - 在 Vercel 部署前端
   - 設定 API 端點指向雲端 API

3. **本地 Gateway Service**
   - 修改 `.env` 中的 `CLOUD_API_URL` 為雲端 API URL
   - 在本地機器上運行 Gateway Service

### 生產環境注意事項

1. **安全性**
   - 設定強密碼和 API Key
   - 使用 HTTPS
   - 限制 API 訪問權限

2. **監控**
   - 設定日誌監控
   - 監控 Gateway Service 狀態
   - 設定報警機制

## 授權

MIT License

## 支援

如有問題，請查看故障排除部分或聯繫開發團隊。