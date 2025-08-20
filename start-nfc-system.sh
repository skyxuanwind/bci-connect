#!/bin/bash

# 🚀 NFC 系統自動啟動腳本
# 自動啟動前端網頁和 NFC Gateway Service

echo "🚀 正在啟動 NFC 系統..."
echo "================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查是否在正確的目錄
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "nfc-gateway-service" ]; then
    echo -e "${RED}❌ 錯誤: 請在 BCI Connect 專案根目錄執行此腳本${NC}"
    exit 1
fi

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 錯誤: Node.js 未安裝，請先安裝 Node.js${NC}"
    exit 1
fi

# 檢查 npm 是否安裝
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 錯誤: npm 未安裝，請先安裝 npm${NC}"
    exit 1
fi

# 函數：檢查端口是否被佔用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # 端口被佔用
    else
        return 1  # 端口可用
    fi
}

# 函數：等待服務啟動
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ 等待 $service_name 啟動...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name 已啟動${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name 啟動超時${NC}"
    return 1
}

# 檢查並安裝依賴
echo -e "${BLUE}📦 檢查依賴套件...${NC}"

# 檢查主專案依賴
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 安裝主專案依賴...${NC}"
    npm install
fi

# 檢查前端依賴
if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}📦 安裝前端依賴...${NC}"
    cd client && npm install && cd ..
fi

# 檢查 NFC Gateway Service 依賴
if [ ! -d "nfc-gateway-service/node_modules" ]; then
    echo -e "${YELLOW}📦 安裝 NFC Gateway Service 依賴...${NC}"
    cd nfc-gateway-service && npm install && cd ..
fi

echo -e "${GREEN}✅ 依賴檢查完成${NC}"
echo ""

# 檢查端口狀態
echo -e "${BLUE}🔍 檢查端口狀態...${NC}"

# 檢查後端端口 (8000)
if check_port 8000; then
    echo -e "${YELLOW}⚠️  端口 8000 已被佔用 (後端服務可能已在運行)${NC}"
else
    echo -e "${GREEN}✅ 端口 8000 可用${NC}"
fi

# 檢查前端端口 (3000)
if check_port 3000; then
    echo -e "${YELLOW}⚠️  端口 3000 已被佔用 (前端可能已在運行)${NC}"
else
    echo -e "${GREEN}✅ 端口 3000 可用${NC}"
fi

# 檢查 NFC Gateway 端口 (3002)
if check_port 3002; then
    echo -e "${YELLOW}⚠️  端口 3002 已被佔用 (NFC Gateway 可能已在運行)${NC}"
else
    echo -e "${GREEN}✅ 端口 3002 可用${NC}"
fi

echo ""

# 創建日誌目錄
mkdir -p logs

# 啟動後端服務
echo -e "${BLUE}🖥️  啟動後端服務 (端口 8000)...${NC}"
if ! check_port 8000; then
    nohup npm start > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "後端 PID: $BACKEND_PID"
else
    echo -e "${YELLOW}⚠️  後端服務已在運行${NC}"
fi

# 等待後端啟動
sleep 3

# 啟動 NFC Gateway Service
echo -e "${BLUE}🏷️  啟動 NFC Gateway Service (端口 3002)...${NC}"
if ! check_port 3002; then
    cd nfc-gateway-service
    nohup npm start > ../logs/nfc-gateway.log 2>&1 &
    NFC_GATEWAY_PID=$!
    echo "NFC Gateway PID: $NFC_GATEWAY_PID"
    cd ..
else
    echo -e "${YELLOW}⚠️  NFC Gateway Service 已在運行${NC}"
fi

# 等待 NFC Gateway 啟動
sleep 3

# 啟動前端服務
echo -e "${BLUE}⚛️  啟動前端服務 (端口 3000)...${NC}"
if ! check_port 3000; then
    cd client
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "前端 PID: $FRONTEND_PID"
    cd ..
else
    echo -e "${YELLOW}⚠️  前端服務已在運行${NC}"
fi

echo ""
echo -e "${BLUE}⏳ 等待所有服務啟動完成...${NC}"
sleep 10

# 檢查服務狀態
echo ""
echo -e "${BLUE}🔍 檢查服務狀態...${NC}"
echo "================================"

# 檢查後端
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 後端服務 (http://localhost:8000) - 運行正常${NC}"
else
    echo -e "${RED}❌ 後端服務 - 啟動失敗或未就緒${NC}"
fi

# 檢查 NFC Gateway
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ NFC Gateway Service (http://localhost:3002) - 運行正常${NC}"
else
    echo -e "${RED}❌ NFC Gateway Service - 啟動失敗或未就緒${NC}"
fi

# 檢查前端
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端服務 (http://localhost:3000) - 運行正常${NC}"
else
    echo -e "${RED}❌ 前端服務 - 啟動失敗或未就緒${NC}"
fi

echo ""
echo -e "${GREEN}🎉 NFC 系統啟動完成！${NC}"
echo "================================"
echo -e "${BLUE}📋 服務資訊:${NC}"
echo "• 前端網頁: http://localhost:3000"
echo "• 後端 API: http://localhost:8000"
echo "• NFC Gateway: http://localhost:3002"
echo "• NFC 報到頁面: http://localhost:3000/nfc-report-system"
echo ""
echo -e "${BLUE}📝 日誌文件:${NC}"
echo "• 後端日誌: logs/backend.log"
echo "• NFC Gateway 日誌: logs/nfc-gateway.log"
echo "• 前端日誌: logs/frontend.log"
echo ""
echo -e "${BLUE}🛠️  管理命令:${NC}"
echo "• 查看所有進程: ps aux | grep node"
echo "• 停止所有服務: ./stop-nfc-system.sh"
echo "• 查看日誌: tail -f logs/backend.log"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "• 首次啟動可能需要較長時間編譯前端"
echo "• 如果服務啟動失敗，請檢查對應的日誌文件"
echo "• NFC 讀卡機需要在本地連接 ACR122U 設備"
echo ""
echo -e "${GREEN}🌐 正在自動打開瀏覽器...${NC}"

# 等待前端完全啟動
sleep 5

# 自動打開瀏覽器
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:3000
else
    echo -e "${YELLOW}⚠️  無法自動打開瀏覽器，請手動訪問: http://localhost:3000${NC}"
fi

echo -e "${GREEN}✨ 系統已就緒，請開始使用 NFC 報到功能！${NC}"