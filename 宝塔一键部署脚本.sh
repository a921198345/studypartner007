#!/bin/bash

# 宝塔面板 Node.js 项目一键部署脚本
# 使用方法: bash 宝塔一键部署脚本.sh

echo "🚀 法律考试助手 - 宝塔面板一键部署"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 获取项目名称
PROJECT_NAME="law_exam_assistant"
echo -e "${BLUE}📋 项目名称: ${PROJECT_NAME}${NC}"

# 第一步：环境检查
echo -e "\n${YELLOW}🔍 第一步：环境检查${NC}"
echo "--------------------------------"

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 已安装: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi

# 检查 npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm 已安装: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

# 检查 PM2
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 已安装${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 未安装，将使用普通方式启动${NC}"
fi

# 第二步：拉取最新代码
echo -e "\n${YELLOW}📥 第二步：拉取最新代码${NC}"
echo "--------------------------------"
if [ -d ".git" ]; then
    git pull origin main
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 代码更新成功${NC}"
    else
        echo -e "${YELLOW}⚠️  代码更新失败，继续使用本地代码${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  非Git仓库，跳过代码拉取${NC}"
fi

# 第三步：安装依赖
echo -e "\n${YELLOW}📦 第三步：安装项目依赖${NC}"
echo "--------------------------------"
npm install --production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 依赖安装成功${NC}"
else
    echo -e "${RED}❌ 依赖安装失败${NC}"
    exit 1
fi

# 第四步：构建项目
echo -e "\n${YELLOW}🔨 第四步：构建生产版本${NC}"
echo "--------------------------------"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 项目构建成功${NC}"
else
    echo -e "${RED}❌ 项目构建失败${NC}"
    exit 1
fi

# 第五步：停止现有进程
echo -e "\n${YELLOW}🛑 第五步：停止现有进程${NC}"
echo "--------------------------------"
if command -v pm2 &> /dev/null; then
    pm2 stop ${PROJECT_NAME} 2>/dev/null || echo "进程不存在，继续..."
    pm2 delete ${PROJECT_NAME} 2>/dev/null || echo "进程不存在，继续..."
else
    # 杀死可能存在的进程
    pkill -f "node server.js" || echo "没有找到运行中的服务器进程"
    pkill -f "next start" || echo "没有找到Next.js进程"
fi

# 第六步：启动应用
echo -e "\n${YELLOW}🚀 第六步：启动应用服务${NC}"
echo "--------------------------------"

# 设置环境变量
export NODE_ENV=production
export PORT=8080

if command -v pm2 &> /dev/null; then
    # 使用 PM2 启动
    pm2 start server.js --name ${PROJECT_NAME} --env production
    pm2 save
    pm2 startup
    echo -e "${GREEN}✅ 使用 PM2 启动成功${NC}"
else
    # 使用 nohup 后台启动
    nohup node server.js > /tmp/${PROJECT_NAME}.log 2>&1 &
    echo $! > /tmp/${PROJECT_NAME}.pid
    echo -e "${GREEN}✅ 使用后台进程启动成功${NC}"
fi

# 等待服务启动
echo -e "\n${BLUE}⏳ 等待服务启动...${NC}"
sleep 5

# 第七步：检查服务状态
echo -e "\n${YELLOW}📊 第七步：检查服务状态${NC}"
echo "--------------------------------"

# 检查端口是否监听
if netstat -tlnp | grep -q ":8080 "; then
    echo -e "${GREEN}✅ 服务已启动，监听端口 8080${NC}"
else
    echo -e "${RED}❌ 服务启动失败，端口 8080 未监听${NC}"
    exit 1
fi

# 检查 HTTP 响应
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ HTTP 服务响应正常${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP 服务可能需要时间启动，请稍后检查${NC}"
fi

# 显示进程状态
if command -v pm2 &> /dev/null; then
    echo -e "\n${BLUE}📈 PM2 进程状态:${NC}"
    pm2 status ${PROJECT_NAME}
    echo -e "\n${BLUE}📝 查看日志命令: pm2 logs ${PROJECT_NAME}${NC}"
else
    echo -e "\n${BLUE}📈 进程状态:${NC}"
    ps aux | grep -E "(node server.js|${PROJECT_NAME})" | grep -v grep
    echo -e "\n${BLUE}📝 查看日志命令: tail -f /tmp/${PROJECT_NAME}.log${NC}"
fi

# 第八步：部署后配置提醒
echo -e "\n${YELLOW}⚙️  第八步：后续配置提醒${NC}"
echo "=================================="
echo -e "${BLUE}🔧 请在宝塔面板完成以下配置:${NC}"
echo
echo "1. 网站管理 -> 添加站点"
echo "   域名: your-domain.com" 
echo "   根目录: /www/wwwroot/law-exam-assistant-web"
echo "   PHP版本: 纯静态"
echo
echo "2. 反向代理配置"
echo "   目标URL: http://127.0.0.1:8080"
echo "   发送域名: \$host"
echo
echo "3. SSL证书配置"
echo "   申请 Let's Encrypt 免费证书"
echo
echo "4. 防火墙设置"
echo "   开放 8080 端口（仅内网访问）"
echo

# 显示访问信息
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=================================="
echo -e "${BLUE}📱 本地访问: http://localhost:8080${NC}"
echo -e "${BLUE}🌐 服务器访问: http://你的服务器IP:8080${NC}"
echo -e "${YELLOW}⚠️  注意: 配置域名和反向代理后才能通过域名访问${NC}"
echo

# 显示常用管理命令
echo -e "${BLUE}🛠️  常用管理命令:${NC}"
echo "=================================="
if command -v pm2 &> /dev/null; then
    echo "重启服务: pm2 restart ${PROJECT_NAME}"
    echo "停止服务: pm2 stop ${PROJECT_NAME}"
    echo "查看日志: pm2 logs ${PROJECT_NAME}"
    echo "查看状态: pm2 status"
else
    echo "停止服务: kill \$(cat /tmp/${PROJECT_NAME}.pid)"
    echo "查看日志: tail -f /tmp/${PROJECT_NAME}.log"
    echo "查看进程: ps aux | grep 'node server.js'"
fi
echo "重新部署: bash 宝塔一键部署脚本.sh"

echo -e "\n${GREEN}✨ 祝您使用愉快！${NC}"