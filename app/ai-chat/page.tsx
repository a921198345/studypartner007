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
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { v4 as uuidv4 } from 'uuid'
import { askAIStream, AskAIParams } from "@/lib/api/aiService"
import { useToast } from "@/components/ui/use-toast"
import { useChatStore } from '@/hooks/useChatStore'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

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
  const { messages, addMessage, updateMessage } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 确保客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 初始化欢迎消息
  useEffect(() => {
    if (mounted && !isInitialized && messages.length === 0) {
      addMessage({
        id: 'welcome',
        role: 'assistant',
        content: '欢迎使用法考助手AI，请输入您的法考问题，我会尽力帮您解答。',
        timestamp: new Date().toISOString()
      });
      setIsInitialized(true);
    }
  }, [mounted, messages.length, isInitialized, addMessage]);
  
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
  
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

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
            <h1 className="text-xl font-semibold">法考问答</h1>
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
          <Link href="/" className="p-2 mr-2 rounded-md hover:bg-gray-100">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold">法考问答</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="grid grid-cols-1">
            {/* 聊天区域 */}
            <Card className="h-[calc(100vh-180px)] flex flex-col shadow-lg border-0 bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/30">
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
    </div>
  )
}
