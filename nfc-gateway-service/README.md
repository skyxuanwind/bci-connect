# NFC Gateway Service

本地端 NFC Gateway Service - 讀取 NFC 卡號並上傳到雲端 API

## 🔧 環境需求

- Node.js (建議 v16 以上)
- ACR122U NFC 讀卡機
- macOS/Windows/Linux
- 穩定的網路連線（用於上傳到雲端）

## 📦 安裝套件

```bash
cd nfc-gateway-service
npm install
```

## ⚙️ 環境設定

1. 複製環境變數範例檔案：
```bash
cp .env.example .env
```

2. 編輯 `.env` 檔案，設定雲端 API URL：
```env
# 生產環境
CLOUD_API_URL=https://bci-connect.onrender.com

# 或開發環境
CLOUD_API_URL=http://localhost:5001
```

## 🚀 啟動服務

```bash
# 正式啟動
npm start

# 開發模式（自動重啟）
npm run dev
```

## 📱 使用方式

### 1. 啟動 NFC 讀卡機

發送 POST 請求到本地服務：
```bash
curl -X POST http://localhost:3002/api/nfc-checkin/start-reader
```

或透過前端 React 應用程式的「開始報到」按鈕。

### 2. NFC 卡片掃描

1. 確保 ACR122U NFC 讀卡機已連接
2. 將 NFC 卡片靠近讀卡機
3. 系統自動讀取卡號並上傳到雲端
4. 查看控制台日誌確認上傳狀態

## 🔗 API 端點

### 本地端點

- `POST /api/nfc-checkin/start-reader` - 啟動 NFC 讀卡機
- `GET /api/nfc-checkin/status` - 獲取 NFC 狀態
- `POST /api/nfc-checkin/test-upload` - 手動測試上傳
- `GET /health` - 健康檢查

### 雲端端點（自動上傳目標）

- `POST /api/nfc-checkin/submit` - 接收 NFC 報到資料

## 📊 系統架構

```
[NFC 讀卡機] → [本地 Gateway Service] → [雲端 Express API] → [MongoDB]
     ↓                    ↓                      ↓              ↓
  讀取卡號            處理 & 上傳            儲存資料        持久化
```

## 🛠️ 故障排除

### NFC 讀卡機無法偵測

1. 確認 ACR122U 已正確連接 USB
2. 檢查是否有其他程式正在使用讀卡機
3. 重新插拔 USB 連接線
4. 重啟 Gateway Service

### 無法上傳到雲端

1. 檢查網路連線
2. 確認 `CLOUD_API_URL` 設定正確
3. 檢查雲端 API 服務是否正常運行
4. 查看控制台錯誤訊息

### 重複讀取同一張卡片

系統內建 3 秒防重複機制，同一張卡片在 3 秒內不會重複上傳。

## 📝 日誌說明

- `✅ 找到 NFC 讀卡機` - 成功偵測到讀卡機
- `🏷️ 偵測到卡片 UID` - 讀取到 NFC 卡片
- `✅ 報到成功上傳到雲端` - 成功上傳到雲端 API
- `❌ 上傳到雲端失敗` - 上傳失敗，檢查網路或 API 狀態
- `⏭️ 忽略重複卡片` - 防重複機制作用

## 🔒 安全性

- 僅在本地網路運行
- 不儲存敏感資料
- 僅上傳卡片 UID 和時間戳
- 支援 HTTPS 上傳到雲端

## 📄 授權

MIT License