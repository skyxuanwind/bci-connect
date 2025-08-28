# 📧 郵件服務設定指南

## 問題描述
忘記密碼功能無法發送郵件的原因是郵件服務未正確配置。

## 🔧 本地開發環境設定

### 1. Gmail 設定步驟

1. **啟用兩步驟驗證**
   - 前往 [Google 帳戶安全性設定](https://myaccount.google.com/security)
   - 啟用「兩步驟驗證」

2. **生成應用程式密碼**
   - 前往 [應用程式密碼設定](https://myaccount.google.com/apppasswords)
   - 選擇「郵件」和您的裝置
   - 複製生成的 16 位數應用程式密碼

3. **更新 .env 文件**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password
   ```

### 2. 其他郵件服務商設定

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## 🚀 Render 部署設定

### 1. 更新環境變數
在 Render 控制台的 Environment 設定中添加：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
```

### 2. 重新部署
設定完成後，Render 會自動重新部署應用程式。

## 🧪 測試郵件功能

### 1. 本地測試
1. 確保後端服務器正在運行 (`npm start`)
2. 前往 `http://localhost:3001/login`
3. 點擊「忘記密碼？」
4. 輸入註冊的電子郵件地址
5. 檢查郵箱（包括垃圾郵件資料夾）

### 2. 生產環境測試
1. 前往您的 Render 應用程式 URL
2. 執行相同的測試步驟

## 🔍 故障排除

### 常見錯誤及解決方案

#### 1. EAUTH 錯誤
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**解決方案：**
- 確認已啟用兩步驟驗證
- 使用應用程式密碼而非一般密碼
- 檢查 SMTP_USER 和 SMTP_PASS 是否正確

#### 2. ECONNECTION 錯誤
```
Error: connect ECONNREFUSED
```
**解決方案：**
- 檢查網路連接
- 確認 SMTP_HOST 和 SMTP_PORT 設定正確
- 檢查防火牆設定

#### 3. 郵件未收到
**檢查項目：**
- 垃圾郵件資料夾
- 郵件地址是否正確
- 郵件服務商的安全設定
- 後端日誌是否有錯誤訊息

### 檢查後端日誌
```bash
# 本地開發
npm start

# 查看 Render 日誌
# 在 Render 控制台的 Logs 頁面查看
```

## 📝 注意事項

1. **安全性**
   - 絕不要將真實的郵件密碼提交到版本控制
   - 使用應用程式密碼而非帳戶密碼
   - 定期更換應用程式密碼

2. **郵件限制**
   - Gmail 每日發送限制：500 封
   - 建議使用專用的郵件服務（如 SendGrid、Mailgun）用於生產環境

3. **環境變數**
   - 本地開發：`.env` 文件
   - Render 部署：Environment Variables 設定
   - 確保變數名稱一致：`SMTP_*`

## 🎯 快速修復步驟

1. **立即修復本地環境：**
   ```bash
   # 1. 更新 .env 文件中的 SMTP 設定
   # 2. 重啟後端服務器
   npm start
   ```

2. **修復 Render 部署：**
   ```bash
   # 1. 提交更新的 .env.render 文件
   git add .
   git commit -m "更新郵件服務配置"
   git push origin main
   
   # 2. 在 Render 控制台設定環境變數
   # 3. 等待自動重新部署
   ```

---

如果仍有問題，請檢查：
1. 後端服務器日誌
2. 網路連接狀態
3. 郵件服務商的安全設定
4. 環境變數是否正確設定