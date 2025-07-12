#!/bin/bash
echo "🛑 停止自动备份服务..."

if [ -f .auto-save.pid ]; then
    kill $(cat .auto-save.pid) 2>/dev/null
    rm .auto-save.pid
    echo "✅ 自动提交已停止"
fi

if [ -f .quick-save.pid ]; then
    kill $(cat .quick-save.pid) 2>/dev/null
    rm .quick-save.pid
    echo "✅ 快速备份已停止"
fi

# 清理所有相关进程
pkill -f "auto-save.sh" 2>/dev/null
pkill -f "quick-save.sh" 2>/dev/null

echo "🏁 所有备份服务已停止"
