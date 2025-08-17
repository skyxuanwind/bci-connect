#!/bin/bash

# 自動部署到 Render 腳本
# 此腳本會自動提交修改並推送到 GitHub，觸發 Render 自動部署

echo "🚀 開始自動部署到 Render..."
echo "================================"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在項目根目錄執行此腳本"
    exit 1
fi

# 檢查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 發現未提交的更改，正在處理..."
    
    # 顯示更改的文件
    echo "📋 更改的文件:"
    git status --short
    echo ""
    
    # 添加所有更改
    echo "📦 添加所有更改到 Git..."
    git add .
    
    # 獲取當前時間作為提交訊息的一部分
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    
    # 提交更改
    echo "💾 提交更改..."
    git commit -m "Auto-deploy: Updates at $TIMESTAMP
    
    - Automatic deployment to Render
    - Latest code changes included"
    
    if [ $? -eq 0 ]; then
        echo "✅ 更改已成功提交"
    else
        echo "❌ 提交失敗"
        exit 1
    fi
else
    echo "✅ 沒有未提交的更改"
fi

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ 代碼已成功推送到 GitHub"
    echo "🔄 Render 將自動檢測到更改並開始部署"
else
    echo "❌ 推送失敗，請檢查網路連接和 GitHub 權限"
    exit 1
fi

echo ""
echo "🎉 自動部署完成！"
echo "================================"
echo ""
echo "📋 接下來會發生什麼:"
echo "1. ✅ 代碼已推送到 GitHub"
echo "2. 🔄 Render 正在自動檢測更改"
echo "3. 🏗️  Render 將開始建置和部署"
echo "4. 🌐 部署完成後，您的應用將自動更新"
echo ""
echo "💡 提示:"
echo "- 您可以在 Render Dashboard 查看部署進度"
echo "- 部署通常需要 2-5 分鐘完成"
echo "- 如有問題，請檢查 Render 的建置日誌"
echo ""
echo "🔗 Render Dashboard: https://dashboard.render.com"
echo "📖 部署文檔: render-deploy.md"