#!/bin/bash

# 法律考试助手 - 自动部署脚本
# 适用于宝塔面板部署

echo "🚀 开始部署法律考试助手..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装依赖
echo "📦 安装依赖..."
npm ci --production

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

# 4. 重启应用
echo "🔄 重启应用..."
# 杀掉之前的进程
pkill -f "next start" || true
pkill -f "npm run dev" || true
sleep 2

# 启动生产环境
nohup npm start > /dev/null 2>&1 &

echo "✅ 部署完成！"
echo "🌐 请访问你的域名查看效果"

# 显示进程状态
echo "📊 当前运行状态："
ps aux | grep -E "(next|npm)" | grep -v grep 