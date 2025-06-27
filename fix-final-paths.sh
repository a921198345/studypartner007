#!/bin/bash

echo "🔧 最终精确修复所有路径问题..."

# 修复 components/ 根目录文件
echo "修复根目录文件..."
sed -i '' 's|.././ui/|./ui/|g' components/image-carousel.tsx 2>/dev/null || true

# 修复 components/knowledge-map/ 目录
echo "修复knowledge-map目录..."
for file in components/knowledge-map/*.tsx; do
    if [ -f "$file" ]; then
        sed -i '' 's|../../ui/|../ui/|g' "$file"
    fi
done

# 修复 components/learning-plan/ 目录
echo "修复learning-plan目录..."
for file in components/learning-plan/*.tsx; do
    if [ -f "$file" ]; then
        sed -i '' 's|../../ui/|../ui/|g' "$file"
    fi
done

# 修复 components/learning-plan/displays/ 目录
echo "修复learning-plan/displays目录..."
for file in components/learning-plan/displays/*.tsx; do
    if [ -f "$file" ]; then
        sed -i '' 's|../../ui/|../../ui/|g' "$file"  # 这个需要两级目录
    fi
done

# 修复 components/learning-plan/steps/ 目录
echo "修复learning-plan/steps目录..."
for file in components/learning-plan/steps/*.tsx; do
    if [ -f "$file" ]; then
        sed -i '' 's|../ui/|../../ui/|g' "$file"  # 这个需要两级目录
    fi
done

# 修复其他所有二级目录
echo "修复其他二级目录..."
for dir in components/*/; do
    if [ "$dir" != "components/ui/" ] && [ "$dir" != "components/learning-plan/" ] && [ "$dir" != "components/knowledge-map/" ] && [ "$dir" != "components/auth/" ] && [ "$dir" != "components/ai-chat/" ]; then
        for file in "$dir"*.tsx; do
            if [ -f "$file" ]; then
                sed -i '' 's|../../ui/|../ui/|g' "$file"
            fi
        done
    fi
done

echo "✅ 最终路径修复完成！"

# 检查还有哪些文件有问题
echo "🔍 检查剩余问题..."
problematic_files=$(find components/ -name "*.tsx" | xargs grep -l '\.\.\./.*ui/' 2>/dev/null || true)
if [ -n "$problematic_files" ]; then
    echo "⚠️ 以下文件可能还有路径问题："
    echo "$problematic_files"
else
    echo "✅ 没有发现路径问题！"
fi
