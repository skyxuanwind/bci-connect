#!/bin/bash
# BCI NFC Gateway 啟動器 (macOS)
# 下載→按兩下執行→自動安裝並啟動本機 Gateway，支援 ACR122U 讀卡機
# 若被安全性阻擋，請右鍵 → 開啟

set -e

APP_NAME="BCI NFC Gateway 啟動器"
DEST_DIR="$HOME/BCI-NFC-Gateway"
REPO_ZIP_URL="https://github.com/skyxuanwind/bci-connect/archive/refs/heads/main.zip"
GATEWAY_SUBPATH="bci-connect-main/nfc-gateway-service"
CLOUD_API_URL_DEFAULT="https://bci-connect.onrender.com"

bold() { echo "\033[1m$1\033[0m"; }
green() { echo "\033[32m$1\033[0m"; }
yellow() { echo "\033[33m$1\033[0m"; }
red() { echo "\033[31m$1\033[0m"; }

clear || true

echo "$(bold "🚀 $APP_NAME")"
echo "=============================================="
echo "此工具將："
echo "1) 將 Gateway 下載到: $DEST_DIR"
echo "2) 自動安裝所需套件 (含 nfc-pcsc)"
echo "3) 啟動本機服務 http://localhost:3002"
echo "4) 將掃到的卡片自動上傳到雲端 API"
echo "=============================================="

mkdir -p "$DEST_DIR"
cd "$DEST_DIR"

# 1) 下載並解壓縮專案（僅取 nfc-gateway-service 子專案）
echo "$(bold "⬇️ 下載 Gateway 程式碼...")"
rm -rf bci-connect-main repo.zip nfc-gateway-service || true
curl -L --fail -o repo.zip "$REPO_ZIP_URL"
unzip -q repo.zip "$GATEWAY_SUBPATH/*"
mv "$GATEWAY_SUBPATH" ./nfc-gateway-service
rm -rf bci-connect-main repo.zip

echo "$(green "✅ 下載完成")"

# 2) 檢查 Node 與 npm
if ! command -v node >/dev/null 2>&1; then
  red "❌ 未安裝 Node.js，請先安裝 https://nodejs.org/ 後再執行此檔"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  red "❌ 未安裝 npm，請先安裝 Node.js/npm 後再執行此檔"
  exit 1
fi

# 3) macOS 建置工具提示（nfc-pcsc 需要）
if [[ "$(uname)" == "Darwin" ]]; then
  if ! xcode-select -p >/dev/null 2>&1; then
    yellow "⚠️ 建議先安裝 Xcode Command Line Tools：xcode-select --install"
  fi
fi

# 4) 安裝依賴
cd nfc-gateway-service
echo "$(bold "📦 安裝套件 (第一次可能需較久)...")"
npm install

echo "$(bold "🔍 檢查 nfc-pcsc 模組...")"
if node -e "require('nfc-pcsc')" 2>/dev/null; then
  echo "$(green "✅ nfc-pcsc 可用")"
else
  yellow "⚠️ nfc-pcsc 不可用，嘗試以原始碼建置..."
  npm install nfc-pcsc --build-from-source || true
  if node -e "require('nfc-pcsc')" 2>/dev/null; then
    echo "$(green "✅ 已修復 nfc-pcsc")"
  else
    yellow "⚠️ 仍無法載入 nfc-pcsc，將以『降級模式』啟動 (可連線，但無法讀取實體卡)"
  fi
fi

# 5) 設定雲端 API URL（預設為 Render 部署）
CLOUD_API_URL="${CLOUD_API_URL:-$CLOUD_API_URL_DEFAULT}"
if [ ! -f .env ]; then
  cat > .env <<EOF
CLOUD_API_URL=$CLOUD_API_URL
EOF
else
  # 更新既有 .env 的 CLOUD_API_URL
  if grep -q '^CLOUD_API_URL=' .env; then
    sed -i '' "s#^CLOUD_API_URL=.*#CLOUD_API_URL=$CLOUD_API_URL#" .env 2>/dev/null || true
  else
    echo "CLOUD_API_URL=$CLOUD_API_URL" >> .env
  fi
fi

echo "$(green "✅ 設定完成：CLOUD_API_URL=$CLOUD_API_URL")"

# 6) 啟動服務
open "http://localhost:3002/health" 2>/dev/null || true
open "$CLOUD_API_URL/nfc-report-system" 2>/dev/null || true

echo "=============================================="
echo "$(bold "🚀 正在啟動 NFC Gateway Service (3002)...")"
echo "若看到『NFC 模組不可用（降級模式）』，請："
echo " • 確認 ACR122U 已插上"
echo " • 於終端機執行：xcode-select --install 後重試"
echo "=============================================="

npm start