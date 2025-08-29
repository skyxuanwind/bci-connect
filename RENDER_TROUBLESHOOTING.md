# Render 部署故障排除指南

## 🚨 當前問題：500 內部服務器錯誤

用戶報告 `/api/auth/me` 端點返回 500 錯誤。根據分析，可能的原因包括：

### 1. 環境變量配置問題

**檢查清單**：
- [ ] `DATABASE_URL` - Render PostgreSQL 自動提供
- [ ] `JWT_SECRET` - 必須設置
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` - 可選，但如果設置錯誤可能影響啟動

**在 Render Dashboard 中檢查**：
1. 進入你的 Web Service
2. 點擊 "Environment" 標籤
3. 確認以下環境變量已正確設置：

```
NODE_ENV=production
JWT_SECRET=NM6yqqNoCA0p9XGLL6AM0EbpYLd6xUfd69mkX7PExnY=
JWT_EXPIRES_IN=7d
CLIENT_URL=https://bci-connect.onrender.com
FRONTEND_URL=https://bci-connect.onrender.com
QR_CODE_BASE_URL=https://bci-connect.onrender.com/member
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**可選環境變量**（如果不需要 MongoDB 功能可以不設置）：
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### 2. 檢查 Render 部署日誌

**步驟**：
1. 在 Render Dashboard 中打開你的服務
2. 點擊 "Logs" 標籤
3. 查找錯誤信息，特別是：
   - 數據庫連接錯誤
   - JWT 相關錯誤
   - 環境變量缺失錯誤
   - 啟動失敗錯誤

**常見錯誤模式**：
```
❌ JWT_SECRET is not defined
❌ Database connection failed
❌ Cannot read property 'xxx' of undefined
❌ Module not found
```

### 3. 測試 API 端點

**健康檢查端點**（這些應該正常工作）：
```bash
curl https://bci-connect.onrender.com/health
curl https://bci-connect.onrender.com/api/health
curl https://bci-connect.onrender.com/ready
```

**認證端點測試**：
```bash
# 測試無需認證的端點
curl https://bci-connect.onrender.com/api

# 測試需要認證的端點（應該返回 401）
curl https://bci-connect.onrender.com/api/auth/me
```

### 4. 數據庫連接檢查

**PostgreSQL**：
- Render 會自動提供 `DATABASE_URL`
- 檢查 Render Dashboard 中的 PostgreSQL 服務狀態
- 確認數據庫服務正在運行

**MongoDB**（可選）：
- 如果使用 MongoDB Atlas，檢查：
  - 用戶名和密碼是否正確
  - IP 白名單是否包含 `0.0.0.0/0`（允許所有 IP）
  - 集群是否正在運行

### 5. 構建和部署配置

**檢查 Render 服務設置**：
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Node Version**: 建議使用 18 或更高版本

### 6. 緊急修復步驟

**Step 1: 重新部署**
1. 在 Render Dashboard 中點擊 "Manual Deploy"
2. 選擇 "Deploy latest commit"
3. 等待部署完成

**Step 2: 檢查環境變量**
1. 確保所有必需的環境變量都已設置
2. 特別檢查 `JWT_SECRET` 是否存在

**Step 3: 查看實時日誌**
1. 在部署過程中監控日誌
2. 查找任何錯誤或警告信息

### 7. 聯繫支持

如果以上步驟都無法解決問題，請：

1. **收集信息**：
   - Render 服務名稱
   - 錯誤發生的確切時間
   - 完整的錯誤日誌
   - 環境變量配置截圖（隱藏敏感信息）

2. **聯繫 Render 支持**：
   - 通過 Render Dashboard 中的 "Contact Support" 鏈接
   - 提供上述收集的信息

### 8. 本地測試驗證

**確保本地環境正常**：
```bash
# 啟動本地服務器
npm start

# 測試 API
curl http://localhost:8000/api/health
curl http://localhost:8000/api/auth/me
```

如果本地正常但 Render 部署失敗，問題很可能是環境配置差異。

---

## 📞 需要幫助？

如果問題持續存在，請提供：
1. Render 部署日誌的截圖或文本
2. 環境變量配置的截圖（隱藏敏感值）
3. 錯誤發生的具體步驟

這將幫助我們更快地診斷和解決問題。