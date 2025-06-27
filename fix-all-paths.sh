#!/bin/bash

echo "🔧 最终修复所有@/路径..."

# 修复 components/ui/ 目录下的所有文件 (ui组件通常只引用其他ui组件)
for file in components/ui/*.tsx components/ui/*.ts; do
    if [ -f "$file" ] && grep -q "@/" "$file" 2>/dev/null; then
        echo "修复UI组件: $file"
        # ui组件之间的引用
        sed -i '' 's|@/components/ui/|./|g' "$file"
        # ui组件引用其他模块
        sed -i '' 's|@/hooks/|../../hooks/|g' "$file"
        sed -i '' 's|@/lib/|../../lib/|g' "$file"
        sed -i '' 's|@/utils/|../../utils/|g' "$file"
    fi
done

# 修复所有剩余的components目录下的文件
find components/ -name "*.tsx" -o -name "*.ts" | while read file; do
    if [ -f "$file" ] && grep -q "@/" "$file" 2>/dev/null; then
        echo "最终修复: $file"
        
        # 计算相对路径深度
        depth=$(echo "$file" | grep -o "/" | wc -l | xargs)
        
        if [ $depth -eq 1 ]; then
            # components/ 根目录
            sed -i '' 's|@/components/ui/|ui/|g' "$file"
            sed -i '' 's|@/components/|./|g' "$file"
            sed -i '' 's|@/hooks/|../hooks/|g' "$file"
            sed -i '' 's|@/lib/|../lib/|g' "$file"
            sed -i '' 's|@/stores/|../stores/|g' "$file"
            sed -i '' 's|@/utils/|../utils/|g' "$file"
        elif [ $depth -eq 2 ]; then
            # components/subdir/ 一级子目录
            sed -i '' 's|@/components/ui/|../ui/|g' "$file"
            sed -i '' 's|@/components/|../|g' "$file"
            sed -i '' 's|@/hooks/|../../hooks/|g' "$file"
            sed -i '' 's|@/lib/|../../lib/|g' "$file"
            sed -i '' 's|@/stores/|../../stores/|g' "$file"
            sed -i '' 's|@/utils/|../../utils/|g' "$file"
        elif [ $depth -eq 3 ]; then
            # components/subdir/subdir2/ 二级子目录
            sed -i '' 's|@/components/ui/|../../ui/|g' "$file"
            sed -i '' 's|@/components/|../../|g' "$file"
            sed -i '' 's|@/hooks/|../../../hooks/|g' "$file"
            sed -i '' 's|@/lib/|../../../lib/|g' "$file"
            sed -i '' 's|@/stores/|../../../stores/|g' "$file"
            sed -i '' 's|@/utils/|../../../utils/|g' "$file"
        fi
    fi
done

echo "✅ 所有@/路径修复完成！"

# 最终检查
echo "🔍 最终检查..."
remaining=$(find components/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/" 2>/dev/null | wc -l | xargs)
if [ "$remaining" -eq 0 ]; then
    echo "✅ 所有components目录下的@/路径都已修复！"
else
    echo "⚠️ 仍有 $remaining 个文件包含@/路径，需要手动检查"
    find components/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/" 2>/dev/null | head -5
fi
