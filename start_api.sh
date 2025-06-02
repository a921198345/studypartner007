#!/bin/bash

# 激活虚拟环境（如果有）
if [ -d "venv_flask_api" ]; then
    source venv_flask_api/bin/activate
fi

# 安装必要的依赖（如果没有安装）
pip install flask werkzeug flask-cors

# 启动API服务
python admin_api.py
