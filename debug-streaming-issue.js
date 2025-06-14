// 调试流式传输问题的脚本

// 1. 检查 React 批处理问题
// 在 app/ai-chat/page.tsx 的 onToken 回调中添加：
/*
import { flushSync } from 'react-dom';

onToken: (token) => {
  if (!cancelStreamRef.current) {
    console.log('流式已被取消，忽略新的 token');
    return;
  }
  console.log('📝 收到token:', token.length, '字符');
  
  // 使用 flushSync 强制同步更新
  flushSync(() => {
    setStreamingText(prev => prev + token);
  });
},
*/

// 2. 检查组件渲染
// 在 SimpleStreamingMessage 组件中添加调试日志：
/*
useEffect(() => {
  console.log('🔄 SimpleStreamingMessage 更新:', {
    streamText长度: streamText?.length || 0,
    isStreaming,
    combinedText长度: (initialText + streamText).length
  });
}, [streamText, isStreaming]);
*/

// 3. 创建最简单的测试组件
const testComponent = `
import React from 'react';

export const MinimalStreamTest = ({ text }) => {
  // 添加渲染计数
  const renderCount = React.useRef(0);
  renderCount.current++;
  
  console.log(\`🎨 MinimalStreamTest 渲染 #\${renderCount.current}, 文本长度: \${text.length}\`);
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <div>渲染次数: {renderCount.current}</div>
      <div style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  );
};
`;

// 4. 测试不同的状态更新方式
const stateUpdateTests = `
// 方式1: 直接设置状态（不使用函数式更新）
onToken: (token) => {
  const newText = streamingTextRef.current + token;
  streamingTextRef.current = newText;
  setStreamingText(newText);
}

// 方式2: 使用 useReducer 替代 useState
const [state, dispatch] = useReducer((state, action) => {
  switch (action.type) {
    case 'ADD_TOKEN':
      return { ...state, streamingText: state.streamingText + action.token };
    default:
      return state;
  }
}, { streamingText: '' });

// 方式3: 使用 forceUpdate
const [, forceUpdate] = useReducer(x => x + 1, 0);
onToken: (token) => {
  streamingTextRef.current += token;
  forceUpdate();
}
`;

// 5. 检查 CSS 和样式问题
const cssDebug = `
/* 确保文字可见 */
.streaming-text {
  color: #000 !important;
  background: transparent !important;
  opacity: 1 !important;
  visibility: visible !important;
  z-index: 9999 !important;
}

/* 调试边框 */
.streaming-container {
  border: 2px solid red !important;
}
`;

// 6. 浏览器性能分析
const performanceCheck = `
// 在控制台运行
performance.mark('stream-start');
// ... 流式传输过程 ...
performance.mark('stream-end');
performance.measure('streaming', 'stream-start', 'stream-end');
console.log(performance.getEntriesByType('measure'));
`;

console.log('调试建议已生成');
console.log('\n请按以下步骤调试：');
console.log('1. 检查 React DevTools 中 streamingText 的值是否实时变化');
console.log('2. 在 SimpleStreamingMessage 中添加 useEffect 监听 streamText 变化');
console.log('3. 尝试使用 flushSync 强制同步更新');
console.log('4. 检查浏览器控制台是否有错误或警告');
console.log('5. 使用 Chrome Performance 工具录制渲染过程');