#!/bin/bash

# 法考助手 - 宝塔面板自动化部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "🚀 开始部署法考助手..."

# 设置错误时退出
set -e

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装/更新依赖
echo "📦 安装依赖..."
npm ci --production

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

# 4. 使用PM2重新加载应用
echo "🔄 重新加载应用..."
if pm2 list | grep -q "law-exam-assistant"; then
    echo "重新加载现有PM2进程..."
    pm2 reload law-exam-assistant
else
    echo "启动新的PM2进程..."
    pm2 start npm --name "law-exam-assistant" -- start
    pm2 save
fi

# 5. 显示状态
echo "📊 当前运行状态："
pm2 status
pm2 logs law-exam-assistant --lines 5

echo "✅ 部署完成！"
echo "🌐 请访问你的域名查看效果" 