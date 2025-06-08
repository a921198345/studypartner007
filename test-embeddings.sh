#!/bin/bash

# 测试向量化功能的脚本（不依赖数据库）

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}开始测试AI问答系统的向量化功能${NC}"
echo -e "${BLUE}===============================================${NC}"

# 检查DEEPSEEK_API_KEY环境变量是否设置
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo -e "${YELLOW}警告: 未设置DEEPSEEK_API_KEY环境变量${NC}"
  echo -e "请通过以下方式设置API密钥:"
  echo -e "${RED}export DEEPSEEK_API_KEY=你的密钥${NC}"
  echo -e "或者将其添加到.env文件中，然后运行:"
  echo -e "${RED}source .env${NC}"
  exit 1
fi

echo -e "${GREEN}API密钥已设置，运行测试脚本...${NC}"

# 根据环境变量确定是使用node还是bun
if command -v bun &> /dev/null; then
  echo "使用Bun运行测试..."
  bun run test-embeddings.js
elif command -v node &> /dev/null; then
  echo "使用Node.js运行测试..."
  node test-embeddings.js
else
  echo -e "${YELLOW}错误: 未找到Node.js或Bun${NC}"
  echo "请安装Node.js或Bun后再试"
  exit 1
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}测试完成${NC}" 