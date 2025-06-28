#!/bin/bash

echo "🔧 修复服务器上的路径问题..."

# 修复 image-carousel.tsx 路径
if [ -f "components/image-carousel.tsx" ]; then
    echo "修复: components/image-carousel.tsx"
    sed -i 's|ui/button|./ui/button|g' components/image-carousel.tsx
    sed -i 's|ui/card|./ui/card|g' components/image-carousel.tsx
fi

# 修复 main-nav.tsx 路径
if [ -f "components/main-nav.tsx" ]; then
    echo "修复: components/main-nav.tsx"
    sed -i 's|ui/button|./ui/button|g' components/main-nav.tsx
    sed -i 's|ui/navigation-menu|./ui/navigation-menu|g' components/main-nav.tsx
    sed -i 's|ui/sheet|./ui/sheet|g' components/main-nav.tsx
    sed -i 's|ui/button|./ui/button|g' components/main-nav.tsx
fi

# 检查其他可能的路径问题
echo "🔍 检查其他路径问题..."
find components/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "from 'ui/" 2>/dev/null | while read file; do
    echo "修复: $file"
    sed -i "s|from 'ui/|from './ui/|g" "$file"
done

find components/ -name "*.tsx" -o -name "*.ts" | xargs grep -l "from \"ui/" 2>/dev/null | while read file; do
    echo "修复: $file"
    sed -i 's|from "ui/|from "./ui/|g' "$file"
done

echo "✅ 路径修复完成！"
