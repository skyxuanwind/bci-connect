#!/bin/bash

# 🛑 NFC 系統停止腳本
# 停止所有 NFC 系統相關服務

echo "🛑 正在停止 NFC 系統..."
echo "================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：停止指定端口的進程
stop_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}🔍 檢查端口 $port ($service_name)...${NC}"
    
    # 查找佔用端口的進程
    local pids=$(lsof -ti:$port)
    
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}⚠️  端口 $port 沒有運行的服務${NC}"
        return
    fi
    
    echo -e "${YELLOW}🔄 正在停止 $service_name (端口 $port)...${NC}"
    
    # 嘗試優雅停止
    for pid in $pids; do
        echo "正在停止進程 PID: $pid"
        kill $pid 2>/dev/null
    done
    
    # 等待進程停止
    sleep 3
    
    # 檢查是否還有進程運行
    local remaining_pids=$(lsof -ti:$port)
    
    if [ -n "$remaining_pids" ]; then
        echo -e "${RED}⚠️  強制停止 $service_name...${NC}"
        for pid in $remaining_pids; do
            kill -9 $pid 2>/dev/null
        done
        sleep 2
    fi
    
    # 最終檢查
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ $service_name 停止失敗${NC}"
    else
        echo -e "${GREEN}✅ $service_name 已停止${NC}"
    fi
}

# 函數：停止 Node.js 相關進程
stop_node_processes() {
    echo -e "${BLUE}🔍 查找 NFC 系統相關的 Node.js 進程...${NC}"
    
    # 查找包含特定關鍵字的 Node.js 進程
    local keywords=("npm start" "react-scripts" "nfc-gateway" "bci-connect")
    
    for keyword in "${keywords[@]}"; do
        local pids=$(ps aux | grep "$keyword" | grep -v grep | awk '{print $2}')
        
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}🔄 停止包含 '$keyword' 的進程...${NC}"
            for pid in $pids; do
                echo "停止進程 PID: $pid"
                kill $pid 2>/dev/null
            done
        fi
    done
}

# 停止各個服務
echo -e "${BLUE}🛑 開始停止服務...${NC}"
echo ""

# 停止前端服務 (端口 3000)
stop_port 3000 "前端服務"
echo ""

# 停止 NFC Gateway Service (端口 3002)
stop_port 3002 "NFC Gateway Service"
echo ""

# 停止後端服務 (端口 8000)
stop_port 8000 "後端服務"
echo ""

# 停止其他可能的 Node.js 進程
stop_node_processes
echo ""

# 等待所有進程完全停止
echo -e "${BLUE}⏳ 等待所有進程完全停止...${NC}"
sleep 3

# 最終檢查
echo -e "${BLUE}🔍 最終狀態檢查...${NC}"
echo "================================"

# 檢查端口狀態
ports=(3000 3002 8000)
port_names=("前端服務" "NFC Gateway" "後端服務")

for i in "${!ports[@]}"; do
    port=${ports[$i]}
    name=${port_names[$i]}
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ $name (端口 $port) - 仍在運行${NC}"
    else
        echo -e "${GREEN}✅ $name (端口 $port) - 已停止${NC}"
    fi
done

echo ""

# 清理日誌文件（可選）
read -p "是否要清理日誌文件？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "logs" ]; then
        echo -e "${BLUE}🧹 清理日誌文件...${NC}"
        rm -f logs/*.log
        echo -e "${GREEN}✅ 日誌文件已清理${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 NFC 系統已停止！${NC}"
echo "================================"
echo -e "${BLUE}📋 系統狀態:${NC}"
echo "• 所有服務已停止"
echo "• 端口已釋放"
echo "• 系統資源已清理"
echo ""
echo -e "${BLUE}🚀 重新啟動系統:${NC}"
echo "• 執行: ./start-nfc-system.sh"
echo ""
echo -e "${BLUE}🔍 檢查剩餘進程:${NC}"
echo "• 執行: ps aux | grep node"
echo "• 執行: lsof -i :3000,3002,8000"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "• 如果仍有進程無法停止，可能需要重啟終端或系統"
echo "• 確保 NFC 讀卡機已安全移除"
echo ""
echo -e "${GREEN}✨ 感謝使用 NFC 報到系統！${NC}"