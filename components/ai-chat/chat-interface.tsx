"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, ImageIcon, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ChatMessage } from "./chat-message"
import { RelatedResources } from "./related-resources"

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface ChatInterfaceProps {
  initialMessages?: Message[]
  aiCharacter?: {
    name: string
    avatar: string
    type: string
  }
  dailyUsageInfo?: {
    used: number
    limit: number
  }
}

export function ChatInterface({
  initialMessages = [],
  aiCharacter = { name: "法考教授", avatar: "/placeholder.svg?height=40&width=40", type: "法律专家" },
  dailyUsageInfo = { used: 1, limit: 2 },
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            role: "assistant",
            content: `你好！我是你的法考学习助手${aiCharacter.name}。有什么法考问题需要我帮忙解答吗？`,
            timestamp: new Date().toISOString(),
          },
        ],
  )
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("民法")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showRelatedResources, setShowRelatedResources] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if ((!input.trim() && !uploadedImage) || isTyping) return

    // 添加用户消息
    const userMessage = {
      role: "user" as const,
      content: input + (uploadedImage ? " [图片]" : ""),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setUploadedImage(null)

    // 模拟AI思考
    setIsTyping(true)

    // 模拟AI回复（实际项目中应该调用后端API）
    setTimeout(() => {
      setIsTyping(false)

      const aiResponse = {
        role: "assistant" as const,
        content: `根据《民法典》第一百四十三条，具备以下条件的民事法律行为有效：一是行为人具有相应的民事行为能力；二是意思表示真实；三是不违反法律、行政法规的强制性规定，不违背公序良俗。\n\n您的问题涉及到民事法律行为的有效要件，这是民法总则中的重要知识点。`,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiResponse])

      // 显示相关资源
      setTimeout(() => {
        setShowRelatedResources(true)
      }, 500)
    }, 2000)
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型和大小
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过5MB")
      return
    }

    setIsUploading(true)

    // 读取文件并转换为base64
    const reader = new FileReader()
    reader.onload = () => {
      setUploadedImage(reader.result as string)
      setIsUploading(false)
    }
    reader.onerror = () => {
      alert("图片上传失败，请重试")
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-2">
            <AvatarImage src={aiCharacter.avatar || "/placeholder.svg"} alt={aiCharacter.name} />
            <AvatarFallback>{aiCharacter.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{aiCharacter.name}</h2>
            <p className="text-xs text-muted-foreground">{aiCharacter.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="badge-outline">今日剩余：{dailyUsageInfo.limit - dailyUsageInfo.used}次</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="chat-message-ai rounded-tl-none p-4">
              <div className="flex items-center mb-2">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={aiCharacter.avatar || "/placeholder.svg"} alt={aiCharacter.name} />
                  <AvatarFallback>{aiCharacter.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{aiCharacter.name}</span>
              </div>
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 rounded-full bg-[#E9B949] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-[#E9B949] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-[#E9B949] animate-bounce"
                  style={{ animationDelay: "600ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {showRelatedResources && messages.length > 1 && !isTyping && <RelatedResources subject={selectedSubject} />}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-white">
        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <img src={uploadedImage || "/placeholder.svg"} alt="Uploaded" className="h-20 rounded border" />
            <button
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              onClick={() => setUploadedImage(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleImageUpload}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的法考问题，或上传题目截图..."
            className="flex-1 min-h-[60px] max-h-[200px] custom-textarea"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="rounded-full primary-button"
            disabled={(!input.trim() && !uploadedImage) || isTyping}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <span>Shift + Enter 换行</span>
          <span className="mx-2">|</span>
          <span>Enter 发送</span>
        </div>
      </div>
    </div>
  )
}
