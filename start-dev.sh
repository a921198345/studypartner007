#!/bin/bash

echo "=== 启动法考助手应用 ==="

# 检查环境变量文件是否存在
if [ ! -f ".env.local" ]; then
    echo "错误：.env.local 文件不存在！"
    echo "请创建 .env.local 文件并配置必要的环境变量。"
    echo "可以参考 .env.example 文件。"
    exit 1
fi

# 检查必要的环境变量
source .env.local

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "错误：DEEPSEEK_API_KEY 环境变量未设置！"
    exit 1
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "警告：数据库环境变量未完整设置！"
    echo "请检查 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
fi

echo "环境变量检查完成"
echo "正在启动开发服务器..."
echo ""

# 启动开发服务器
npm run dev