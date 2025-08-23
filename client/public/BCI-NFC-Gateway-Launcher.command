#!/bin/bash
# BCI NFC Gateway 啟動器 (macOS)
# 下載→按兩下執行→自動安裝並啟動本機 Gateway，支援 ACR122U 讀卡機
# 若被安全性阻擋，請右鍵 → 開啟（首次可能需要到「系統設定 > 隱私權與安全性 > 仍要打開」）

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

# 嘗試移除自身的隔離屬性，避免之後每次都被阻擋（本次執行仍以已開啟為準）
xattr -d com.apple.quarantine "$0" 2>/dev/null || true
chmod +x "$0" 2>/dev/null || true

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

# 0) macOS Command Line Tools 檢查與自動引導安裝（nfc-pcsc 建置常見依賴）
ensure_clt() {
  if [[ "$(uname)" == "Darwin" ]]; then
    if ! xcode-select -p >/dev/null 2>&1; then
      yellow "⚠️ 偵測到未安裝 Xcode Command Line Tools，將自動開啟安裝視窗。"
      echo "    若安裝視窗未自動出現，可手動執行：xcode-select --install"
      # 觸發安裝（會跳出 GUI 視窗，需要使用者同意）
      xcode-select --install >/dev/null 2>&1 || true
      echo "📥 請在跳出的視窗完成安裝後回到此視窗。"
      # 輪詢等待安裝完成，最長等待 30 分鐘（可提前按 Enter 跳過檢查）
      echo "⏳ 正在等待安裝完成（最長 30 分鐘）。安裝完成後可按 Enter 繼續..."
      for i in {1..180}; do
        if xcode-select -p >/dev/null 2>&1; then
          echo "$(green "✅ Xcode Command Line Tools 已安裝")"
          return 0
        fi
        # 允許使用者按 Enter 中斷等待
        read -t 10 -r _ && break || true
      done
      # 再次檢查
      if ! xcode-select -p >/dev/null 2>&1; then
        yellow "⚠️ 尚未偵測到 CLT。將繼續安裝流程，若稍後 nfc-pcsc 建置失敗，請完成 CLT 安裝後重試此啟動器。"
      fi
    else
      echo "$(green "✅ 已偵測到 Xcode Command Line Tools")"
    fi
  fi
}

ensure_clt

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

# 2.1) 檢查 Node 版本，必要時自動切換到 LTS (20.x) 以確保 nfc-pcsc 相容性
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -ge 21 ]; then
  yellow "⚠️ 偵測到 Node.js v$NODE_MAJOR，可能導致原生模組 ABI 不相容。"
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
    nvm install --lts=Hydrogen >/dev/null 2>&1 || nvm install 20
    nvm use 20 || true
    echo "$(green "✅ 已切換到 Node.js $(node -v)")"
  else
    yellow "ℹ️ 未偵測到 nvm，將嘗試以目前版本重新建置 nfc-pcsc。若遇到 NODE_MODULE_VERSION 錯誤，建議安裝 nvm 並使用 Node 20。"
  fi
fi

# 3) 安裝依賴
cd nfc-gateway-service
echo "$(bold "📦 安裝套件 (第一次可能需較久)...")"
npm install

echo "$(bold "🔍 檢查 nfc-pcsc 模組...")"
test_nfc_pcsc() {
  node -e "try{require('nfc-pcsc');console.log('OK')}catch(e){console.error(e.message);process.exit(1)}" >/dev/null 2>nfc_test_err.log
}
if test_nfc_pcsc; then
  echo "$(green "✅ nfc-pcsc 可用")"
else
  if grep -qi 'NODE_MODULE_VERSION' nfc_test_err.log; then
    yellow "⚠️ 偵測到原生模組 ABI 不相容（NODE_MODULE_VERSION）→ 重新建置中..."
  else
    yellow "⚠️ nfc-pcsc 無法載入 → 嘗試以原始碼建置..."
  fi
  export npm_config_build_from_source=true
  npm rebuild nfc-pcsc --build-from-source || npm install nfc-pcsc --build-from-source || true
  if test_nfc_pcsc; then
    echo "$(green "✅ 已修復 nfc-pcsc")"
  else
    yellow "⚠️ 仍無法載入 nfc-pcsc，將以『降級模式』啟動 (可連線，但無法讀取實體卡)"
    echo "🔎 詳細錯誤：" && sed -n '1,4p' nfc_test_err.log 2>/dev/null || true
  fi
fi
rm -f nfc_test_err.log

# 4) 設定雲端 API URL（預設為 Render 部署）
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

# 5) 啟動服務
open "http://localhost:3002/health" 2>/dev/null || true
open "http://localhost:3000/checkin-scanner" 2>/dev/null || true

echo "=============================================="
echo "$(bold "🚀 正在啟動 NFC Gateway Service (3002)...")"
echo "若看到『NFC 模組不可用（降級模式）』，請："
echo " • 確認 ACR122U 已插上"
echo " • 完成 Xcode Command Line Tools 安裝後重試"
echo "=============================================="

npm start