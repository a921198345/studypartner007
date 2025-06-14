"use client"

import { useEffect } from 'react'

interface DebugButtonsProps {
  message: any
  index: number
  messages: any[]
  isStreaming: boolean
  currentStreamingMessageId: string | null
}

export function DebugButtons({ 
  message, 
  index, 
  messages, 
  isStreaming, 
  currentStreamingMessageId 
}: DebugButtonsProps) {
  
  useEffect(() => {
    if (message.role === 'assistant') {
      // 计算所有条件
      const isThisMessageStreaming = currentStreamingMessageId === message.id && isStreaming;
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const hasUserQuestion = previousMessage && previousMessage.role === 'user';
      const userQuestion = hasUserQuestion ? previousMessage.content : "";
      const isWelcomeMessage = message.role === 'assistant' && (index === 0 || !hasUserQuestion);
      
      const shouldShowButtons = 
        message.role === 'assistant' && 
        message.content && 
        !isThisMessageStreaming && 
        !isWelcomeMessage;
      
      console.log(`[调试] 消息 ${message.id} 按钮显示条件:`, {
        索引: index,
        角色: message.role,
        内容长度: message.content?.length || 0,
        内容前20字符: message.content?.substring(0, 20) || '无',
        正在流式输出: isThisMessageStreaming,
        是欢迎消息: isWelcomeMessage,
        有用户问题: hasUserQuestion,
        用户问题: userQuestion?.substring(0, 30) || '无',
        应该显示按钮: shouldShowButtons,
        全局流式状态: isStreaming,
        当前流式ID: currentStreamingMessageId
      });
    }
  }, [message, index, messages, isStreaming, currentStreamingMessageId]);
  
  return null;
}