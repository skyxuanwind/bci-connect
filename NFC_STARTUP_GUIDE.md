# 🚀 NFC 系統一鍵啟動指南

## 📋 概述

這個自動化腳本可以一鍵啟動完整的 NFC 報到系統，包括：
- 🖥️ 後端 API 服務 (端口 8000)
- ⚛️ React 前端網頁 (端口 3000)
- 🏷️ NFC Gateway Service (端口 3002)

## 🚀 快速開始

### 1. 啟動系統
```bash
./start-nfc-system.sh
```

### 2. 停止系統
```bash
./stop-nfc-system.sh
```

## 📱 使用流程

### 第一次使用
1. **執行啟動腳本**
   ```bash
   ./start-nfc-system.sh
   ```

2. **等待服務啟動**
   - 腳本會自動檢查並安裝依賴
   - 依序啟動後端、NFC Gateway、前端服務
   - 自動打開瀏覽器到 `http://localhost:3000`

3. **開始使用 NFC 功能**
   - 訪問 NFC 報到頁面：`http://localhost:3000/nfc-report-system`
   - 連接 ACR122U NFC 讀卡機
   - 開始 NFC 報到

### 日常使用
1. **啟動**: `./start-nfc-system.sh`
2. **使用**: 瀏覽器會自動打開
3. **停止**: `./stop-nfc-system.sh`

## 🔧 系統要求

### 必需軟體
- ✅ Node.js (v16 或更高版本)
- ✅ npm (Node.js 包管理器)
- ✅ ACR122U NFC 讀卡機

### 系統支援
- ✅ macOS
- ✅ Linux
- ✅ Windows (需要 Git Bash 或 WSL)

## 📊 服務資訊

| 服務 | 端口 | URL | 說明 |
|------|------|-----|------|
| 前端網頁 | 3000 | http://localhost:3000 | React 用戶界面 |
| 後端 API | 8000 | http://localhost:8000 | Express API 服務 |
| NFC Gateway | 3002 | http://localhost:3002 | NFC 讀卡機服務 |

## 📝 日誌管理

### 日誌文件位置
```
logs/
├── backend.log      # 後端服務日誌
├── frontend.log     # 前端服務日誌
└── nfc-gateway.log  # NFC Gateway 日誌
```

### 查看日誌
```bash
# 查看後端日誌
tail -f logs/backend.log

# 查看 NFC Gateway 日誌
tail -f logs/nfc-gateway.log

# 查看前端日誌
tail -f logs/frontend.log
```

## 🛠️ 故障排除

### 常見問題

#### 1. 端口被佔用
**問題**: `Error: listen EADDRINUSE :::3000`

**解決方案**:
```bash
# 查看佔用端口的進程
lsof -i :3000

# 停止特定進程
kill -9 <PID>

# 或使用停止腳本
./stop-nfc-system.sh
```

#### 2. NFC 讀卡機無法識別
**問題**: NFC Gateway 無法連接讀卡機

**解決方案**:
1. 確認 ACR122U 已正確連接
2. 檢查系統權限
3. 重新插拔讀卡機
4. 重啟 NFC Gateway Service

#### 3. 依賴安裝失敗
**問題**: `npm install` 失敗

**解決方案**:
```bash
# 清理 npm 快取
npm cache clean --force

# 刪除 node_modules 重新安裝
rm -rf node_modules client/node_modules nfc-gateway-service/node_modules
./start-nfc-system.sh
```

#### 4. 服務啟動失敗
**問題**: 某個服務無法啟動

**解決方案**:
1. 查看對應的日誌文件
2. 檢查端口是否被佔用
3. 確認環境變數設定
4. 重新啟動系統

### 手動檢查命令

```bash
# 檢查所有 Node.js 進程
ps aux | grep node

# 檢查端口使用情況
lsof -i :3000,3002,8000

# 檢查服務健康狀態
curl http://localhost:8000/health
curl http://localhost:3002/health
curl http://localhost:3000
```

## 🔐 安全注意事項

1. **本地使用**: 這些腳本設計用於本地開發環境
2. **防火牆**: 確保防火牆允許相關端口
3. **權限**: NFC 讀卡機可能需要管理員權限
4. **網路**: 確保網路連接穩定（用於雲端 API 通信）

## 📚 相關文檔

- `NFC_SYSTEM_README.md` - NFC 系統詳細說明
- `DEBUG_GUIDE.md` - 完整的除錯指南
- `nfc-gateway-service/README.md` - NFC Gateway 服務說明

## 💡 使用技巧

### 1. 快速重啟
```bash
./stop-nfc-system.sh && ./start-nfc-system.sh
```

### 2. 背景運行
```bash
# 啟動後可以關閉終端，服務會繼續運行
nohup ./start-nfc-system.sh &
```

### 3. 開機自動啟動
可以將啟動腳本加入系統啟動項目（依作業系統而定）

### 4. 監控服務狀態
```bash
# 持續監控所有日誌
tail -f logs/*.log
```

## 🎯 最佳實踐

1. **定期更新**: 保持依賴套件最新
2. **日誌清理**: 定期清理日誌文件
3. **備份設定**: 備份重要的環境變數設定
4. **測試環境**: 在測試環境先驗證功能

## 🆘 支援

如果遇到問題：
1. 查看相關日誌文件
2. 參考故障排除章節
3. 檢查 `DEBUG_GUIDE.md`
4. 聯繫技術支援

---

**🎉 享受便捷的 NFC 報到體驗！**