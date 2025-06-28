#!/bin/bash

echo "🚀 开始宝塔面板自动部署..."

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 备份当前进程
echo "📦 备份当前PM2进程..."
pm2 save 2>/dev/null || true

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git拉取失败，请检查网络连接或解决冲突"
    exit 1
fi

# 清理缓存
echo "🧹 清理缓存..."
npm cache clean --force
rm -rf .next
rm -rf node_modules

# 重新安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

# 停止旧进程
echo "⏹️  停止旧进程..."
pm2 stop law-exam-assistant 2>/dev/null || true
pm2 delete law-exam-assistant 2>/dev/null || true

# 启动新进程
echo "▶️  启动新进程..."
pm2 start npm --name "law-exam-assistant" -- start

if [ $? -ne 0 ]; then
    echo "❌ PM2启动失败"
    exit 1
fi

# 保存PM2配置
pm2 save

# 检查状态
echo "✅ 部署完成！PM2状态："
pm2 status

echo ""
echo "🎉 部署成功！网站应该已经更新。"
echo "📝 查看日志: pm2 logs law-exam-assistant"
echo "🔄 重启服务: pm2 restart law-exam-assistant"
echo "⏹️  停止服务: pm2 stop law-exam-assistant"
