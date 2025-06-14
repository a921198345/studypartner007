// 修复暂停按钮的关键代码更改

// 1. 在 page.tsx 中添加 useRef 来保存取消函数
// 在 import 部分添加 useRef
// import React, { useState, useRef, useEffect, useCallback } from "react"

// 2. 在组件内部添加 ref
// const cancelStreamRef = useRef<(() => void) | null>(null);

// 3. 修改 handleStopGeneration 函数
const handleStopGeneration = useCallback(() => {
  console.log('点击了暂停按钮');
  console.log('cancelStreamRef.current 存在:', !!cancelStreamRef.current);
  console.log('isStreaming:', isStreaming);
  
  // 使用 ref 中的取消函数
  const cancelFn = cancelStreamRef.current;
  
  if (cancelFn && typeof cancelFn === 'function') {
    console.log('执行暂停操作');
    try {
      // 立即设置流式状态为 false，防止继续更新
      setIsStreaming(false);
      
      // 调用取消函数
      cancelFn();
      console.log('取消函数已调用');
      
      // 保存当前的流式文本到最后一条AI消息
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const currentContent = streamingText || lastMessage.content || '';
        if (currentContent) {
          updateMessage(lastMessage.id, { 
            content: currentContent + '\n\n[已暂停]'
          });
        }
      }
      
      // 清理状态
      setStreamingText('');
      setCancelStream(null);
      cancelStreamRef.current = null;
      setAutoScroll(false);
    } catch (error) {
      console.error('暂停出错:', error);
    }
  } else {
    console.warn('暂停按钮点击但没有取消函数');
  }
}, [isStreaming, streamingText, messages, updateMessage]);

// 4. 修改保存取消函数的部分
// 在 askAIStream 调用后保存取消函数
cancel = await askAIStream(
  { 
    question: text || (imageBase64 ? '我上传了一张法考题目的图片，请帮我解答' : ''),
    imageBase64: imageBase64 
  },
  {
    onStart: () => {
      console.log("AI开始回复");
      setStreamingText('');
    },
    onToken: (token) => {
      // 检查是否已经被取消
      if (!cancelStreamRef.current) {
        console.log('流式已被取消，忽略新的 token');
        return;
      }
      console.log('📝 收到token:', token.length, '字符');
      setStreamingText(prev => prev + token);
    },
    onComplete: (fullResponse) => {
      console.log("🏁 AI回复完成，总长度:", fullResponse.length);
      updateMessage(aiMessageId, { content: fullResponse });
      setIsStreaming(false);
      setStreamingText('');
      setCancelStream(null);
      cancelStreamRef.current = null;
    },
    onError: (error) => {
      console.error("流式响应错误:", error);
      setIsStreaming(false);
      setStreamingText('');
      setCancelStream(null);
      cancelStreamRef.current = null;
      updateMessage(aiMessageId, { 
        content: "抱歉，回答生成过程中出现了错误。请稍后再试。" 
      });
    }
  }
);

// 保存取消函数到 ref（立即保存，不通过 setState）
if (cancel && typeof cancel === 'function') {
  console.log('保存取消函数到 ref');
  cancelStreamRef.current = cancel;
  setCancelStream(() => cancel);
} else {
  console.warn('取消函数无效:', cancel);
}