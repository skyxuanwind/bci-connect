#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "[BCI] NFC Gateway macOS 啟動器"

# 檢查 Node.js 是否存在
if ! command -v node >/dev/null 2>&1; then
  echo "[BCI] 未偵測到 Node.js，請先安裝 Node 18/20 LTS: https://nodejs.org/en/download"
  exit 1
fi

# 安裝依賴（若需要）
echo "[BCI] 安裝依賴 (若需要)..."
if [ -f package-lock.json ]; then
  npm ci --no-fund --no-audit || npm install --no-fund --no-audit
else
  npm install --no-fund --no-audit
fi

# 停止先前背景程序（若存在）
echo "[BCI] 停止先前的 Gateway（若存在）..."
if [ -f ../.gateway_pid ]; then
  PID=$(cat ../.gateway_pid || true)
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    sleep 1
  fi
  rm -f ../.gateway_pid
fi

# 啟動 Gateway 到 3002 埠，並輸出日誌到目前資料夾
echo "[BCI] 啟動 Gateway（port=3002）..."
PORT=3002 CLOUD_API_URL="https://bci-connect.onrender.com" node server.js \
  > "$DIR/gateway.out.log" 2> "$DIR/gateway.err.log" &
echo $! > ../.gateway_pid

# 等待健康檢查可用
printf "[BCI] 等待服務就緒"
for i in {1..30}; do
  if curl -sS -m 2 http://localhost:3002/health >/dev/null 2>&1; then
    echo "\n[BCI] Gateway 已啟動：http://localhost:3002"
    exit 0
  fi
  printf "."
  sleep 1
done

echo "\n[BCI] Gateway 未在 30 秒內回應健康檢查，請查看 $DIR/gateway.err.log 以排查。"
exit 1