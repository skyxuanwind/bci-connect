# NFC 報到系統

使用 ACR122U NFC 讀卡機的簡單報到系統

## 🔧 環境需求

- Node.js (建議 v16 以上)
- ACR122U NFC 讀卡機
- macOS/Windows/Linux

## 📦 安裝套件

```bash
npm install
```

## 🚀 啟動系統

```bash
node server.js
```

或使用開發模式（自動重啟）：

```bash
npm run dev
```

## 📱 使用方式

1. 確保 ACR122U NFC 讀卡機已連接到電腦
2. 執行 `node server.js` 啟動系統
3. 開啟瀏覽器訪問 `http://localhost:3000`
4. 將 NFC 卡片靠近讀卡機即可報到

## 🔗 API 端點

- `GET /` - 前端報到頁面
- `GET /last-checkin` - 取得最後一筆報到紀錄
- `GET /all-checkins` - 取得所有報到紀錄
- `GET /status` - 系統狀態檢查

## 📊 資料庫

使用 SQLite 資料庫，檔案會自動建立在 `attendance.db`

資料表結構：
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uid TEXT NOT NULL,
  checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ 故障排除

### NFC 讀卡機無法偵測

1. 確認 ACR122U 已正確連接 USB
2. 檢查是否有其他程式正在使用讀卡機
3. 重新插拔 USB 連接線
4. 重啟應用程式

### 網頁無法開啟

1. 確認伺服器已成功啟動
2. 檢查 3000 埠是否被其他程式佔用
3. 嘗試訪問 `http://127.0.0.1:3000`

## 📝 功能特色

- ✅ 即時 NFC 卡片偵測
- ✅ 自動報到紀錄儲存
- ✅ 網頁即時更新顯示
- ✅ SQLite 輕量級資料庫
- ✅ 簡潔美觀的使用介面
- ✅ RESTful API 支援

## 📄 授權

MIT License