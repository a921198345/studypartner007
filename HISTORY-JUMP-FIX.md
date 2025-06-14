# 修复发送消息后跳转到历史问答的问题

## 问题分析

用户报告：发送新消息后会跳转到历史问答中生成回复。这个问题的根本原因是：

1. **对话ID不同步**：当没有当前对话时，创建新对话的操作是异步的，但代码没有等待对话创建完成就继续执行
2. **状态更新延迟**：Zustand store的状态更新可能有延迟，导致消息被添加到错误的对话中

## 解决方案

### 1. 修复对话创建逻辑
```typescript
// 原来的代码
if (!currentConversationId) {
  createNewConversation();  // 没有使用返回的ID
}

// 修复后的代码
let conversationId = currentConversationId;
if (!conversationId) {
  conversationId = createNewConversation();  // 使用返回的ID
  await new Promise(resolve => setTimeout(resolve, 100));  // 等待状态更新
}
```

### 2. 使用正确的对话ID
```typescript
// 确保使用正确的对话ID更新标题
if (messages.length <= 1 && conversationId) {
  const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
  updateConversationTitle(conversationId, title);
}
```

## 其他优化

### 已完成的优化：
1. ✅ 移除了临时测试按钮
2. ✅ 禁用了调试日志
3. ✅ 保持了按钮正常显示功能

### 按钮显示条件（最终版）：
- 必须是AI消息
- 内容长度大于10个字符
- 不在流式传输中
- 有对应的用户问题

## 测试建议

1. **测试新对话创建**：
   - 刷新页面
   - 直接发送消息
   - 检查是否正常创建新对话

2. **测试连续发送**：
   - 快速连续发送多条消息
   - 检查是否都在同一个对话中

3. **测试对话切换**：
   - 在多个对话间切换
   - 确保消息发送到正确的对话

## 总结

通过确保对话ID的正确使用和等待状态更新，解决了消息被发送到错误对话的问题。同时保持了按钮显示功能的正常工作。