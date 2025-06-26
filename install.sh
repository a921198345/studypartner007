#!/bin/bash

echo "正在安装项目依赖..."
echo "这可能需要几分钟时间，请耐心等待..."

# 使用淘宝镜像加速安装
npm install --registry https://registry.npmmirror.com

echo "安装完成！"