#!/bin/bash
# 启动管理员API服务的脚本

# 确保当前目录是项目根目录
cd "$(dirname "$0")/.."

# 检查虚拟环境是否存在
if [ -d "venv_flask_api" ]; then
    echo "激活Python虚拟环境..."
    source venv_flask_api/bin/activate
else
    echo "错误：找不到Python虚拟环境 (venv_flask_api)。"
    echo "请先运行以下命令创建虚拟环境并安装依赖："
    echo "python3 -m venv venv_flask_api"
    echo "source venv_flask_api/bin/activate"
    echo "pip install flask mysql-connector-python"
    exit 1
fi

# 启动Flask API服务
echo "启动Flask Admin API服务在端口5002..."
python admin_api.py 