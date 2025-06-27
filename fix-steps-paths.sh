#!/bin/bash

echo "🔧 修复 learning-plan/steps 目录的路径..."

# 修复 components/learning-plan/steps/ 目录
# 从 components/learning-plan/steps/ 到 components/ui/ 需要 ../../ui/
for file in components/learning-plan/steps/*.tsx; do
    if [ -f "$file" ]; then
        echo "修复: $file"
        sed -i '' 's|../../../ui/|../../ui/|g' "$file"
    fi
done

echo "✅ learning-plan/steps 路径修复完成！"
