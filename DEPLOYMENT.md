# BCI Connect 部署指南

## 部署選項

### 1. Heroku 部署（推薦）

Heroku 是最簡單的部署選項，已經配置好相關腳本。

#### 準備步驟：

1. **安裝 Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   ```

2. **登入 Heroku**
   ```bash
   heroku login
   ```

3. **創建 Heroku 應用**
   ```bash
   heroku create your-app-name
   ```

4. **添加 PostgreSQL 資料庫**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

5. **設置環境變數**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_production_jwt_secret_here
   heroku config:set JWT_EXPIRES_IN=7d
   heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com
   heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
   heroku config:set QR_CODE_BASE_URL=https://your-app-name.herokuapp.com/member
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your_email@gmail.com
   heroku config:set SMTP_PASS=your_app_password
   heroku config:set MAX_FILE_SIZE=5242880
   heroku config:set BCRYPT_ROUNDS=12
   heroku config:set RATE_LIMIT_WINDOW_MS=900000
   heroku config:set RATE_LIMIT_MAX_REQUESTS=100
   ```

6. **部署應用**
   ```bash
   git add .
   git commit -m "準備部署"
   git push heroku main
   ```

7. **運行資料庫遷移（如果有的話）**
   ```bash
   heroku run npm run migrate
   ```

### 2. Vercel 部署（前端 + Serverless Functions）

#### 前端部署到 Vercel：

1. **安裝 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **在 client 目錄中部署**
   ```bash
   cd client
   vercel
   ```

3. **後端需要部署到其他平台**（如 Railway、Render 等）

### 3. Railway 部署

Railway 是另一個簡單的部署選項：

1. **連接 GitHub 倉庫**
   - 訪問 [railway.app](https://railway.app)
   - 連接你的 GitHub 倉庫

2. **添加 PostgreSQL 服務**
   - 在 Railway 儀表板中添加 PostgreSQL

3. **設置環境變數**
   - 在 Railway 中設置所有必要的環境變數

### 4. Render 部署

1. **創建 Web Service**
   - 訪問 [render.com](https://render.com)
   - 連接 GitHub 倉庫
   - 選擇 "Web Service"

2. **配置建置設定**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **添加 PostgreSQL 資料庫**
   - 創建 PostgreSQL 服務
   - 複製連接字串到環境變數

## 部署前檢查清單

### 1. 環境變數配置
- [ ] JWT_SECRET（生產環境必須更改）
- [ ] DATABASE_URL 或資料庫連接參數
- [ ] CLIENT_URL 和 FRONTEND_URL（設為生產域名）
- [ ] QR_CODE_BASE_URL（設為生產域名）
- [ ] SMTP 配置（如果使用郵件功能）

### 2. 安全性檢查
- [ ] 更改預設的 JWT_SECRET
- [ ] 確保資料庫密碼安全
- [ ] 檢查 CORS 設定
- [ ] 確保敏感資訊不在代碼中

### 3. 性能優化
- [ ] 前端建置優化（已配置）
- [ ] 靜態文件壓縮
- [ ] 資料庫索引優化

## 常見問題

### Q: 部署後無法連接資料庫
A: 檢查 DATABASE_URL 環境變數是否正確設置，確保資料庫服務正在運行。

### Q: 前端無法載入
A: 檢查 CLIENT_URL 和 FRONTEND_URL 是否設置為正確的生產域名。

### Q: QR Code 無法顯示
A: 確保 QR_CODE_BASE_URL 設置為正確的生產域名。

### Q: 郵件功能無法使用
A: 檢查 SMTP 配置，確保使用正確的應用程式密碼（不是帳戶密碼）。

## 監控和維護

1. **日誌監控**
   - 使用平台提供的日誌功能
   - 設置錯誤警報

2. **性能監控**
   - 監控應用程式響應時間
   - 資料庫查詢性能

3. **備份**
   - 定期備份資料庫
   - 備份上傳的文件

## 建議的部署流程

1. **開發環境測試** → **暫存環境測試** → **生產環境部署**
2. 使用 Git 分支管理（main/master 用於生產）
3. 設置 CI/CD 自動部署
4. 定期更新依賴套件

---

選擇最適合你需求的部署方式，Heroku 是最簡單的選項，適合快速部署和測試。# Last deployment: 2025年 8月27日 星期三 23时39分07秒 CST
