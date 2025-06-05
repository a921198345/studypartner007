#!/bin/bash
# 法考助手简易启动脚本 - 向量知识库服务

echo "=== 法考助手向量知识库服务启动 ==="

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到python3命令，请安装Python 3"
    exit 1
fi

# 创建logs目录
mkdir -p logs

# 确保目录存在
mkdir -p uploads/documents
mkdir -p data

# 确保依赖项已安装
if [ ! -d "venv_flask_api" ]; then
    echo "正在设置向量数据库环境..."
    bash setup_vector_db.sh
    echo "环境设置完成！"
else
    echo "找到现有环境，跳过设置..."
    source venv_flask_api/bin/activate
fi

# 启动主API服务
echo ""
echo "=== 启动API服务 (端口: 5003) ==="
python3 admin_api.py > logs/admin_api.log 2>&1 &
API_PID=$!
echo "API服务已启动，PID: $API_PID"

# 等待API服务启动
echo "正在等待服务启动..."
sleep 2

# 尝试打开默认浏览器
echo ""
echo "=== 服务已启动 ==="
echo "您可以通过以下URL访问服务："
echo "- 简易上传与向量化: http://localhost:5003/easy_upload"
echo "- 向量化和检索测试: http://localhost:5003/test_vector_search.html"
echo "- 文档上传测试: http://localhost:5003/upload_test.html"
echo ""

# 尝试使用系统默认方式打开浏览器
if command -v open &> /dev/null; then
    # macOS
    open "http://localhost:5003/easy_upload"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "http://localhost:5003/easy_upload"
elif command -v start &> /dev/null; then
    # Windows
    start "http://localhost:5003/easy_upload"
else
    echo "请手动在浏览器中打开上述URL"
fi

echo "服务日志保存在 logs/admin_api.log"
echo "按 Ctrl+C 停止服务"

# 创建清理函数
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $API_PID 2>/dev/null
    echo "服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 等待用户按Ctrl+C
while true; do
    sleep 1
done 