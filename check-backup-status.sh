#!/bin/bash
echo "📊 自动备份系统状态:"
echo "================================"

# 检查自动提交
if pgrep -f "auto-save.sh" > /dev/null; then
    echo "✅ 自动提交: 运行中"
else
    echo "❌ 自动提交: 未运行"
fi

# 检查快速备份
if pgrep -f "quick-save.sh" > /dev/null; then
    echo "✅ 快速备份: 运行中"
else
    echo "❌ 快速备份: 未运行"
fi

echo ""
./auto-save.sh status
echo ""
./quick-save.sh status
