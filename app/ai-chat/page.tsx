"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { ChatInterface } from "@/components/ai-chat/chat-interface"
import { SidebarLearningPlan } from "@/components/ai-chat/sidebar-learning-plan"
import { RelatedResources } from "@/components/ai-chat/related-resources"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SendIcon, SettingsIcon, MoveVerticalIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2 } from "lucide-react"

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
      <main className="flex-1 flex">
        <div className="container mx-auto pt-6 flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
            <div className="md:col-span-2 flex flex-col md:pt-8">
              <Card className="flex-1 flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>FP</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">法考教授</p>
                      <p className="text-xs text-muted-foreground">AI 智能助手</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon">
                      <SettingsIcon className="h-4 w-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoveVerticalIcon className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>清除对话</DropdownMenuItem>
                        <DropdownMenuItem>导出对话</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>帮助与反馈</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                            message.role === "user"
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          {message.content}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>思考中...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex w-full items-center space-x-2"
                  >
                    <Input
                      id="message"
                      placeholder="输入你的问题..."
                      className="flex-1"
                      autoComplete="off"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <Button type="submit" size="icon" disabled={isTyping}>
                      <SendIcon className="h-4 w-4" />
                      <span className="sr-only">发送</span>
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </div>
            <div className="md:col-span-1 space-y-6 md:pt-8">
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
