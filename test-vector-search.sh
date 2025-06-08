#!/bin/bash

# 测试向量化和知识库检索功能的脚本

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}开始测试AI问答系统的向量化和知识库检索功能${NC}"
echo -e "${BLUE}===============================================${NC}"

# 检查DEEPSEEK_API_KEY环境变量是否设置
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo -e "${YELLOW}警告: 未设置DEEPSEEK_API_KEY环境变量${NC}"
  echo -e "将使用模拟向量模式进行测试"
  export MOCK_EMBEDDINGS=true
  export NODE_ENV=development
else 
  echo -e "${GREEN}API密钥已设置${NC}"
  # 如果要强制使用模拟向量，取消下面这行的注释
  # export MOCK_EMBEDDINGS=true
fi

echo -e "${GREEN}运行测试脚本...${NC}"

# 根据环境变量确定是使用node还是bun
if command -v bun &> /dev/null; then
  echo "使用Bun运行测试..."
  bun run test-vector-api.js
elif command -v node &> /dev/null; then
  echo "使用Node.js运行测试..."
  node --experimental-modules test-vector-api.js
else
  echo -e "${YELLOW}错误: 未找到Node.js或Bun${NC}"
  echo "请安装Node.js或Bun后再试"
  exit 1
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}测试完成${NC}" 