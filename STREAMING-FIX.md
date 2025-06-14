# 流式显示修复方案

## 问题描述
1. 后端正确发送了流式数据（从日志可以看到）
2. 前端 `onToken` 回调被调用（从日志可以看到）
3. 但内容没有实时显示在界面上，而是等到完全生成后才显示

## 问题原因
React 的批量更新机制导致状态更新没有立即反映到 UI 上。

## 修复方案

### 1. 强制同步更新（推荐）
使用 `requestAnimationFrame` 确保每次 token 更新都会触发 UI 重新渲染：

```typescript
onToken: (token) => {
  if (!cancelStreamRef.current) {
    console.log('流式已被取消，忽略新的 token');
    return;
  }
  
  // 使用 requestAnimationFrame 确保 UI 更新
  requestAnimationFrame(() => {
    setStreamingText(prev => {
      const newText = prev + token;
      console.log('📝 流式文本长度:', newText.length);
      return newText;
    });
  });
}
```

### 2. 调试组件渲染
在 `SimpleStreamingMessage` 组件中添加调试日志：

```typescript
const SimpleStreamingMessage = ({ ... }) => {
  const combinedText = (initialText + streamText).trim();
  
  // 调试日志
  if (sender === 'ai' && isStreaming) {
    console.log('🎨 SimpleStreamingMessage 渲染:', {
      initialText: initialText?.length || 0,
      streamText: streamText?.length || 0,
      combinedText: combinedText?.length || 0,
      isStreaming
    });
  }
  
  // ... 组件其余部分
}
```

### 3. 确保消息正确创建
AI 消息创建时 content 为空是正确的：

```typescript
// 添加空的AI消息，准备流式填充
addMessage({
  id: aiMessageId,
  role: 'assistant',
  content: '',  // 空内容，将通过 streamText 填充
  timestamp: new Date().toISOString()
});
```

### 4. 验证流式文本传递
确保流式文本正确传递给组件：

```typescript
<SimpleStreamingMessage
  initialText={message.content}  // 初始为空
  streamText={isLatestAIMessage && isStreaming ? streamingText : ''}  // 流式文本
  sender={message.role === 'assistant' ? 'ai' : message.role}
  timestamp={message.timestamp}
  isStreaming={isLatestAIMessage && isStreaming}
  imageBase64={message.imageBase64}
/>
```

## 其他可能的解决方案

### 方案 B：使用 setTimeout(0)
```typescript
onToken: (token) => {
  setTimeout(() => {
    setStreamingText(prev => prev + token);
  }, 0);
}
```

### 方案 C：使用 React 18 的 flushSync（但可能影响性能）
```typescript
import { flushSync } from 'react-dom';

onToken: (token) => {
  flushSync(() => {
    setStreamingText(prev => prev + token);
  });
}
```

## 测试步骤
1. 发送一个会产生长回答的问题
2. 观察控制台日志：
   - 应该看到 "📝 收到token" 日志
   - 应该看到 "🎨 SimpleStreamingMessage 渲染" 日志
   - streamText 长度应该逐渐增加
3. 界面应该实时显示流式文本，而不是等到最后才显示

## 预期结果
- ✅ AI 回答逐字显示
- ✅ 暂停按钮可以立即停止生成
- ✅ 暂停后显示 "[已暂停]" 标记
- ✅ 用户可以看到实时的打字效果