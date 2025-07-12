#!/bin/bash

# 快速保存和恢复工具
# 每次修改重要文件时快速备份

PROJECT_DIR="/Users/acheng/Downloads/law-exam-assistant"
BACKUP_DIR="$PROJECT_DIR/.backups"
MAX_BACKUPS=50

cd "$PROJECT_DIR"

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

case "$1" in
    "save")
        description="${2:-手动保存}"
        timestamp=$(date "+%Y%m%d_%H%M%S")
        backup_name="${timestamp}_${description// /_}"
        
        echo "💾 创建快照: $backup_name"
        
        # 创建tar备份(排除不需要的文件)
        tar -czf "$BACKUP_DIR/$backup_name.tar.gz" \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.next' \
            --exclude='*.log' \
            --exclude='.backups' \
            .
            
        echo "✅ 快照已保存: $backup_name.tar.gz"
        
        # 同时git提交
        git add -A
        git commit -m "💾 快速保存: $description [$timestamp]" 2>/dev/null || true
        
        # 清理旧备份(保留最新50个)
        ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f 2>/dev/null || true
        ;;
        
    "list")
        echo "📋 可用的备份快照:"
        ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -20 | while read line; do
            filename=$(echo "$line" | awk '{print $9}')
            basename_file=$(basename "$filename" .tar.gz)
            timestamp=$(echo "$basename_file" | cut -d_ -f1-2)
            description=$(echo "$basename_file" | cut -d_ -f3- | tr '_' ' ')
            echo "  📦 $timestamp - $description"
        done
        ;;
        
    "restore")
        if [ -z "$2" ]; then
            echo "❌ 请指定要恢复的备份"
            echo "使用 './quick-save.sh list' 查看可用备份"
            exit 1
        fi
        
        backup_file="$BACKUP_DIR/$2.tar.gz"
        if [ ! -f "$backup_file" ]; then
            echo "❌ 备份文件不存在: $backup_file"
            exit 1
        fi
        
        echo "⚠️  警告: 这将覆盖当前所有文件!"
        echo "🔄 恢复备份: $2"
        read -p "确认恢复吗? (y/N): " confirm
        
        if [ "$confirm" = "y" ]; then
            # 先保存当前状态
            current_timestamp=$(date "+%Y%m%d_%H%M%S")
            echo "💾 备份当前状态..."
            tar -czf "$BACKUP_DIR/before_restore_$current_timestamp.tar.gz" \
                --exclude='.git' \
                --exclude='node_modules' \
                --exclude='.next' \
                --exclude='*.log' \
                --exclude='.backups' \
                .
            
            # 恢复备份
            echo "🔄 恢复中..."
            tar -xzf "$backup_file"
            echo "✅ 恢复完成!"
        else
            echo "❌ 恢复已取消"
        fi
        ;;
        
    "auto")
        echo "🔄 启动自动快照模式(每10分钟一次)..."
        while true; do
            # 检查是否有变化
            if ! git diff --quiet || [ -n "$(git status --porcelain)" ]; then
                timestamp=$(date "+%Y%m%d_%H%M%S")
                echo "📸 [$(date)] 自动创建快照..."
                
                tar -czf "$BACKUP_DIR/auto_$timestamp.tar.gz" \
                    --exclude='.git' \
                    --exclude='node_modules' \
                    --exclude='.next' \
                    --exclude='*.log' \
                    --exclude='.backups' \
                    . 2>/dev/null
                    
                # Git自动提交
                git add -A 2>/dev/null
                git commit -m "🔄 自动快照: $timestamp" 2>/dev/null || true
            fi
            
            sleep 600  # 10分钟
        done
        ;;
        
    "status")
        echo "📊 备份状态:"
        echo "备份目录: $BACKUP_DIR"
        echo "备份数量: $(ls "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)"
        echo "最新备份: $(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo '无')"
        echo "目录大小: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
        echo ""
        echo "Git状态:"
        git status --porcelain
        ;;
        
    *)
        echo "🔧 快速保存工具使用说明:"
        echo ""
        echo "保存快照:"
        echo "  ./quick-save.sh save ['描述']     # 手动创建快照"
        echo "  ./quick-save.sh auto             # 自动模式(每10分钟)"
        echo ""
        echo "管理快照:"
        echo "  ./quick-save.sh list             # 查看所有快照"
        echo "  ./quick-save.sh restore 快照名   # 恢复指定快照"
        echo "  ./quick-save.sh status           # 查看备份状态"
        echo ""
        echo "💡 推荐工作流程:"
        echo "1. 修改前: ./quick-save.sh save '开始修改logo'"
        echo "2. 修改后: ./quick-save.sh save 'logo修改完成'"
        echo "3. 出问题时: ./quick-save.sh restore 快照名"
        ;;
esac