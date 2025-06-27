#!/bin/bash

echo "🔧 修复剩余的路径问题..."

# 修复 components/image-carousel.tsx 中的相对路径问题
if [ -f "components/image-carousel.tsx" ]; then
    echo "修复: components/image-carousel.tsx"
    sed -i '' 's|ui/button|./ui/button|g' components/image-carousel.tsx
    sed -i '' 's|ui/card|./ui/card|g' components/image-carousel.tsx
fi

# 修复 components/learning-plan/steps/ 目录下的所有文件
for file in components/learning-plan/steps/*.tsx components/learning-plan/steps/*.ts; do
    if [ -f "$file" ] && grep -q "@/" "$file" 2>/dev/null; then
        echo "修复: $file"
        sed -i '' 's|@/components/ui/|../../ui/|g' "$file"
        sed -i '' 's|@/components/|../../|g' "$file"
        sed -i '' 's|@/hooks/|../../../hooks/|g' "$file"
        sed -i '' 's|@/lib/|../../../lib/|g' "$file"
        sed -i '' 's|@/stores/|../../../stores/|g' "$file"
        sed -i '' 's|@/utils/|../../../utils/|g' "$file"
    fi
done

# 修复 components/learning-plan/displays/ 目录下的所有文件
for file in components/learning-plan/displays/*.tsx components/learning-plan/displays/*.ts; do
    if [ -f "$file" ] && grep -q "@/" "$file" 2>/dev/null; then
        echo "修复: $file"
        sed -i '' 's|@/components/ui/|../../ui/|g' "$file"
        sed -i '' 's|@/components/|../../|g' "$file"
        sed -i '' 's|@/hooks/|../../../hooks/|g' "$file"
        sed -i '' 's|@/lib/|../../../lib/|g' "$file"
        sed -i '' 's|@/stores/|../../../stores/|g' "$file"
        sed -i '' 's|@/utils/|../../../utils/|g' "$file"
    fi
done

# 检查所有components目录下是否还有遗漏的@/路径
echo "🔍 检查剩余的@/路径..."
find components/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/" 2>/dev/null || echo "✅ 没有发现剩余的@/路径"

echo "✅ 剩余路径修复完成！"
