#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 法考助手知识库配置脚本 ===${NC}"
echo "此脚本将帮助您设置向量数据库和DeepSeek API密钥。"

# 检查.env文件是否存在
if [ -f .env ]; then
  echo -e "${YELLOW}发现已存在的.env文件${NC}"
  if grep -q "DEEPSEEK_API_KEY" .env; then
    echo -e "${GREEN}已找到DeepSeek API密钥配置${NC}"
    current_key=$(grep "DEEPSEEK_API_KEY" .env | cut -d'=' -f2)
    echo -e "当前API密钥: ${YELLOW}${current_key}${NC}"
    
    read -p "是否要更新DeepSeek API密钥? (y/n): " update_key
    if [[ $update_key == "y" || $update_key == "Y" ]]; then
      read -p "请输入新的DeepSeek API密钥: " deepseek_key
      # 更新API密钥
      sed -i '' "s/DEEPSEEK_API_KEY=.*/DEEPSEEK_API_KEY=${deepseek_key}/" .env
      echo -e "${GREEN}DeepSeek API密钥已更新${NC}"
    fi
  else
    echo -e "${YELLOW}未找到DeepSeek API密钥配置，将添加新配置${NC}"
    read -p "请输入DeepSeek API密钥: " deepseek_key
    echo "DEEPSEEK_API_KEY=${deepseek_key}" >> .env
    echo -e "${GREEN}DeepSeek API密钥已添加到.env文件${NC}"
  fi
else
  echo -e "${YELLOW}未找到.env文件，将创建新文件${NC}"
  read -p "请输入DeepSeek API密钥: " deepseek_key
  echo "DEEPSEEK_API_KEY=${deepseek_key}" > .env
  echo -e "${GREEN}.env文件已创建，并添加了DeepSeek API密钥${NC}"
fi

# 确保数据目录存在
mkdir -p data
echo -e "${GREEN}已确保data目录存在${NC}"

# 检查SQLite数据库
if [ -f data/vector_store.db ]; then
  echo -e "${GREEN}已找到向量数据库文件${NC}"
  read -p "是否要重新初始化向量数据库? (y/n): " reinit_db
  if [[ $reinit_db == "y" || $reinit_db == "Y" ]]; then
    rm data/vector_store.db
    echo -e "${YELLOW}已删除旧的向量数据库文件${NC}"
    echo -e "${GREEN}向量数据库将在下次使用时自动重新初始化${NC}"
  fi
else
  echo -e "${YELLOW}未找到向量数据库文件，将在下次使用时自动创建${NC}"
fi

echo -e "${BLUE}=== 配置完成 ===${NC}"
echo "现在您可以使用以下命令启动服务:"
echo -e "${GREEN}python admin_api.py${NC}"
echo "然后访问: http://localhost:5003/easy_upload" 