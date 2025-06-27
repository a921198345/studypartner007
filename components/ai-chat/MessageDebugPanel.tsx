"use client"

import { useChatStore } from '../../hooks/useChatStore'
import { useEffect, useState } from 'react'

export function MessageDebugPanel({ 
  isStreaming, 
  currentStreamingMessageId 
}: { 
  isStreaming: boolean
  currentStreamingMessageId: string | null 
}) {
  const { messages, currentConversationId, conversations } = useChatStore()
  const [renderCount, setRenderCount] = useState(0)
  
  useEffect(() => {
    setRenderCount(prev => prev + 1)
  }, [messages, isStreaming])
  
  // 获取当前对话
  const currentConv = conversations.find(c => c.id === currentConversationId)
  const convMessages = currentConv?.messages || []
  
  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-white p-4 rounded shadow-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">🔍 调试面板</h3>
      <div className="space-y-1">
        <div>渲染次数: {renderCount}</div>
        <div>组件消息数: {messages.length}</div>
        <div>对话消息数: {convMessages.length}</div>
        <div>当前对话: {currentConversationId?.substring(0, 15) || '无'}</div>
        <div>流式状态: {isStreaming ? '是' : '否'}</div>
        <div>流式ID: {currentStreamingMessageId?.substring(0, 15) || '无'}</div>
        <div className="pt-2 border-t border-white/20">
          {messages.slice(-2).map((msg, idx) => (
            <div key={msg.id} className="mb-1">
              <div>消息{idx === 0 ? '(倒数第二)' : '(最后)'}: {msg.role}</div>
              <div className="text-gray-300">内容: {msg.content?.substring(0, 20)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}