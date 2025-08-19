#!/bin/bash

# NFC Gateway Service 啟動腳本
# 使用方法: ./start.sh

echo "🚀 啟動 NFC Gateway Service..."
echo "======================================"

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: Node.js 未安裝"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: npm 未安裝"
    exit 1
fi

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在 nfc-gateway-service 目錄下執行此腳本"
    exit 1
fi

# 檢查環境變數文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，將使用預設設定"
    echo "建議複製 .env.example 為 .env 並修改設定"
fi

# 檢查依賴是否安裝
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴套件..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
fi

# 檢查 NFC 讀卡機連接
echo "🔍 檢查 NFC 讀卡機..."
if command -v system_profiler &> /dev/null; then
    # macOS
    if system_profiler SPUSBDataType | grep -i "acr122" > /dev/null; then
        echo "✅ 找到 ACR122U NFC 讀卡機"
    else
        echo "⚠️  警告: 未找到 ACR122U NFC 讀卡機"
        echo "請確認讀卡機已正確連接"
    fi
fi

echo "======================================"
echo "🎯 啟動服務..."
echo "服務地址: http://localhost:3002"
echo "健康檢查: http://localhost:3002/health"
echo "按 Ctrl+C 停止服務"
echo "======================================"

# 啟動服務
npm start