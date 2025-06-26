"use client"

import { useEffect, useState } from "react"
import { SaveNoteButton } from "./SaveNoteButton"
import { MindMapButton } from "./MindMapButton"
import { RelatedQuestionsButton } from "./RelatedQuestionsButton"

interface MessageActionsProps {
  messageId: string
  messageRole: 'user' | 'assistant'
  messageContent: string
  userQuestion: string
  messageIndex: number
  totalMessages: number
  isStreaming: boolean
  streamingMessageId: string | null
}

export function MessageActions({
  messageId,
  messageRole,
  messageContent,
  userQuestion,
  messageIndex,
  totalMessages,
  isStreaming,
  streamingMessageId
}: MessageActionsProps) {
  const [shouldShow, setShouldShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // 计算是否应该显示按钮
    const isAssistant = messageRole === 'assistant'
    const hasContent = messageContent && messageContent.trim().length > 0
    const isNotStreaming = streamingMessageId !== messageId
    const hasUserQuestion = userQuestion && userQuestion.trim().length > 0
    const isNotWelcomeMessage = messageIndex > 0 && hasUserQuestion
    
    const show = isAssistant && hasContent && isNotStreaming && isNotWelcomeMessage
    
    // 调试日志
    if (isAssistant && mounted) {
      console.log(`[MessageActions] 按钮显示判断 - 消息${messageId}:`, {
        isAssistant,
        hasContent,
        contentLength: messageContent?.length || 0,
        isNotStreaming,
        streamingMessageId,
        hasUserQuestion,
        userQuestion: userQuestion?.substring(0, 20),
        isNotWelcomeMessage,
        messageIndex,
        结果: show
      })
    }
    
    setShouldShow(show)
  }, [messageId, messageRole, messageContent, userQuestion, messageIndex, isStreaming, streamingMessageId, mounted])

  // 组件未挂载时不渲染
  if (!mounted) return null
  
  // 不满足显示条件时不渲染
  if (!shouldShow) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-2">
      <div className="flex items-center gap-2 ml-14">
        <SaveNoteButton
          question={userQuestion}
          answer={messageContent}
          chatId={messageId}
        />
        <MindMapButton
          message={userQuestion}
          answer={messageContent}
        />
        <RelatedQuestionsButton
          message={userQuestion}
          answer={messageContent}
        />
      </div>
    </div>
  )
}