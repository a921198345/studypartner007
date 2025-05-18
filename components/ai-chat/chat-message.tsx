"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Message } from "./chat-interface"
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { useState } from "react"

interface ChatMessageProps {
  message: Message
  aiAvatar?: string
  aiName?: string
}

export function ChatMessage({
  message,
  aiAvatar = "/placeholder.svg?height=24&width=24",
  aiName = "小雨",
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<"none" | "helpful" | "unhelpful">("none")
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")

  const handleFeedback = (type: "helpful" | "unhelpful") => {
    setFeedback(type)

    // 如果是不满意，显示详细反馈表单
    if (type === "unhelpful") {
      setShowFeedbackForm(true)
    } else {
      // 这里可以发送反馈到服务器
      console.log("Positive feedback submitted")
    }
  }

  const submitDetailedFeedback = () => {
    // 这里可以发送详细反馈到服务器
    console.log("Detailed feedback submitted:", feedbackText)
    setShowFeedbackForm(false)
  }

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg p-4 max-w-[80%] ${
          message.role === "user" ? "chat-message-user rounded-tr-none" : "chat-message-ai rounded-tl-none"
        }`}
      >
        {message.role === "assistant" && (
          <div className="flex items-center mb-2">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={aiAvatar || "/placeholder.svg"} alt={aiName} />
              <AvatarFallback>{aiName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{aiName}</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</div>

          {message.role === "assistant" && feedback === "none" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback("helpful")}
                className="text-gray-500 hover:text-green-500 text-xs flex items-center"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                有帮助
              </button>
              <button
                onClick={() => handleFeedback("unhelpful")}
                className="text-gray-500 hover:text-red-500 text-xs flex items-center"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                不满意
              </button>
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="text-gray-500 hover:text-blue-500 text-xs flex items-center"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                反馈
              </button>
            </div>
          )}

          {message.role === "assistant" && feedback !== "none" && !showFeedbackForm && (
            <div className="text-xs text-green-500">感谢您的反馈！</div>
          )}
        </div>

        {showFeedbackForm && (
          <div className="mt-2 border-t pt-2">
            <textarea
              className="w-full text-sm p-2 border rounded"
              rows={2}
              placeholder="请告诉我们您的具体反馈..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setShowFeedbackForm(false)} className="text-xs text-gray-500 hover:text-gray-700">
                取消
              </button>
              <button onClick={submitDetailedFeedback} className="text-xs text-primary hover:text-primary/80">
                提交
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
