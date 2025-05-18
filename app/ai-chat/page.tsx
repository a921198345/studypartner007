"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { ChatInterface } from "@/components/ai-chat/chat-interface"
import { SidebarLearningPlan } from "@/components/ai-chat/sidebar-learning-plan"
import { RelatedResources } from "@/components/ai-chat/related-resources"

export default function AiChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "你好！我是你的法考学习助手小雨。有什么法考问题需要我帮忙解答吗？",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("plan")

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!input.trim()) return

    // 添加用户消息
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      },
    ])
    setInput("")

    // 模拟AI思考
    setIsTyping(true)

    // 模拟AI回复
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "根据《民法典》第一百四十三条，具备以下条件的民事法律行为有效：一是行为人具有相应的民事行为能力；二是意思表示真实；三是不违反法律、行政法规的强制性规定，不违背公序良俗。\n\n您的问题涉及到民事法律行为的有效要件，这是民法总则中的重要知识点。",
          timestamp: new Date().toISOString(),
        },
      ])
    }, 2000)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ChatInterface />
            </div>
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="plan" className="flex-1">
                    学习计划
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">
                    学习笔记
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="plan">
                  <SidebarLearningPlan />
                </TabsContent>
                <TabsContent value="notes">
                  <RelatedResources />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
