#!/bin/bash

# 自动保存脚本 - 每次修改文件时自动创建备份提交
# 使用方法: ./auto-save.sh start (启动监控)
# 使用方法: ./auto-save.sh commit "描述" (手动提交)
# 使用方法: ./auto-save.sh list (查看备份历史)

PROJECT_DIR="/Users/acheng/Downloads/law-exam-assistant"
BACKUP_BRANCH="auto-backup"
MAIN_BRANCH="main"

cd "$PROJECT_DIR"

case "$1" in
    "start")
        echo "🚀 启动自动保存监控..."
        
        # 创建备份分支(如果不存在)
        git branch "$BACKUP_BRANCH" 2>/dev/null || true
        
        # 使用fswatch监控文件变化(Mac需安装: brew install fswatch)
        if command -v fswatch >/dev/null 2>&1; then
            echo "📁 监控目录: $PROJECT_DIR"
            echo "💾 备份分支: $BACKUP_BRANCH"
            echo "🔄 每30秒检查一次变化..."
            
            # 监控重要文件变化
            fswatch -o \
                --exclude=".git" \
                --exclude="node_modules" \
                --exclude=".next" \
                --exclude="*.log" \
                "$PROJECT_DIR" | while read f; do
                
                # 等待30秒,避免频繁提交
                sleep 30
                
                # 检查是否有变化
                if ! git diff --quiet || ! git diff --cached --quiet; then
                    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
                    
                    # 切换到备份分支
                    git checkout "$BACKUP_BRANCH" 2>/dev/null
                    
                    # 添加所有变化
                    git add -A
                    
                    # 自动提交
                    git commit -m "🔄 自动保存: $timestamp" 2>/dev/null
                    
                    echo "✅ [$timestamp] 代码已自动保存到 $BACKUP_BRANCH 分支"
                    
                    # 切回主分支
                    git checkout "$MAIN_BRANCH" 2>/dev/null
                fi
            done
        else
            echo "❌ 需要安装fswatch: brew install fswatch"
            echo "或者使用: ./auto-save.sh watch (简单版本)"
        fi
        ;;
        
    "watch")
        echo "🔄 启动简单监控模式(每60秒检查一次)..."
        git branch "$BACKUP_BRANCH" 2>/dev/null || true
        
        while true; do
            if ! git diff --quiet || ! git diff --cached --quiet; then
                timestamp=$(date "+%Y-%m-%d %H:%M:%S")
                
                git checkout "$BACKUP_BRANCH" 2>/dev/null
                git add -A
                git commit -m "🔄 自动保存: $timestamp" 2>/dev/null
                
                echo "✅ [$timestamp] 代码已自动保存"
                git checkout "$MAIN_BRANCH" 2>/dev/null
            fi
            sleep 60
        done
        ;;
        
    "commit")
        if [ -z "$2" ]; then
            echo "❌ 请提供提交描述: ./auto-save.sh commit '修改描述'"
            exit 1
        fi
        
        timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        
        # 同时提交到主分支和备份分支
        git add -A
        git commit -m "💾 [$timestamp] $2"
        
        git checkout "$BACKUP_BRANCH" 2>/dev/null
        git add -A
        git commit -m "💾 [$timestamp] $2" 2>/dev/null
        git checkout "$MAIN_BRANCH" 2>/dev/null
        
        echo "✅ 提交完成: $2"
        ;;
        
    "list")
        echo "📋 最近20次自动保存记录:"
        git log --oneline "$BACKUP_BRANCH" -20 | grep "🔄\|💾"
        ;;
        
    "restore")
        if [ -z "$2" ]; then
            echo "❌ 请提供要恢复的提交哈希: ./auto-save.sh restore abc1234"
            exit 1
        fi
        
        echo "🔄 恢复到提交: $2"
        git checkout "$2" -- .
        echo "✅ 文件已恢复,请检查后提交保存"
        ;;
        
    "status")
        echo "📊 当前状态:"
        echo "主分支: $(git branch --show-current)"
        echo "未提交变化:"
        git status --porcelain
        echo ""
        echo "备份分支最新提交:"
        git log --oneline "$BACKUP_BRANCH" -1 2>/dev/null || echo "备份分支不存在"
        ;;
        
    *)
        echo "🔧 自动保存工具使用说明:"
        echo ""
        echo "启动监控:"
        echo "  ./auto-save.sh start     # 使用fswatch监控(推荐)"
        echo "  ./auto-save.sh watch     # 简单定时检查"
        echo ""
        echo "手动操作:"
        echo "  ./auto-save.sh commit '描述'  # 手动提交"
        echo "  ./auto-save.sh list           # 查看备份历史"
        echo "  ./auto-save.sh restore hash   # 恢复到指定版本"
        echo "  ./auto-save.sh status         # 查看当前状态"
        echo ""
        echo "💡 建议: 在后台运行 './auto-save.sh start &' 持续监控"
        ;;
esac