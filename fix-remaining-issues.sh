#!/bin/bash

echo "🔧 修复剩余的路径问题..."

# 修复 main-nav.tsx
if [ -f "components/main-nav.tsx" ]; then
    echo "修复: components/main-nav.tsx"
    sed -i '' 's|../../lib/|../lib/|g' components/main-nav.tsx
    sed -i '' 's|../ui/|./ui/|g' components/main-nav.tsx
    sed -i '' 's|../BookBuddyLogo5|./BookBuddyLogo5|g' components/main-nav.tsx
    sed -i '' 's|../../hooks/|../hooks/|g' components/main-nav.tsx
fi

# 修复 question-bank 目录
for file in components/question-bank/*.tsx; do
    if [ -f "$file" ]; then
        echo "修复: $file"
        sed -i '' 's|../../../lib/|../../lib/|g' "$file"
        sed -i '' 's|../../../hooks/|../../hooks/|g' "$file"
    fi
done

# 修复其他根目录组件的路径
for file in components/*.tsx; do
    if [ -f "$file" ]; then
        echo "检查: $file"
        # 确保根目录组件的路径正确
        sed -i '' 's|../../lib/|../lib/|g' "$file"
        sed -i '' 's|../../hooks/|../hooks/|g' "$file"
        sed -i '' 's|../../stores/|../stores/|g' "$file"
        sed -i '' 's|../../utils/|../utils/|g' "$file"
    fi
done

echo "✅ 剩余路径问题修复完成！"
