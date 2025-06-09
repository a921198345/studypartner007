"use client"

import React, { useState, useRef, useEffect } from "react"
import { flushSync } from 'react-dom'
import dynamic from 'next/dynamic'
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import ChatLayout from "@/components/ai-chat/ChatLayout"
import StreamingMessage from "@/components/ai-chat/StreamingMessage"
import { InputArea } from "@/components/ai-chat/InputArea"
import { SaveNoteButton } from "@/components/ai-chat/SaveNoteButton"
import { ConversationSidebar } from "@/components/ai-chat/conversation-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'
import { askAIStream, AskAIParams } from "@/lib/api/aiService"
import { useToast } from "@/components/ui/use-toast"
import { useChatStore } from '@/hooks/useChatStore'

// 扩展消息类型，添加流式相关属性
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  streamText?: string;
  imageBase64?: string;
  isError?: boolean;
}

export default function AIChat() {
  const { toast } = useToast();
  const { 
    messages, 
    addMessage, 
    updateMessage,
    currentConversationId,
    conversations,
    createNewConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle
  } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 确保客户端渲染
  useEffect(() => {
    setMounted(true);
    // 从 localStorage 读取侧边栏状态
    const saved = localStorage.getItem('ai-chat-sidebar-collapsed');
    if (saved !== null) {
      setDesktopSidebarCollapsed(JSON.parse(saved));
    }
  }, []);
  
  // 保存侧边栏状态到 localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('ai-chat-sidebar-collapsed', JSON.stringify(desktopSidebarCollapsed));
    }
  }, [desktopSidebarCollapsed, mounted]);
  
  // 初始化对话
  useEffect(() => {
    if (mounted && !currentConversationId && conversations.length === 0) {
      const newConvId = createNewConversation();
      // 添加欢迎消息
      setTimeout(() => {
        addMessage({
          id: 'welcome',
          role: 'assistant',
          content: '欢迎使用法考助手AI，请输入您的法考问题，我会尽力帮您解答。',
          timestamp: new Date().toISOString()
        });
      }, 100);
    }
  }, [mounted, currentConversationId, conversations.length, createNewConversation, addMessage]);
  
  // 自动滚动到底部 - 必须在所有条件之后
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingText]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // 页面加载时滚动到底部
  useEffect(() => {
    if (mounted && messages.length > 0) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [mounted]);
  
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // 如果没有当前对话，创建新对话
    if (!currentConversationId) {
      createNewConversation();
    }

    // 生成唯一ID
    const userMessageId = Date.now().toString();
    const aiMessageId = (Date.now() + 1).toString();
    
    // 添加用户消息
    addMessage({
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    });
    
    // 根据第一条用户消息自动更新对话标题
    if (messages.length <= 1 && currentConversationId) {
      const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
      updateConversationTitle(currentConversationId, title);
    }
    
    // 添加空的AI消息，准备流式填充
    addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    });

    // 重置流式文本和状态
    setStreamingText('');
    setIsStreaming(true);
    
    console.log("开始调用AI服务，参数:", { question: text });
    
    try {
      // 调用流式API服务
      console.log("开始接收流式响应");
      await askAIStream(
        { question: text },
        {
          onStart: () => {
            console.log("AI开始回复");
            setStreamingText(''); // 确保清空之前的流式文本
          },
          onToken: (token) => {
            console.log('📝 收到token:', token.length, '字符');
            // 强制同步更新UI
            flushSync(() => {
              setStreamingText(prev => {
                const newText = prev + token;
                console.log('📝 流式文本长度:', newText.length);
                return newText;
              });
            });
          },
          onComplete: (fullResponse) => {
            // 完成后，更新AI消息的内容
            console.log("🏁 AI回复完成，总长度:", fullResponse.length);
            updateMessage(aiMessageId, { content: fullResponse });
            setIsStreaming(false);
            setStreamingText('');
          },
          onError: (error) => {
            console.error("流式响应错误:", error);
            setIsStreaming(false);
            setStreamingText('');
            // 添加错误提示到AI回复
            updateMessage(aiMessageId, { 
              content: "抱歉，回答生成过程中出现了错误。请稍后再试。" 
            });
          }
        }
      );
    } catch (error) {
      console.error("Fetch调用错误:", error);
      setIsStreaming(false);
      // 添加错误提示到AI回复
      updateMessage(aiMessageId, { 
        content: "抱歉，无法连接到AI服务。请检查网络连接后再试。" 
      });
    }
  };

  // 如果还未挂载，显示加载状态
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div>加载中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex gap-6">
            {/* 左侧边栏 - 对话历史 */}
            <div className={`hidden lg:block transition-all duration-300 ${
              desktopSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
            }`}>
              <ConversationSidebar
                currentConversationId={currentConversationId}
                conversations={conversations}
                onNewConversation={() => {
                  const newId = createNewConversation();
                  // 添加欢迎消息
                  setTimeout(() => {
                    addMessage({
                      id: `welcome-${Date.now()}`,
                      role: 'assistant',
                      content: '欢迎使用法考助手AI，请输入您的法考问题，我会尽力帮您解答。',
                      timestamp: new Date().toISOString()
                    });
                  }, 100);
                }}
                onSelectConversation={switchConversation}
                onDeleteConversation={deleteConversation}
              />
            </div>
            
            {/* 聊天区域 */}
            <Card className="flex-1 h-[calc(100vh-180px)] flex flex-col shadow-lg border-0 bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30">
              {/* 顶部工具栏 */}
              <div className="p-4 border-b flex items-center justify-between">
                {/* 移动端菜单按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                {/* 桌面端侧边栏切换按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex"
                  onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
                  title={desktopSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                  {desktopSidebarCollapsed ? (
                    <PanelLeft className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </Button>
                
                {/* 标题 */}
                <h2 className="text-lg font-semibold flex-1 text-center lg:text-left">
                  AI 法考助手
                </h2>
                
                {/* 占位符保持布局平衡 */}
                <div className="w-10 lg:hidden" />
              </div>
              
              <CardContent className="flex-1 p-6 overflow-hidden bg-gray-50/50">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                  <div className="space-y-6 py-6">
                    {messages.map((message, index) => {
                      const isLatestMessage = index === messages.length - 1;
                      const isLatestAIMessage = isLatestMessage && message.role === 'assistant';
                      
                      // 获取前一条用户消息作为问题
                      const previousUserMessage = index > 0 && message.role === 'assistant' 
                        ? messages[index - 1] 
                        : null;
                      const question = previousUserMessage?.role === 'user' 
                        ? previousUserMessage.content 
                        : '';
                      
                      return (
                        <div key={message.id}>
                          <StreamingMessage
                            initialText={message.content}
                            streamText={isLatestAIMessage && isStreaming ? streamingText : ''}
                            sender={message.role === 'assistant' ? 'ai' : message.role}
                            timestamp={message.timestamp}
                            isStreaming={isLatestAIMessage && isStreaming}
                            typingSpeed={5}
                          />
                          {/* 为AI回答添加保存为笔记按钮 - 只在回答完成后显示 */}
                          {message.role === 'assistant' && message.content && (!isLatestAIMessage || !isStreaming) && question && (
                            <div className="flex justify-start mt-2 ml-2">
                              <SaveNoteButton
                                question={question}
                                answer={message.content}
                                chatId={message.id}
                              />
                            </div>
                          )}
                          {/* 如果用户消息包含图片，显示图片 */}
                          {message.role === 'user' && message.imageBase64 && (
                            <div className="flex justify-end mt-2">
                              <div className="rounded-lg overflow-hidden max-w-[200px]">
                                <img 
                                  src={message.imageBase64} 
                                  alt="用户上传图片" 
                                  className="object-contain max-h-[150px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              
              {/* 输入区域 */}
              <div className="p-4 border-t">
                <InputArea
                  onSendMessage={handleSendMessage}
                  isAiThinking={isStreaming}
                  placeholder="输入您的法考问题或上传图片..."
                />
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* 移动端侧边栏 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          <ConversationSidebar
            currentConversationId={currentConversationId}
            conversations={conversations}
            onNewConversation={() => {
              const newId = createNewConversation();
              // 添加欢迎消息
              setTimeout(() => {
                addMessage({
                  id: `welcome-${Date.now()}`,
                  role: 'assistant',
                  content: '欢迎使用法考助手AI，请输入您的法考问题，我会尽力帮您解答。',
                  timestamp: new Date().toISOString()
                });
              }, 100);
              setSidebarOpen(false);
            }}
            onSelectConversation={(id) => {
              switchConversation(id);
              setSidebarOpen(false);
            }}
            onDeleteConversation={deleteConversation}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
