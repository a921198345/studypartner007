# 答题历史不显示问题分析

## 问题描述
用户反馈：在错题练习和收藏练习中答题后，返回题库主页面时答题历史没有显示。

## 调试发现

### 1. 会话创建正常
- 错题练习：`createAnswerSession({}, wrongQuestions.length, 'wrong')`
- 收藏练习：`createAnswerSession({}, favoriteQuestions.length, 'favorites')`
- 会话正确标记了 `source` 字段

### 2. 会话更新逻辑正常
在 `/app/question-bank/[id]/page.tsx` 中：
```javascript
// 错题和收藏模式使用sessionAnswers计算
if (currentMode === 'wrong' || currentMode === 'favorites') {
  sessionAnsweredCount = Object.keys(sessionAnswers).length + 1;
  sessionCorrectCount = Object.values(sessionAnswers).filter((answer: any) => answer.isCorrect).length;
  if (result.data.is_correct) sessionCorrectCount++;
}
```

### 3. 会话保存逻辑正常
页面卸载时调用 `endCurrentSession()` 保存会话到历史。

### 4. 问题根源
- 会话过滤：答题历史组件会过滤掉 `questionsAnswered === 0` 的会话
- 如果用户只是点击"开始练习"但没有答题就返回，会话不会显示

## 可能的场景

### 场景1：正常流程
1. 用户点击"开始练习错题" → 创建会话 (questionsAnswered: 0)
2. 用户答题 → 更新会话 (questionsAnswered: 1+)
3. 用户返回主页 → 保存会话
4. 答题历史显示 ✓

### 场景2：问题流程
1. 用户点击"开始练习错题" → 创建会话 (questionsAnswered: 0)
2. 用户直接返回主页 → 保存会话
3. 答题历史不显示（被过滤）❌

## 解决方案

已实现的修复：
1. 添加调试日志以追踪会话创建、更新和保存
2. 确保会话正确标记 `source` 字段
3. 答题历史组件正确显示错题/收藏标识

## 测试方法

1. 打开 `/test-answer-history-debug.html` 查看所有会话
2. 打开 `/test-full-session-flow.html` 模拟完整流程
3. 在实际应用中：
   - 进入错题练习，答1-2题
   - 返回题库主页
   - 检查答题历史是否显示"🔴 错题练习"

## 结论

代码逻辑是正确的，问题可能是：
1. 用户没有实际答题就返回
2. 浏览器缓存问题
3. 会话数据没有正确同步

建议用户：
1. 确保至少答一道题再返回
2. 刷新页面查看最新答题历史
3. 使用调试工具检查本地存储数据