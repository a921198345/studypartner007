#!/bin/bash

# 清除可能存在的旧环境变量
unset DEEPSEEK_API_KEY

# 设置正确的 API 密钥
export DEEPSEEK_API_KEY="sk-73275c01fa3e42f3b86118482d719b78"

echo "=== 启动法考助手应用 ==="
echo "DeepSeek API 密钥已设置 (后4位: ${DEEPSEEK_API_KEY: -4})"
echo "正在启动开发服务器..."
echo ""

# 启动开发服务器
npm run dev