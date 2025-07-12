#!/bin/bash
echo "🔄 启动所有自动备份服务..."

# 启动自动提交监控(后台)
./auto-save.sh start &
AUTO_SAVE_PID=$!

# 启动快速备份(后台)
./quick-save.sh auto &
QUICK_SAVE_PID=$!

echo "✅ 自动备份已启动!"
echo "自动提交PID: $AUTO_SAVE_PID"
echo "快速备份PID: $QUICK_SAVE_PID"

# 保存PID以便停止
echo "$AUTO_SAVE_PID" > .auto-save.pid
echo "$QUICK_SAVE_PID" > .quick-save.pid

echo "💡 停止备份: ./stop-auto-backup.sh"
echo "💡 查看状态: ./check-backup-status.sh"
