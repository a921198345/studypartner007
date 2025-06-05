#!/bin/bash
# 启动法律文档处理系统

# 在后台启动结构API
echo "启动法律结构识别API (端口5004)..."
python structure_api.py &
STRUCTURE_PID=$!

# 等待1秒
sleep 1

# 启动主API
echo "启动主API服务 (端口5003)..."
python admin_api.py &
ADMIN_PID=$!

echo "服务已启动!"
echo "请访问: http://localhost:5003/upload_test.html"
echo ""
echo "按Ctrl+C停止服务"

# 等待用户输入
trap "kill $STRUCTURE_PID $ADMIN_PID; echo '服务已停止'; exit 0" INT
wait
