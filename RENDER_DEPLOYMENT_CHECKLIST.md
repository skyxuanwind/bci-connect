# 🚀 Render 部署檢查清單

## 📋 部署前準備

### ✅ 代碼準備
- [ ] 所有代碼已提交到 GitHub
- [ ] 實時分析功能已實現並測試
- [ ] 數據庫 schema 包含 `analysis_progress` 欄位
- [ ] 靜態文件服務配置已修正

### ✅ 環境變數準備
請準備以下 API 密鑰和配置：

#### 必需的環境變數：
- [ ] `GEMINI_API_KEY` - Google Gemini AI API 密鑰
- [ ] `CLOUDINARY_CLOUD_NAME` - Cloudinary 雲端名稱
- [ ] `CLOUDINARY_API_KEY` - Cloudinary API 密鑰
- [ ] `CLOUDINARY_API_SECRET` - Cloudinary API 密鑰
- [ ] `JUDICIAL_ACCOUNT` - 司法院開放資料帳號
- [ ] `JUDICIAL_PASSWORD` - 司法院開放資料密碼

#### 可選的環境變數：
- [ ] `GOV_API_KEY` - 政府開放資料 API 密鑰
- [ ] 郵件服務配置（如需要）

---

## 🌐 Render 部署步驟

### 1. 創建 Web Service
- [ ] 登入 [render.com](https://render.com)
- [ ] 點擊 "New +" → "Web Service"
- [ ] 選擇 GitHub 倉庫 `bci-connect`
- [ ] 填寫配置：
  ```
  Name: bci-connect
  Environment: Node
  Region: Oregon (US West)
  Branch: main
  Root Directory: (留空)
  Build Command: npm install && cd client && npm install && npm run build
  Start Command: node server.js
  ```

### 2. 設置環境變數
- [ ] 複製 `.env.render` 中的所有環境變數
- [ ] 在 Render Web Service 的 "Environment" 頁籤中添加
- [ ] 確保所有必需的 API 密鑰都已填入實際值

### 3. 創建 PostgreSQL 資料庫
- [ ] 點擊 "New +" → "PostgreSQL"
- [ ] 配置：
  ```
  Name: bci-connect-db
  Database: bci_connect
  User: bci_user
  Region: 與 Web Service 相同
  Plan: Free
  ```
- [ ] 複製 "External Database URL"
- [ ] 在 Web Service 環境變數中添加 `DATABASE_URL`

### 4. 部署和驗證
- [ ] 點擊 "Manual Deploy" 開始部署
- [ ] 等待建置完成（3-5 分鐘）
- [ ] 檢查部署日誌，確保無錯誤
- [ ] 獲取 Render 提供的 URL

### 5. 更新 URL 配置
- [ ] 更新環境變數中的 URL：
  - `CLIENT_URL=https://your-actual-domain.onrender.com`
  - `FRONTEND_URL=https://your-actual-domain.onrender.com`
  - `QR_CODE_BASE_URL=https://your-actual-domain.onrender.com/member`
- [ ] 點擊 "Manual Deploy" 重新部署

---

## 🧪 功能測試

### ✅ 基本功能測試
- [ ] 網站可以正常訪問
- [ ] 用戶註冊功能正常
- [ ] 用戶登入功能正常
- [ ] 資料庫連接正常

### ✅ 實時分析功能測試
- [ ] AI 分析可以啟動
- [ ] 實時進度顯示正常
- [ ] 分析完成後結果正確顯示
- [ ] 進度文字內容實時更新

### ✅ 圖片上傳測試
- [ ] Cloudinary 圖片上傳功能正常
- [ ] 圖片可以正確顯示

---

## 🔧 常見問題排除

### 部署失敗
- [ ] 檢查建置日誌中的錯誤訊息
- [ ] 確認 Node.js 版本兼容性
- [ ] 檢查 package.json 中的依賴項

### 功能異常
- [ ] 檢查環境變數是否正確設置
- [ ] 確認 API 密鑰有效性
- [ ] 查看應用程式日誌

### 資料庫問題
- [ ] 確認 DATABASE_URL 格式正確
- [ ] 檢查資料庫狀態
- [ ] 確認資料庫和 Web Service 在同一區域

---

## 📊 監控和維護

### ✅ 設置監控
- [ ] 啟用 Auto-Deploy
- [ ] 設置健康檢查
- [ ] 監控資源使用情況

### ✅ 定期維護
- [ ] 定期檢查日誌
- [ ] 監控 API 使用量
- [ ] 備份重要數據

---

## 🎉 部署完成

恭喜！您的 BCI Connect 應用程式已成功部署到 Render！

**部署 URL**: `https://your-domain.onrender.com`

### 下一步：
1. 測試所有功能
2. 設置自定義域名（可選）
3. 配置監控和警報
4. 準備生產環境數據

---

**💡 提示**: Render 免費方案提供 750 小時/月，足夠開發和測試使用！