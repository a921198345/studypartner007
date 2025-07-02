#!/bin/bash

# 法律考试助手 - 宝塔面板部署脚本
# 使用方法: bash deploy.sh

echo "🚀 开始部署法律考试助手 (宝塔面板版)..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装依赖 (生产环境)
echo "📦 安装依赖..."
npm install --production

# 3. 构建项目
echo "🔨 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

# 4. 停止现有进程
echo "🛑 停止现有进程..."
if command -v pm2 &> /dev/null; then
    pm2 stop law-exam-assistant 2>/dev/null || echo "进程不存在，继续..."
    pm2 delete law-exam-assistant 2>/dev/null || echo "进程不存在，继续..."
else
    pkill -f "node server.js" || true
    pkill -f "next start" || true
    sleep 2
fi

# 5. 设置环境变量
export NODE_ENV=production
export PORT=8080

# 6. 启动应用
echo "🚀 启动应用..."
if command -v pm2 &> /dev/null; then
    # 使用 PM2 启动自定义服务器
    pm2 start server.js --name "law-exam-assistant" --env production
    pm2 save
    echo "✅ 使用 PM2 启动成功"
else
    # 使用 nohup 后台启动
    nohup node server.js > /tmp/law-exam-assistant.log 2>&1 &
    echo $! > /tmp/law-exam-assistant.pid
    echo "✅ 使用后台进程启动成功"
fi

# 7. 等待启动并检查状态
echo "⏳ 等待服务启动..."
sleep 5

# 检查端口是否监听
if netstat -tlnp | grep -q ":8080 "; then
    echo "✅ 服务已启动，监听端口 8080"
else
    echo "❌ 服务启动失败，请检查日志"
    if command -v pm2 &> /dev/null; then
        pm2 logs law-exam-assistant --lines 10
    else
        tail -10 /tmp/law-exam-assistant.log
    fi
    exit 1
fi

echo "✅ 部署完成！"
echo "🌐 本地访问: http://localhost:8080"
echo "📱 服务器访问: http://你的服务器IP:8080"

# 显示进程状态
echo "📊 当前运行状态："
if command -v pm2 &> /dev/null; then
    pm2 status law-exam-assistant
    echo "📝 查看日志: pm2 logs law-exam-assistant"
else
    ps aux | grep -E "(node server.js)" | grep -v grep
    echo "📝 查看日志: tail -f /tmp/law-exam-assistant.log"
fi

echo ""
echo "🔧 接下来请在宝塔面板配置:"
echo "1. 网站 -> 添加站点 -> 配置反向代理到 http://127.0.0.1:8080"
echo "2. 申请 SSL 证书"
echo "3. 设置防火墙规则" 