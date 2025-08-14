#!/bin/bash

# BCI Connect 部署腳本
# 此腳本幫助您快速部署到 Heroku

echo "🚀 BCI Connect 部署腳本"
echo "========================"

# 檢查是否安裝了 Heroku CLI
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI 未安裝"
    echo "請先安裝 Heroku CLI: brew tap heroku/brew && brew install heroku"
    exit 1
fi

# 檢查是否已登入 Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 請先登入 Heroku"
    heroku login
fi

# 詢問應用程式名稱
read -p "請輸入 Heroku 應用程式名稱 (留空使用隨機名稱): " APP_NAME

# 創建 Heroku 應用
if [ -z "$APP_NAME" ]; then
    echo "📱 創建 Heroku 應用程式..."
    heroku create
else
    echo "📱 創建 Heroku 應用程式: $APP_NAME"
    heroku create $APP_NAME
fi

# 獲取應用程式 URL
APP_URL=$(heroku info -s | grep web_url | cut -d= -f2)
echo "🌐 應用程式 URL: $APP_URL"

# 添加 PostgreSQL 資料庫
echo "🗄️ 添加 PostgreSQL 資料庫..."
heroku addons:create heroku-postgresql:mini

# 設置環境變數
echo "⚙️ 設置環境變數..."

# 生成隨機 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="$JWT_SECRET"
heroku config:set JWT_EXPIRES_IN=7d
heroku config:set CLIENT_URL="$APP_URL"
heroku config:set FRONTEND_URL="$APP_URL"
heroku config:set QR_CODE_BASE_URL="${APP_URL}member"
heroku config:set MAX_FILE_SIZE=5242880
heroku config:set BCRYPT_ROUNDS=12
heroku config:set RATE_LIMIT_WINDOW_MS=900000
heroku config:set RATE_LIMIT_MAX_REQUESTS=100

# 詢問是否設置郵件配置
read -p "是否要設置郵件功能？(y/n): " SETUP_EMAIL
if [ "$SETUP_EMAIL" = "y" ] || [ "$SETUP_EMAIL" = "Y" ]; then
    read -p "請輸入 SMTP 用戶名 (Gmail): " SMTP_USER
    read -s -p "請輸入 Gmail 應用程式密碼: " SMTP_PASS
    echo
    
    heroku config:set SMTP_HOST=smtp.gmail.com
    heroku config:set SMTP_PORT=587
    heroku config:set SMTP_USER="$SMTP_USER"
    heroku config:set SMTP_PASS="$SMTP_PASS"
    
    echo "✅ 郵件配置完成"
fi

# 確認是否要部署
echo "📋 配置摘要:"
echo "   應用程式 URL: $APP_URL"
echo "   資料庫: PostgreSQL (mini)"
echo "   JWT Secret: 已生成"
echo "   環境: production"
echo

read -p "確認要部署嗎？(y/n): " CONFIRM_DEPLOY
if [ "$CONFIRM_DEPLOY" != "y" ] && [ "$CONFIRM_DEPLOY" != "Y" ]; then
    echo "❌ 部署已取消"
    exit 1
fi

# 部署應用程式
echo "🚀 開始部署..."
git add .
git commit -m "準備部署到 Heroku" || echo "沒有新的變更需要提交"
git push heroku main || git push heroku master

# 檢查部署狀態
echo "📊 檢查部署狀態..."
heroku ps:scale web=1

# 顯示日誌
echo "📝 顯示應用程式日誌 (按 Ctrl+C 退出):"
heroku logs --tail

echo "✅ 部署完成！"
echo "🌐 您的應用程式現在可以在以下網址訪問: $APP_URL"
echo "📊 管理面板: heroku dashboard"
echo "📝 查看日誌: heroku logs --tail"
echo "⚙️ 管理配置: heroku config"