#!/bin/bash

# Render 部署準備腳本
# 此腳本會準備所有 Render 部署所需的配置

echo "🚀 準備 Render 部署..."
echo "================================"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在項目根目錄執行此腳本"
    exit 1
fi

# 檢查 Git 是否已初始化
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 倉庫..."
    git init
    echo "✅ Git 倉庫已初始化"
else
    echo "✅ Git 倉庫已存在"
fi

# 檢查是否有 .gitignore
if [ ! -f ".gitignore" ]; then
    echo "❌ 警告: 未找到 .gitignore 文件"
else
    echo "✅ .gitignore 文件已存在"
fi

# 檢查環境變數配置文件
if [ ! -f ".env.render" ]; then
    echo "❌ 錯誤: 未找到 .env.render 文件"
    exit 1
else
    echo "✅ Render 環境變數配置文件已準備"
fi

# 顯示 JWT Secret
echo ""
echo "🔐 JWT Secret (請保存此密鑰):"
echo "NM6yqqNoCA0p9XGLL6AM0EbpYLd6xUfd69mkX7PExnY="
echo ""

# 檢查前端建置配置
echo "🔍 檢查前端配置..."
if [ -d "client" ] && [ -f "client/package.json" ]; then
    echo "✅ 前端項目結構正確"
    
    # 檢查建置腳本
    if grep -q '"build"' client/package.json; then
        echo "✅ 前端建置腳本已配置"
    else
        echo "❌ 警告: 前端缺少建置腳本"
    fi
else
    echo "❌ 錯誤: 前端項目結構不正確"
    exit 1
fi

# 提交所有更改
echo "📝 提交代碼到 Git..."
git add .
git status

read -p "是否要提交這些更改? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Prepare for Render deployment
    
    - Add Render deployment guide
    - Add Render environment variables template
    - Update deployment configurations"
    echo "✅ 代碼已提交"
else
    echo "⏭️  跳過提交"
fi

# 檢查遠程倉庫
if git remote -v | grep -q "origin"; then
    echo "✅ Git 遠程倉庫已配置"
    
    read -p "是否要推送到 GitHub? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 推送到 GitHub..."
        git push origin main || git push origin master
        if [ $? -eq 0 ]; then
            echo "✅ 代碼已推送到 GitHub"
        else
            echo "❌ 推送失敗，請檢查 GitHub 倉庫配置"
        fi
    fi
else
    echo "⚠️  未配置 Git 遠程倉庫"
    echo "請先創建 GitHub 倉庫，然後執行:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo "git push -u origin main"
fi

echo ""
echo "🎉 Render 部署準備完成！"
echo "================================"
echo ""
echo "📋 接下來的步驟:"
echo "1. 確保代碼已推送到 GitHub"
echo "2. 前往 https://render.com 註冊/登入"
echo "3. 創建新的 Web Service"
echo "4. 選擇您的 GitHub 倉庫"
echo "5. 使用以下建置配置:"
echo "   - Build Command: cd client && npm install && npm run build"
echo "   - Start Command: node server.js"
echo "6. 複製 .env.render 中的環境變數到 Render"
echo "7. 創建 PostgreSQL 資料庫"
echo "8. 將資料庫 URL 添加為 DATABASE_URL 環境變數"
echo "9. 部署完成後更新 URL 配置"
echo ""
echo "📖 詳細步驟請參考: render-deploy.md"
echo "🔐 JWT Secret: NM6yqqNoCA0p9XGLL6AM0EbpYLd6xUfd69mkX7PExnY="
echo ""
echo "💡 提示: Render 免費方案提供 750 小時/月，足夠開發使用！"