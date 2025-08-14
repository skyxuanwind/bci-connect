# 🚂 Railway 部署指南

## 為什麼選擇 Railway？

- ✅ **零配置部署**：自動檢測 Node.js 項目
- ✅ **內建 PostgreSQL**：一鍵添加資料庫
- ✅ **免費額度**：每月 $5 免費使用額度
- ✅ **自動 HTTPS**：免費 SSL 證書
- ✅ **Git 整合**：推送代碼自動部署

## 🚀 部署步驟

### 1. 準備工作

確保您的代碼已經推送到 GitHub：

```bash
# 如果還沒有 Git 倉庫
git init
git add .
git commit -m "準備部署到 Railway"

# 推送到 GitHub（替換為您的倉庫 URL）
git remote add origin https://github.com/your-username/bci-connect.git
git branch -M main
git push -u origin main
```

### 2. 創建 Railway 項目

1. **訪問 Railway**
   - 前往 [railway.app](https://railway.app)
   - 點擊 "Start a New Project"

2. **連接 GitHub**
   - 選擇 "Deploy from GitHub repo"
   - 授權 Railway 訪問您的 GitHub
   - 選擇 BCI Connect 倉庫

3. **自動部署**
   - Railway 會自動檢測到這是 Node.js 項目
   - 自動開始第一次部署

### 3. 添加 PostgreSQL 資料庫

1. **添加服務**
   - 在項目儀表板中點擊 "+ New"
   - 選擇 "Database" → "Add PostgreSQL"

2. **獲取連接資訊**
   - Railway 會自動生成 `DATABASE_URL` 環境變數
   - 您的應用會自動使用這個連接字串

### 4. 設置環境變數

在 Railway 項目設置中添加以下環境變數：

#### 必需的環境變數：

```bash
# 基本配置
NODE_ENV=production
PORT=3000

# JWT 配置（請生成一個安全的密鑰）
JWT_SECRET=your_super_secure_jwt_secret_here_change_this
JWT_EXPIRES_IN=7d

# URL 配置（Railway 會自動提供域名）
CLIENT_URL=https://your-app-name.up.railway.app
FRONTEND_URL=https://your-app-name.up.railway.app
QR_CODE_BASE_URL=https://your-app-name.up.railway.app/member

# 文件上傳配置
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads

# 安全配置
BCRYPT_ROUNDS=12

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 可選的郵件配置：

```bash
# Gmail SMTP 配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
```

### 5. 生成安全的 JWT Secret

在本地終端運行：

```bash
# 生成隨機 JWT Secret
openssl rand -base64 32
```

將生成的字串設置為 `JWT_SECRET` 環境變數。

### 6. 更新域名配置

部署完成後，Railway 會提供一個域名（如 `https://your-app-name.up.railway.app`）。

更新以下環境變數為實際的域名：
- `CLIENT_URL`
- `FRONTEND_URL`
- `QR_CODE_BASE_URL`

### 7. 重新部署

設置完環境變數後，觸發重新部署：
- 在 Railway 儀表板中點擊 "Deploy"
- 或者推送新的代碼到 GitHub

## 📋 部署檢查清單

- [ ] GitHub 倉庫已創建並推送代碼
- [ ] Railway 項目已創建
- [ ] PostgreSQL 資料庫已添加
- [ ] 所有必需的環境變數已設置
- [ ] JWT_SECRET 已設置為安全的隨機字串
- [ ] 域名相關的環境變數已更新
- [ ] 應用程式可以正常訪問
- [ ] 用戶註冊和登入功能正常
- [ ] QR Code 生成功能正常
- [ ] 文件上傳功能正常

## 🔧 常見問題

### Q: 部署失敗，顯示 "Build failed"
**A:** 檢查 Railway 的建置日誌，通常是依賴安裝問題：
- 確保 `package.json` 中的依賴版本正確
- 檢查 Node.js 版本兼容性

### Q: 應用啟動後立即崩潰
**A:** 檢查環境變數設置：
- 確保 `DATABASE_URL` 已自動設置
- 檢查 `JWT_SECRET` 是否已設置
- 查看 Railway 的應用日誌

### Q: 資料庫連接失敗
**A:** Railway 的 PostgreSQL 服務：
- 確保 PostgreSQL 服務正在運行
- `DATABASE_URL` 應該自動設置
- 檢查資料庫服務的狀態

### Q: 前端無法載入
**A:** 檢查 URL 配置：
- 確保 `CLIENT_URL` 設置為正確的 Railway 域名
- 檢查 CORS 設置是否包含正確的域名

### Q: QR Code 無法顯示
**A:** 檢查 QR Code 配置：
- 確保 `QR_CODE_BASE_URL` 設置正確
- 檢查圖片路徑是否可訪問

## 📊 監控和管理

### 查看日誌
- 在 Railway 儀表板中點擊您的服務
- 切換到 "Logs" 標籤頁

### 查看指標
- 在 "Metrics" 標籤頁查看 CPU、記憶體使用情況
- 監控請求數量和響應時間

### 管理環境變數
- 在 "Variables" 標籤頁添加或修改環境變數
- 修改後會自動觸發重新部署

### 自定義域名
- 在 "Settings" → "Domains" 中添加自定義域名
- 配置 DNS 記錄指向 Railway

## 🎯 部署後優化

### 1. 設置自動備份
- Railway 的 PostgreSQL 會自動備份
- 建議定期下載備份文件

### 2. 監控設置
- 設置 Uptime 監控
- 配置錯誤警報

### 3. 性能優化
- 啟用 Railway 的 CDN
- 優化靜態資源

## 💰 費用估算

**免費額度：**
- 每月 $5 免費使用額度
- 包含計算資源和資料庫
- 適合開發和小規模使用

**付費方案：**
- 超出免費額度後按使用量計費
- 通常每月 $5-20 適合中小型應用

---

🎉 **恭喜！您的 BCI Connect 應用現在已經部署到 Railway 上了！**

如果遇到任何問題，請查看 Railway 的官方文檔或聯繫支援團隊。