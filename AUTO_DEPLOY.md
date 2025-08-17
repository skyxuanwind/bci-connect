# 自動部署指南

## 概述

本項目已配置自動部署到 Render 平台。每次代碼修改後，您可以使用提供的腳本自動將更改部署到生產環境。

## 🚀 快速部署

### 方法一：使用自動部署腳本（推薦）

```bash
./auto-deploy.sh
```

這個腳本會自動：
- 檢測未提交的更改
- 添加所有更改到 Git
- 創建帶時間戳的提交
- 推送到 GitHub
- 觸發 Render 自動部署

### 方法二：手動部署

```bash
# 1. 添加更改
git add .

# 2. 提交更改
git commit -m "Your commit message"

# 3. 推送到 GitHub
git push origin main
```

## 📋 部署流程

1. **本地修改** → 修改代碼
2. **自動提交** → 運行 `./auto-deploy.sh`
3. **推送到 GitHub** → 代碼自動推送
4. **Render 檢測** → Render 自動檢測更改
5. **自動建置** → Render 開始建置應用
6. **部署完成** → 應用自動更新

## ⚙️ 部署配置

### Render 建置設置
- **Build Command**: `npm install && cd client && npm install && npm run build`
- **Start Command**: `node server.js`
- **Node Version**: 18.x

### 環境變數
所有必要的環境變數都在 `.env.render` 文件中定義，包括：
- `JWT_SECRET`: 已自動生成安全密鑰
- `NODE_ENV`: production
- `PORT`: 10000
- 其他配置...

## 🔧 故障排除

### 常見問題

1. **推送失敗**
   ```bash
   # 檢查 Git 遠程配置
   git remote -v
   
   # 重新設置遠程倉庫
   git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```

2. **Render 建置失敗**
   - 檢查 Render Dashboard 的建置日誌
   - 確認所有環境變數都已正確設置
   - 檢查 `package.json` 中的依賴項

3. **部署後應用無法訪問**
   - 檢查 Render 服務狀態
   - 確認資料庫連接正常
   - 檢查環境變數中的 URL 配置

### 檢查部署狀態

- **Render Dashboard**: https://dashboard.render.com
- **GitHub Actions**: 檢查推送是否成功
- **應用日誌**: 在 Render Dashboard 查看實時日誌

## 📚 相關文檔

- `render-deploy.md` - 詳細的 Render 部署指南
- `.env.render` - Render 環境變數配置
- `deploy-render.sh` - 初始部署準備腳本

## 💡 最佳實踐

1. **頻繁提交**: 保持小而頻繁的提交
2. **測試本地**: 部署前在本地測試功能
3. **監控部署**: 部署後檢查應用狀態
4. **備份重要數據**: 定期備份資料庫

## 🔐 安全注意事項

- JWT_SECRET 已自動生成，請勿在代碼中硬編碼
- 敏感信息都通過環境變數配置
- 定期更新依賴項以修復安全漏洞

---

**需要幫助？** 檢查 Render 文檔或聯繫技術支持。