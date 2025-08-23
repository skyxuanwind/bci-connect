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

# 針對 macOS：檢查是否安裝 Xcode Command Line Tools（nfc-pcsc 原生模組常需要）
if [[ "$(uname)" == "Darwin" ]]; then
    if ! xcode-select -p &> /dev/null; then
        echo "⚠️  警告: 尚未安裝 Xcode Command Line Tools，可能導致 nfc-pcsc 編譯失敗"
        echo "請先執行：xcode-select --install"
    fi
fi

# 檢查 nfc-pcsc 是否可正常載入，若失敗則嘗試安裝/重建
echo "🔍 檢查 nfc-pcsc 模組..."
node -e "try{require('nfc-pcsc');console.log('✅ nfc-pcsc 模組可用')}catch(e){console.error('❌ nfc-pcsc 模組不可用');process.exit(1)}"
if [ $? -ne 0 ]; then
    echo "📦 嘗試安裝/重建 nfc-pcsc...（過程可能需數十秒）"
    npm install nfc-pcsc --build-from-source
    if [ $? -ne 0 ]; then
        echo "❌ 安裝/重建 nfc-pcsc 失敗。請檢查是否已安裝建置工具與權限，再重試。"
        echo "   macOS: 建議安裝 Xcode Command Line Tools (xcode-select --install)"
        exit 1
    fi

    # 再次檢查
    node -e "try{require('nfc-pcsc');console.log('✅ nfc-pcsc 模組可用')}catch(e){console.error('❌ nfc-pcsc 模組仍不可用');process.exit(1)}"
    if [ $? -ne 0 ]; then
        echo "❌ nfc-pcsc 模組仍不可用，將以降級模式啟動（無法讀取實體卡片）"
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

echo "健康檢查: http://localhost:3002/health"
echo "按 Ctrl+C 停止服務"
echo "======================================"

# 啟動服務
npm start