# 极简流式传输解决方案

## 核心思路
抛弃所有复杂的状态管理和优化，回归最基本的实现：
1. 直接调用 fetch API
2. 使用 AbortController 处理暂停
3. 直接更新消息内容，不使用中间状态

## 主要改动

### 1. 简化状态管理
```javascript
// 之前：复杂的状态
const [streamingText, setStreamingText] = useState('');
const streamingTextRef = useRef('');
const [, forceUpdate] = useReducer(x => x + 1, 0);

// 现在：只需要两个状态
const [isStreaming, setIsStreaming] = useState(false);
const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
const abortControllerRef = useRef<AbortController | null>(null);
```

### 2. 简化暂停功能
```javascript
const handleStopGeneration = useCallback(() => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setCurrentStreamingMessageId(null);
  }
}, []);
```

### 3. 简化流式调用
```javascript
// 直接使用 fetch
const response = await fetch('/api/ai/ask/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, imageBase64 }),
  signal: abortController.signal
});

// 直接更新消息，不使用中间状态
if (json.content) {
  fullText += json.content;
  updateMessage(aiMessageId, { content: fullText });
}
```

### 4. 简化组件渲染
```javascript
<SimpleStreamingMessage
  initialText={message.content}
  streamText=""  // 不再需要流式文本
  sender={message.role === 'assistant' ? 'ai' : message.role}
  timestamp={message.timestamp}
  isStreaming={isCurrentStreaming}
  imageBase64={message.imageBase64}
/>
```

## 优点
1. **代码简单直接** - 容易理解和维护
2. **没有状态同步问题** - 直接更新消息内容
3. **暂停功能可靠** - 使用标准的 AbortController
4. **性能更好** - 减少了不必要的状态更新

## 测试方法
1. 打开 `test-simple-streaming.html` 测试基础功能
2. 在聊天页面测试完整功能
3. 验证暂停按钮是否正常工作

## 总结
有时候，最简单的解决方案就是最好的解决方案。通过去除所有不必要的复杂性，我们得到了一个更可靠、更易维护的实现。