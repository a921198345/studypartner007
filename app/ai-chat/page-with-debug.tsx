"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import dynamic from 'next/dynamic'
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import ChatLayout from "@/components/ai-chat/ChatLayout"
import { MinimalMessage } from "@/components/ai-chat/MinimalMessage"
import { InputArea } from "@/components/ai-chat/InputArea"
import { SaveNoteButton } from "@/components/ai-chat/SaveNoteButton"
import { MindMapButton } from "@/components/ai-chat/MindMapButton"
import { MinimalSidebar } from "@/components/ai-chat/minimal-sidebar"
import { DebugButtons } from "@/components/ai-chat/DebugButtons"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Menu, ChevronDown, PanelLeft } from "lucide-react"
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
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 添加调试日志
  useEffect(() => {
    console.log('🔍 AIChat组件状态更新:', {
      messages: messages,
      messageCount: messages.length,
      currentConversationId: currentConversationId,
      conversationCount: conversations.length,
      messagesPreview: messages.map(m => ({
        id: m.id,
        role: m.role,
        contentLength: m.content?.length || 0
      }))
    });
  }, [messages, currentConversationId, conversations]);
  
  // 确保客户端渲染
  useEffect(() => {
    setMounted(true);
    // 从 localStorage 读取侧边栏状态
    const saved = localStorage.getItem('ai-chat-sidebar-collapsed');
    if (saved !== null) {
      setDesktopSidebarCollapsed(JSON.parse(saved));
    }
    
    // 检查store状态
    console.log('🚀 组件挂载时的store状态:', {
      messages,
      currentConversationId,
      conversations
    });
    
    // 检查并清理过大的 localStorage 数据
    try {
      const storageSize = new Blob([JSON.stringify(localStorage)]).size;
      if (storageSize > 4 * 1024 * 1024) { // 如果超过 4MB
        console.warn('localStorage 接近容量限制，清理旧数据...');
        // 清理旧的聊天数据
        localStorage.removeItem('law-chat-storage');
        window.location.reload(); // 重新加载页面
      }
    } catch (e) {
      console.error('检查 localStorage 大小失败:', e);
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
      console.log('📝 初始化新对话');
      const newConvId = createNewConversation();
      // 添加欢迎消息
      setTimeout(() => {
        console.log('📝 添加欢迎消息');
        addMessage({
          id: 'welcome',
          role: 'assistant',
          content: '欢迎使用法考助手AI，请输入您的法考问题，我会尽力帮您解答。',
          timestamp: new Date().toISOString()
        });
      }, 100);
    }
  }, [mounted, currentConversationId, conversations.length, createNewConversation, addMessage]);
  
  // 监听用户滚动
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px 的容差
    
    // 如果用户手动滚动离开底部，关闭自动滚动
    if (!isAtBottom && !isStreaming) {
      setAutoScroll(false);
    } else if (isAtBottom) {
      setAutoScroll(true);
    }
  }, [isStreaming]);
  
  // 自动滚动到底部 - 只在正在流式输出时或发送新消息时
  useEffect(() => {
    // 只在正在流式输出且开启自动滚动时
    if (isStreaming && autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [isStreaming, autoScroll]);
  
  // 发送新消息时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // 只在新增用户消息时重置自动滚动并滚动到底部
      if (lastMessage && lastMessage.role === 'user') {
        setAutoScroll(true);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [messages.length]);

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
  
  // 添加滚动事件监听
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', handleScroll);
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, mounted]);
  
  // 处理暂停生成 - 极简版本
  const handleStopGeneration = useCallback(() => {
    console.log('点击暂停按钮');
    if (abortControllerRef.current) {
      console.log('中止请求');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setCurrentStreamingMessageId(null);
    }
  }, []);
  
  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() && !imageBase64) return;
    
    console.log('📤 发送消息:', { text: text?.substring(0, 30), hasImage: !!imageBase64 });
    
    // 如果没有当前对话，创建新对话
    if (!currentConversationId) {
      console.log('📝 创建新对话');
      createNewConversation();
    }

    // 生成唯一ID
    const userMessageId = Date.now().toString();
    const aiMessageId = (Date.now() + 1).toString();
    
    // 添加用户消息
    console.log('📝 添加用户消息:', userMessageId);
    addMessage({
      id: userMessageId,
      role: 'user',
      content: text || (imageBase64 ? '[图片]' : ''),
      timestamp: new Date().toISOString(),
      imageBase64: imageBase64
    });
    
    // 更新对话标题
    if (messages.length <= 1 && currentConversationId) {
      const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
      updateConversationTitle(currentConversationId, title);
    }
    
    // 添加空的AI消息
    console.log('📝 添加空AI消息:', aiMessageId);
    addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    });

    // 设置流式状态
    setIsStreaming(true);
    setCurrentStreamingMessageId(aiMessageId);
    
    // 创建 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      // 直接调用 API，不使用复杂的封装
      const response = await fetch('/api/ai/ask/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: text || '请帮我解答这个问题',
          imageBase64: imageBase64
        }),
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error('API 请求失败');
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      
      // 读取流
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('流读取完成');
            break;
          }
          
          // 解码数据
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // 按行处理
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6).trim();
              
              if (data === '[DONE]') {
                console.log('流式传输完成标记');
                break;
              }
              
              if (data) {
                try {
                  const json = JSON.parse(data);
                  if (json.content) {
                    fullText += json.content;
                    // 直接更新消息
                    console.log('📝 更新消息内容，当前长度:', fullText.length);
                    updateMessage(aiMessageId, { content: fullText });
                  }
                } catch (e) {
                  console.error('解析错误:', e, 'data:', data);
                }
              }
            }
          }
        }
        
        // 处理最后的缓冲区数据
        if (buffer.trim()) {
          console.log('处理剩余缓冲区:', buffer);
          if (buffer.startsWith('data: ')) {
            const data = buffer.substring(6).trim();
            if (data && data !== '[DONE]') {
              try {
                const json = JSON.parse(data);
                if (json.content) {
                  fullText += json.content;
                  updateMessage(aiMessageId, { content: fullText });
                }
              } catch (e) {
                console.error('解析最后缓冲区错误:', e);
              }
            }
          }
        }
      } catch (readError) {
        console.error('读取流错误:', readError);
        // 保留已接收的内容
        if (fullText) {
          updateMessage(aiMessageId, { content: fullText + '\n\n[传输中断]' });
        }
      } finally {
        // 确保reader被正确关闭
        try {
          reader.releaseLock();
        } catch (e) {
          // 忽略释放锁的错误
        }
      }
      
      // 完成 - 确保状态正确重置
      console.log('流式传输完成，重置状态');
      console.log('最终内容长度:', fullText.length);
      console.log('当前消息数量:', messages.length);
      
      // 确保消息有内容
      if (!fullText || fullText.trim().length === 0) {
        console.warn('警告：AI回复内容为空');
        fullText = '抱歉，生成回答时出现问题，请重试。';
      }
      
      // 先更新消息内容
      updateMessage(aiMessageId, { content: fullText });
      
      // 强制同步更新流式状态
      setIsStreaming(false);
      setCurrentStreamingMessageId(null);
      
      // 强制触发重新渲染
      setTimeout(() => {
        console.log('强制触发重新渲染，当前状态:', { 
          isStreaming: false, 
          currentStreamingMessageId: null,
          messageCount: messages.length 
        });
        // 触发一个无关紧要的状态更新来强制重新渲染
        setAutoScroll(prev => prev);
      }, 100);
      
    } catch (error) {
      console.error('流式请求错误:', error);
      
      if (error.name === 'AbortError') {
        // 用户取消 - 保留已有内容
        const currentMessage = messages.find(m => m.id === aiMessageId);
        if (currentMessage && currentMessage.content) {
          updateMessage(aiMessageId, { 
            content: currentMessage.content + '\n\n[已暂停]'
          });
        }
      } else {
        // 其他错误
        updateMessage(aiMessageId, { 
          content: '抱歉，生成回答时出现错误。' 
        });
      }
      
      console.log('错误处理：重置流式状态');
      setIsStreaming(false);
      setCurrentStreamingMessageId(null);
      
      // 强制触发重新渲染
      setTimeout(() => {
        console.log('错误处理后强制重新渲染');
        setAutoScroll(prev => prev);
      }, 100);
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
      <main className="flex-1 flex">
        {/* 调试信息面板 */}
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-lg text-xs max-w-xs z-50">
          <h3 className="font-bold mb-2">调试信息</h3>
          <div>消息数: {messages.length}</div>
          <div>当前对话: {currentConversationId || '无'}</div>
          <div>流式状态: {isStreaming ? '是' : '否'}</div>
          <div>流式消息ID: {currentStreamingMessageId || '无'}</div>
        </div>
        
        {/* 左侧边栏 - 对话历史 - 固定定位 */}
        <div className={`hidden lg:block fixed left-0 top-16 bottom-0 z-20 transition-all duration-300 ${
          desktopSidebarCollapsed ? 'w-16' : 'w-48'
        }`}>
          <MinimalSidebar
            currentConversationId={currentConversationId}
            conversations={conversations}
            collapsed={desktopSidebarCollapsed}
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
            onCollapse={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
          />
        </div>
        
        <div className={`flex-1 flex flex-col relative transition-all duration-300 ${
          desktopSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-48'
        }`}>
          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col bg-white rounded-l-xl shadow-sm border-l border-gray-100 relative">
            {/* 移动端顶部栏 */}
            <div className="lg:hidden flex items-center p-4 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="pb-24">
                  {messages.map((message, index) => {
                    // 判断该消息是否正在流式输出
                    const isThisMessageStreaming = currentStreamingMessageId === message.id && isStreaming;
                    
                    // 获取前一条消息，用于判断是否有用户问题
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const hasUserQuestion = previousMessage && previousMessage.role === 'user';
                    const userQuestion = hasUserQuestion ? previousMessage.content : "";
                    
                    // 判断是否是欢迎消息（第一条消息或没有对应的用户问题）
                    const isWelcomeMessage = message.role === 'assistant' && (index === 0 || !hasUserQuestion);
                    
                    // 决定是否显示按钮：
                    // 1. 必须是AI消息
                    // 2. 必须有内容
                    // 3. 不能正在流式输出
                    // 4. 不能是欢迎消息
                    const shouldShowButtons = 
                      message.role === 'assistant' && 
                      message.content && 
                      !isThisMessageStreaming && 
                      !isWelcomeMessage;
                    
                    // 调试日志
                    if (message.role === 'assistant') {
                      console.log('按钮显示调试:', {
                        messageId: message.id,
                        messageIndex: index,
                        role: message.role,
                        hasContent: !!message.content,
                        contentLength: message.content?.length || 0,
                        contentPreview: message.content?.substring(0, 50) || '',
                        isThisMessageStreaming,
                        isWelcomeMessage,
                        hasUserQuestion,
                        previousMessageRole: previousMessage?.role || 'none',
                        previousMessageContent: previousMessage?.content?.substring(0, 30) || '',
                        shouldShowButtons,
                        isStreaming,
                        currentStreamingMessageId,
                        allConditions: {
                          isAssistant: message.role === 'assistant',
                          hasContent: !!message.content,
                          notStreaming: !isThisMessageStreaming,
                          notWelcome: !isWelcomeMessage
                        }
                      });
                    }
                    
                    return (
                      <div key={`${message.id}-${isThisMessageStreaming ? 'streaming' : 'done'}`}>
                        {/* 调试组件 */}
                        <DebugButtons
                          message={message}
                          index={index}
                          messages={messages}
                          isStreaming={isStreaming}
                          currentStreamingMessageId={currentStreamingMessageId}
                        />
                        
                        <MinimalMessage
                          content={message.content}
                          role={message.role}
                          isStreaming={isThisMessageStreaming}
                          imageBase64={message.imageBase64}
                        />
                        
                        {/* AI回答的操作按钮 - 只在满足条件时显示 */}
                        {shouldShowButtons && (
                          <div className="max-w-6xl mx-auto px-4 py-2">
                            <div className="flex items-center gap-2 ml-14">
                              <SaveNoteButton
                                question={userQuestion}
                                answer={message.content}
                                chatId={message.id}
                              />
                              <MindMapButton
                                message={userQuestion}
                                answer={message.content}
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
                
            </div>
            
            {/* 滚动到底部按钮 - 相对于聊天区域定位 */}
            {!autoScroll && (
              <div className="absolute bottom-24 right-4 z-20">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50"
                  onClick={() => {
                    setAutoScroll(true);
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
          
          {/* 输入区域 - 固定在底部 */}
          <div className={`fixed bottom-0 right-0 z-30 transition-all duration-300 ${
            desktopSidebarCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-48'
          }`}>
            {/* 渐变遮罩层 - 仅在流式输出时显示 */}
            {isStreaming && (
              <div className="absolute inset-x-0 bottom-full h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
            )}
            <div className="bg-white border-t border-gray-200 shadow-lg">
              <div className="max-w-6xl mx-auto px-4 py-4">
                <InputArea
                  onSendMessage={handleSendMessage}
                  isAiThinking={isStreaming}
                  placeholder="输入您的法考问题或上传图片..."
                  onStopGeneration={handleStopGeneration}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* 移动端侧边栏 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0">
          <MinimalSidebar
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
            onCollapse={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}