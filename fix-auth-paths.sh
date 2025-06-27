#!/bin/bash

echo "🔧 修复 auth 目录的路径问题..."

# 修复 components/auth/ 目录下的路径
for file in components/auth/*.tsx components/auth/*.ts; do
    if [ -f "$file" ]; then
        echo "修复: $file"
        # 修复错误的路径
        sed -i '' 's|../../../hooks/|../../hooks/|g' "$file"
        sed -i '' 's|../../ui/|../ui/|g' "$file"
        sed -i '' 's|../../../lib/|../../lib/|g' "$file"
        sed -i '' 's|../../../stores/|../../stores/|g' "$file"
        sed -i '' 's|../../../utils/|../../utils/|g' "$file"
    fi
done

echo "✅ auth 路径修复完成！"
