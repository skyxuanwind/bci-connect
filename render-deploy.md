# 🚀 Render 部署指南 (更新版)

## 為什麼選擇 Render？

✅ **真正的免費方案** - 免費層級無時間限制  
✅ **自動 HTTPS** - 免費 SSL 證書  
✅ **自動部署** - Git 推送後自動部署  
✅ **內建 PostgreSQL** - 免費 PostgreSQL 資料庫  
✅ **零配置** - 自動檢測 Node.js 項目  
✅ **良好監控** - 內建日誌和監控  
✅ **支援實時功能** - 支援 WebSocket 和實時更新  

---

## 📋 部署步驟

### 1. 準備 GitHub 倉庫

```bash
# 如果還沒有推送到 GitHub
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. 創建 Render 帳戶

1. 前往 [render.com](https://render.com)
2. 使用 GitHub 帳戶註冊/登入
3. 授權 Render 訪問您的 GitHub 倉庫

### 3. 部署 Web Service

#### 3.1 創建 Web Service
1. 點擊 **"New +"** → **"Web Service"**
2. 選擇您的 GitHub 倉庫 `bci-connect`
3. 填寫以下配置：

```
Name: bci-connect
Environment: Node
Region: Oregon (US West) 或就近選擇
Branch: main
Root Directory: (留空)
Build Command: npm install && cd client && npm install && npm run build
Start Command: node server.js
```

#### 3.2 設置環境變數
在 **Environment** 頁籤中添加以下變數：

```bash
# 基本配置
NODE_ENV=production
PORT=10000

# JWT 配置
JWT_SECRET=NM6yqqNoCA0p9XGLL6AM0EbpYLd6xUfd69mkX7PExnY=
JWT_EXPIRES_IN=7d

# URL 配置 (部署後更新)
CLIENT_URL=https://bci-connect.onrender.com
FRONTEND_URL=https://bci-connect.onrender.com
QR_CODE_BASE_URL=https://bci-connect.onrender.com/member

# 文件上傳配置
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads

# 安全配置
BCRYPT_ROUNDS=12

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AI 分析配置 (必需)
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary 配置 (圖片上傳)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 政府開放資料 API
GOV_COMPANY_API_URL=https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6
GOV_API_KEY=your_gov_api_key_here

# 司法院開放資料
JUDICIAL_ACCOUNT=your_account
JUDICIAL_PASSWORD=your_password

# 郵件配置 (可選)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# EMAIL_FROM=your-email@gmail.com
```

### 4. 創建 PostgreSQL 資料庫

#### 4.1 添加資料庫
1. 回到 Dashboard，點擊 **"New +"** → **"PostgreSQL"**
2. 填寫配置：

```
Name: bci-connect-db
Database: bci_connect
User: bci_user
Region: 與 Web Service 相同
Plan: Free
```

#### 4.2 獲取資料庫連接字串
1. 資料庫創建完成後，進入資料庫詳情頁
2. 複製 **External Database URL**
3. 回到 Web Service 的環境變數設置
4. 添加：`DATABASE_URL=postgresql://...` (貼上複製的 URL)

#### 4.3 數據庫 Schema 初始化
應用程式會自動創建所需的表格，包括：
- 新增的 `analysis_progress` 欄位支援實時分析進度顯示
- 所有必要的索引和約束條件
- 初始化數據

### 5. 部署和驗證

#### 5.1 觸發部署
1. 點擊 **"Manual Deploy"** 或推送新的 commit
2. 等待建置完成（通常需要 3-5 分鐘）

#### 5.2 更新 URL 配置
部署完成後，Render 會提供一個 URL（如 `https://bci-connect.onrender.com`）：

1. 更新環境變數中的 URL：
   - `CLIENT_URL=https://your-actual-domain.onrender.com`
   - `FRONTEND_URL=https://your-actual-domain.onrender.com`
   - `QR_CODE_BASE_URL=https://your-actual-domain.onrender.com/member`

2. 點擊 **"Manual Deploy"** 重新部署

---

## ✅ 部署檢查清單

- [ ] GitHub 倉庫已創建並推送代碼
- [ ] Render Web Service 已創建
- [ ] 所有環境變數已設置
- [ ] PostgreSQL 資料庫已創建
- [ ] DATABASE_URL 已添加到環境變數
- [ ] 首次部署成功
- [ ] URL 配置已更新
- [ ] 重新部署完成
- [ ] 網站可以正常訪問
- [ ] 資料庫連接正常
- [ ] 用戶註冊/登入功能正常

---

## 🔧 常見問題

### Q: 部署失敗，顯示建置錯誤
**A:** 檢查建置日誌，常見原因：
- Node.js 版本不兼容
- 依賴安裝失敗
- 建置命令錯誤

### Q: 網站可以訪問但功能異常
**A:** 檢查：
- 環境變數是否正確設置
- DATABASE_URL 是否有效
- 後端 API 是否正常運行

### Q: 資料庫連接失敗
**A:** 確認：
- PostgreSQL 資料庫狀態正常
- DATABASE_URL 格式正確
- 資料庫和 Web Service 在同一區域

### Q: 免費方案的限制
**A:** Render 免費方案限制：
- Web Service: 750 小時/月
- PostgreSQL: 1GB 存儲，90 天後刪除
- 閒置 15 分鐘後休眠

---

## 📊 監控和管理

### 查看日誌
1. 進入 Web Service 詳情頁
2. 點擊 **"Logs"** 頁籤
3. 實時查看應用程式日誌

### 監控資源使用
1. **"Metrics"** 頁籤查看：
   - CPU 使用率
   - 記憶體使用量
   - 請求數量
   - 響應時間

### 自動部署設置
1. **"Settings"** → **"Build & Deploy"**
2. 啟用 **"Auto-Deploy"**
3. 每次 Git 推送都會自動部署

---

## 🚀 部署後優化

### 1. 設置自定義域名（可選）
1. **"Settings"** → **"Custom Domains"**
2. 添加您的域名
3. 配置 DNS 記錄

### 2. 啟用健康檢查
```javascript
// server.js 中已包含
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

### 3. 設置環境特定配置
- 生產環境使用更強的密碼策略
- 配置適當的速率限制
- 啟用詳細的錯誤日誌

---

## 💰 費用估算

### 免費方案
- **Web Service**: 免費 750 小時/月
- **PostgreSQL**: 免費 1GB，90 天限制
- **總計**: $0/月

### 付費升級（如需要）
- **Web Service**: $7/月起
- **PostgreSQL**: $7/月起（無時間限制）
- **總計**: $14/月起

---

## 📞 技術支援

- **Render 文檔**: [render.com/docs](https://render.com/docs)
- **社群支援**: [community.render.com](https://community.render.com)
- **狀態頁面**: [status.render.com](https://status.render.com)

---

**🎉 恭喜！您的 BCI Connect 應用程式現在已經成功部署到 Render！**

記住要定期備份資料庫，並監控應用程式的性能和錯誤日誌。