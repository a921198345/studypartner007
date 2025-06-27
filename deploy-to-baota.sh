#!/bin/bash

# 宝塔面板部署脚本 - v0.96版本
# 请在宝塔面板终端中执行此脚本

echo "=== 法考助手 v0.96 版本部署开始 ==="

# 设置网站目录 (请根据实际情况修改)
SITE_DIR="/www/wwwroot/你的网站域名"

# 备份当前版本
echo "1. 备份当前版本..."
if [ -d "$SITE_DIR" ]; then
    cp -r "$SITE_DIR" "${SITE_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    echo "✅ 备份完成"
else
    echo "⚠️  网站目录不存在，跳过备份"
fi

# 进入网站目录
cd "$SITE_DIR" || {
    echo "❌ 无法进入网站目录: $SITE_DIR"
    exit 1
}

# 拉取最新代码
echo "2. 拉取最新代码..."
if [ -d ".git" ]; then
    git fetch origin
    git checkout main
    git pull origin main
    git checkout v0.96
    echo "✅ 代码更新完成 - 切换到v0.96版本"
else
    echo "初始化Git仓库..."
    git clone https://github.com/a921198345/studypartner007.git temp_repo
    cp -r temp_repo/* .
    cp -r temp_repo/.* . 2>/dev/null || true
    rm -rf temp_repo
    git checkout v0.96
    echo "✅ 代码克隆完成 - 使用v0.96版本"
fi

# 安装依赖
echo "3. 安装项目依赖..."
npm install --production
echo "✅ 依赖安装完成"

# 构建项目
echo "4. 构建生产版本..."
npm run build
echo "✅ 项目构建完成"

# 检查PM2进程
echo "5. 管理PM2进程..."
if pm2 list | grep -q "law-exam-assistant"; then
    echo "重启现有PM2进程..."
    pm2 restart law-exam-assistant
else
    echo "启动新的PM2进程..."
    pm2 start npm --name "law-exam-assistant" -- start
fi
echo "✅ PM2进程管理完成"

# 清理缓存
echo "6. 清理系统缓存..."
npm cache clean --force 2>/dev/null || true
echo "✅ 缓存清理完成"

# 检查服务状态
echo "7. 检查服务状态..."
pm2 status
echo ""

# 完成提示
echo "=== 🎉 部署完成! ==="
echo "📋 部署信息:"
echo "   版本: v0.96"
echo "   时间: $(date)"
echo "   目录: $SITE_DIR"
echo ""
echo "🔍 验证步骤:"
echo "1. 访问网站检查功能是否正常"
echo "2. 查看PM2日志: pm2 logs law-exam-assistant"
echo "3. 如有问题请检查环境变量配置"
echo ""
echo "📞 如需回滚到备份版本:"
echo "   cp -r ${SITE_DIR}_backup_* $SITE_DIR"