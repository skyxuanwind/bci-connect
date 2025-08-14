#!/bin/bash

# BCI Connect Railway 部署腳本
# 此腳本幫助您準備部署到 Railway

echo "🚂 BCI Connect Railway 部署準備腳本"
echo "======================================"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在 BCI Connect 項目根目錄中運行此腳本"
    exit 1
fi

# 檢查是否安裝了 git
if ! command -v git &> /dev/null; then
    echo "❌ Git 未安裝，請先安裝 Git"
    exit 1
fi

# 檢查是否已經初始化 git
if [ ! -d ".git" ]; then
    echo "📁 初始化 Git 倉庫..."
    git init
    echo "✅ Git 倉庫已初始化"
fi

# 生成 JWT Secret
echo "🔐 生成安全的 JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "生成的 JWT Secret: $JWT_SECRET"
echo "請保存此密鑰，稍後在 Railway 中需要設置"
echo

# 創建 Railway 專用的環境變數模板
echo "📝 創建 Railway 環境變數配置..."
cat > .env.railway << EOF
# Railway 部署環境變數配置
# 請將這些變數複製到 Railway 項目的環境變數設置中

# 基本配置
NODE_ENV=production
PORT=3000

# JWT 配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# URL 配置（部署後請更新為實際的 Railway 域名）
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

# 郵件配置（可選）
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_16_character_app_password
EOF

echo "✅ Railway 環境變數配置已創建：.env.railway"
echo

# 檢查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 準備提交代碼..."
    
    # 添加所有文件
    git add .
    
    # 提交更改
    read -p "請輸入提交訊息 (預設: '準備部署到 Railway'): " COMMIT_MESSAGE
    COMMIT_MESSAGE=${COMMIT_MESSAGE:-"準備部署到 Railway"}
    
    git commit -m "$COMMIT_MESSAGE"
    echo "✅ 代碼已提交"
else
    echo "ℹ️ 沒有新的更改需要提交"
fi

# 檢查是否有遠程倉庫
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 設置 GitHub 遠程倉庫..."
    echo "請先在 GitHub 上創建一個新的倉庫，然後輸入倉庫 URL"
    read -p "請輸入 GitHub 倉庫 URL (例: https://github.com/username/bci-connect.git): " REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        git branch -M main
        echo "✅ 遠程倉庫已設置"
    else
        echo "⚠️ 未設置遠程倉庫，請稍後手動設置"
    fi
fi

# 推送到 GitHub
if git remote get-url origin &> /dev/null; then
    echo "📤 推送代碼到 GitHub..."
    if git push -u origin main; then
        echo "✅ 代碼已推送到 GitHub"
    else
        echo "⚠️ 推送失敗，請檢查 GitHub 倉庫設置"
    fi
fi

echo
echo "🎉 準備工作完成！"
echo "======================================"
echo
echo "📋 接下來的步驟："
echo
echo "1. 📂 訪問 Railway: https://railway.app"
echo "2. 🔗 點擊 'Start a New Project' → 'Deploy from GitHub repo'"
echo "3. 📁 選擇您的 BCI Connect 倉庫"
echo "4. 🗄️ 添加 PostgreSQL 資料庫：點擊 '+ New' → 'Database' → 'Add PostgreSQL'"
echo "5. ⚙️ 設置環境變數：複製 .env.railway 文件中的變數到 Railway"
echo "6. 🌐 部署完成後，更新 URL 相關的環境變數為實際的 Railway 域名"
echo
echo "📄 詳細部署指南請查看：railway-deploy.md"
echo "🔐 您的 JWT Secret: $JWT_SECRET"
echo
echo "💡 提示：請將 JWT Secret 保存在安全的地方！"
echo

# 詢問是否要設置郵件配置
read -p "是否要現在設置郵件配置？(y/n): " SETUP_EMAIL
if [ "$SETUP_EMAIL" = "y" ] || [ "$SETUP_EMAIL" = "Y" ]; then
    echo
    echo "📧 郵件配置設置"
    echo "================="
    echo "對於 Gmail，您需要："
    echo "1. 啟用兩步驟驗證"
    echo "2. 生成應用程式密碼：https://myaccount.google.com/apppasswords"
    echo "3. 使用應用程式密碼（16個字符）而不是帳戶密碼"
    echo
    
    read -p "請輸入 Gmail 地址: " SMTP_USER
    read -s -p "請輸入 Gmail 應用程式密碼: " SMTP_PASS
    echo
    
    # 更新 .env.railway 文件
    sed -i '' "s/# SMTP_HOST=smtp.gmail.com/SMTP_HOST=smtp.gmail.com/" .env.railway
    sed -i '' "s/# SMTP_PORT=587/SMTP_PORT=587/" .env.railway
    sed -i '' "s/# SMTP_USER=your_email@gmail.com/SMTP_USER=$SMTP_USER/" .env.railway
    sed -i '' "s/# SMTP_PASS=your_16_character_app_password/SMTP_PASS=$SMTP_PASS/" .env.railway
    
    echo "✅ 郵件配置已添加到 .env.railway"
fi

echo
echo "🚀 現在您可以前往 Railway 完成部署了！"
echo "🔗 Railway: https://railway.app"