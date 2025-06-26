#!/bin/bash

# 法律结构识别服务启动脚本

echo "=== 法考助手服务启动脚本 ==="
echo "本脚本将启动以下服务："
echo "1. 主管理API (端口: 5003)"
echo "2. 法律结构识别API (端口: 5004)"
echo "3. 简易HTTP服务器 (端口: 8080)"

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到python3命令，请安装Python 3"
    exit 1
fi

# 创建logs目录
mkdir -p logs

# 启动主API服务
echo ""
echo "=== 启动主管理API服务 (端口: 5003) ==="
echo "正在后台启动..."
python3 admin_api.py > logs/admin_api.log 2>&1 &
ADMIN_API_PID=$!
echo "主管理API服务已启动，PID: $ADMIN_API_PID"

# 启动法律结构识别API
echo ""
echo "=== 启动法律结构识别API服务 (端口: 5004) ==="
echo "正在后台启动..."
python3 structure_api.py > logs/structure_api.log 2>&1 &
STRUCTURE_API_PID=$!
echo "法律结构识别API服务已启动，PID: $STRUCTURE_API_PID"

# 使用Python启动一个简单的HTTP服务器
echo ""
echo "=== 启动简易HTTP服务器 (端口: 8080) ==="
echo "正在后台启动..."
cd $(dirname "$0")
python3 -m http.server 8080 > logs/http_server.log 2>&1 &
HTTP_SERVER_PID=$!
echo "HTTP服务器已启动，PID: $HTTP_SERVER_PID"

echo ""
echo "=== 所有服务已启动 ==="
echo "您可以通过以下URL访问服务："
echo "- 主管理API: http://localhost:5003"
echo "- 法律结构识别API: http://localhost:5004"
echo "- 法律结构化文本查看器: http://localhost:8080/legal_structure_viewer.html"
echo "- 上传测试页面: http://localhost:8080/upload_test.html"

echo ""
echo "服务日志保存在 logs/ 目录下"
echo "- 管理API日志: logs/admin_api.log"
echo "- 结构识别API日志: logs/structure_api.log"
echo "- HTTP服务器日志: logs/http_server.log"

echo ""
echo "按 Ctrl+C 停止所有服务"

# 创建清理函数
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $ADMIN_API_PID 2>/dev/null
    kill $STRUCTURE_API_PID 2>/dev/null
    kill $HTTP_SERVER_PID 2>/dev/null
    echo "所有服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 等待用户按Ctrl+C
while true; do
    sleep 1
done 