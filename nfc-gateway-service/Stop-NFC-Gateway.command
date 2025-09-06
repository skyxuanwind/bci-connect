#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$DIR/.." && pwd)"

# 停止由 .gateway_pid 記錄的背景 Gateway 進程
if [ -f "$ROOT_DIR/.gateway_pid" ]; then
  PID=$(cat "$ROOT_DIR/.gateway_pid" || true)
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    echo "[BCI] 正在停止 Gateway (PID=$PID)..."
    kill "$PID" || true
    sleep 1
  fi
  rm -f "$ROOT_DIR/.gateway_pid"
fi

# 若是由 launchd 啟動的，則卸載對應 agent
if launchctl list | grep -q "com.bci.gateway"; then
  echo "[BCI] 停用登入自動啟動 (launchd)..."
  launchctl unload -w "$HOME/Library/LaunchAgents/com.bci.gateway.plist" || true
fi

echo "[BCI] Gateway 已停止。"