#!/bin/bash

# 一键安装自动备份系统

echo "🚀 安装自动备份系统..."

# 1. 安装fswatch (Mac)
if ! command -v fswatch >/dev/null 2>&1; then
    echo "📦 安装fswatch..."
    if command -v brew >/dev/null 2>&1; then
        brew install fswatch
    else
        echo "❌ 请先安装Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
fi

# 2. 创建备份分支
echo "🔧 设置Git备份分支..."
git branch auto-backup 2>/dev/null || echo "备份分支已存在"

# 3. 创建启动脚本
cat > start-auto-backup.sh << 'EOF'
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
EOF

chmod +x start-auto-backup.sh

# 4. 创建停止脚本
cat > stop-auto-backup.sh << 'EOF'
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
EOF

chmod +x stop-auto-backup.sh

# 5. 创建状态检查脚本
cat > check-backup-status.sh << 'EOF'
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
EOF

chmod +x check-backup-status.sh

# 6. 添加到.gitignore
echo "" >> .gitignore
echo "# 自动备份系统" >> .gitignore
echo ".backups/" >> .gitignore
echo ".auto-save.pid" >> .gitignore
echo ".quick-save.pid" >> .gitignore

echo ""
echo "🎉 自动备份系统安装完成!"
echo ""
echo "🔧 使用方法:"
echo "  启动: ./start-auto-backup.sh"
echo "  停止: ./stop-auto-backup.sh"
echo "  状态: ./check-backup-status.sh"
echo ""
echo "📋 手动命令:"
echo "  快速保存: ./quick-save.sh save '描述'"
echo "  查看备份: ./quick-save.sh list"
echo "  恢复备份: ./quick-save.sh restore 备份名"
echo ""
echo "💡 建议现在就启动: ./start-auto-backup.sh"