#!/bin/bash

echo "🧹 清理缓存并重启开发服务器..."
echo ""

# 停止可能正在运行的开发服务器
echo "1. 请先手动停止当前的开发服务器 (Ctrl+C)"
echo "   按Enter继续..."
read

# 清除Next.js缓存
echo "2. 清除Next.js缓存..."
rm -rf .next
echo "   ✅ 已清除 .next 目录"

# 清除node_modules缓存（可选）
echo ""
echo "3. 是否要清除 node_modules/.cache? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    rm -rf node_modules/.cache
    echo "   ✅ 已清除 node_modules/.cache"
fi

# 重新构建
echo ""
echo "4. 重新构建项目..."
npm run build

echo ""
echo "5. 启动开发服务器..."
npm run dev