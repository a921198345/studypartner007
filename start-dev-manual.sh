#!/bin/bash

# 法考助手开发环境启动脚本
echo "🚀 正在启动法考助手开发环境..."

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖包..."
    
    # 尝试使用 yarn
    if command -v yarn &> /dev/null; then
        echo "使用 yarn 安装依赖..."
        yarn install
    else
        echo "使用 npm 安装依赖..."
        npm install
    fi
fi

# 检查 Next.js 是否安装
if [ ! -f "node_modules/.bin/next" ]; then
    echo "❌ Next.js 未正确安装，尝试手动安装..."
    npm install next@latest react@latest react-dom@latest
fi

# 启动开发服务器
echo "🌟 启动开发服务器..."
if [ -f "node_modules/.bin/next" ]; then
    ./node_modules/.bin/next dev
else
    npx next dev
fi