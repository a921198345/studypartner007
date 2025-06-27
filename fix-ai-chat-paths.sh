#!/bin/bash

echo "🔧 修复 ai-chat 目录的路径问题..."

# 修复 components/ai-chat/ 目录下的路径
for file in components/ai-chat/*.tsx components/ai-chat/*.ts; do
    if [ -f "$file" ]; then
        echo "修复: $file"
        # 修复错误的 ../../ui/ 为 ../ui/
        sed -i '' 's|../../ui/|../ui/|g' "$file"
        sed -i '' 's|../../../hooks/|../../hooks/|g' "$file"
        sed -i '' 's|../../../lib/|../../lib/|g' "$file"
        sed -i '' 's|../../../stores/|../../stores/|g' "$file"
        sed -i '' 's|../../../utils/|../../utils/|g' "$file"
    fi
done

echo "✅ ai-chat 路径修复完成！"
