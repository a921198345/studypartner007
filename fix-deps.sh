#!/bin/bash

echo "开始修复依赖问题..."

# 1. 清理缓存
echo "清理npm缓存..."
npm cache clean --force

# 2. 删除可能存在的残留文件
echo "删除残留文件..."
rm -rf node_modules
rm -f package-lock.json
rm -rf .next

# 3. 设置npm镜像为淘宝镜像（加速下载）
echo "设置npm镜像..."
npm config set registry https://registry.npmmirror.com

# 4. 安装依赖
echo "开始安装依赖..."
npm install

# 5. 恢复默认镜像
echo "恢复npm默认镜像..."
npm config set registry https://registry.npmjs.org

echo "修复完成！"
echo "现在可以运行: npm run dev"