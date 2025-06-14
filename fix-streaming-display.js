// 修复流式显示的关键代码

// 问题诊断：
// 1. 后端正确发送了流式数据
// 2. 前端 onToken 回调被调用
// 3. 但 React 状态更新可能被批量处理，导致界面不更新

// 解决方案：
// 1. 使用 flushSync 强制同步更新（但之前移除了）
// 2. 使用 unstable_batchedUpdates 
// 3. 或者使用 requestAnimationFrame

// 修改 page.tsx 中的 onToken 处理：
onToken: (token) => {
  // 检查是否已经被取消
  if (!cancelStreamRef.current) {
    console.log('流式已被取消，忽略新的 token');
    return;
  }
  
  console.log('📝 收到token:', token.length, '字符');
  
  // 方案1：使用 requestAnimationFrame 确保更新
  requestAnimationFrame(() => {
    setStreamingText(prev => {
      const newText = prev + token;
      console.log('📝 流式文本长度:', newText.length);
      return newText;
    });
  });
  
  // 方案2：使用 setTimeout 0 触发微任务
  // setTimeout(() => {
  //   setStreamingText(prev => prev + token);
  // }, 0);
  
  // 方案3：使用 ReactDOM.unstable_batchedUpdates (需要导入)
  // import { unstable_batchedUpdates } from 'react-dom';
  // unstable_batchedUpdates(() => {
  //   setStreamingText(prev => prev + token);
  // });
}

// 另一个可能的问题：SimpleStreamingMessage 组件
// 确保组件正确显示 combinedText
const SimpleStreamingMessage = ({
  initialText = '',
  streamText = '',
  // ...
}) => {
  // 确保正确组合文本
  const combinedText = (initialText + streamText).trim();
  
  // 添加调试日志
  console.log('SimpleStreamingMessage 渲染:', {
    initialText: initialText?.length || 0,
    streamText: streamText?.length || 0,
    combinedText: combinedText?.length || 0
  });
  
  // ... 组件其余部分
}