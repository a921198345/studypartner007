#!/bin/bash

echo "=== 开始修复答题历史问题 ==="
echo ""

# 1. 修复 user_answers 表结构
echo "步骤1：修复数据库表结构..."
node fix-user-answers-table.js
if [ $? -ne 0 ]; then
    echo "❌ 修复 user_answers 表失败"
    exit 1
fi
echo "✅ 数据库表结构修复完成"
echo ""

# 2. 修复现有数据
echo "步骤2：修复现有会话数据..."
node fix-answer-history-complete.js
if [ $? -ne 0 ]; then
    echo "❌ 修复会话数据失败"
    exit 1
fi
echo "✅ 会话数据修复完成"
echo ""

# 3. 重启开发服务器提示
echo "步骤3：请重启开发服务器"
echo "请按 Ctrl+C 停止当前的 npm run dev，然后重新运行 npm run dev"
echo ""

echo "=== 修复完成 ==="
echo ""
echo "测试步骤："
echo "1. 重启开发服务器：npm run dev"
echo "2. 在浏览器中打开：http://localhost:3000/test-answer-flow.html"
echo "3. 点击'运行快速测试'按钮"
echo "4. 检查是否能看到答题历史"
echo ""
echo "如果仍有问题，请运行："
echo "node check-session-data.js"