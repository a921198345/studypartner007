"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import ChatLayout from "@/components/ai-chat/ChatLayout"
import { MinimalMessage } from "@/components/ai-chat/MinimalMessage"
import { InputArea } from "@/components/ai-chat/InputArea"
import { SaveNoteButton } from "@/components/ai-chat/SaveNoteButton"
import { MindMapButton } from "@/components/ai-chat/MindMapButton"
import { RelatedQuestionsButton } from "@/components/ai-chat/RelatedQuestionsButton"
import { SidebarSimpleFixed } from "@/components/ai-chat/sidebar-simple-fixed"
// import { DebugButtons } from "@/components/ai-chat/DebugButtons"
// import { MessageDebugPanel } from "@/components/ai-chat/MessageDebugPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Menu, ChevronDown, PanelLeft, Calendar, BookOpen } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'
import { askAIStream, AskAIParams } from "@/lib/api/aiService"
import { useToast } from "@/components/ui/use-toast"
import { useChatStore } from '@/hooks/useChatStore'
import { getAuthHeaders } from '@/lib/auth-utils'
import { useFirstUseAuth } from '@/components/auth/first-use-auth-guard'
import { useStudyPlan, useStudySession } from '@/stores/study-plan-store'
import { Alert, AlertDescription } from "@/components/ui/alert"

// 扩展消息类型，添加流式相关属性
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export default function AIChat() {
  const { toast } = useToast();
  const { checkAuthOnAction } = useFirstUseAuth('ai-chat');
  const searchParams = useSearchParams();
  const { 
    messages, 
    addMessage, 
    updateMessage,
    currentConversationId,
    conversations,
    createNewConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    cleanupEmptyConversations
  } = useChatStore();
  
  // 学习计划集成
  const { plan } = useStudyPlan();
  const { isActive: isStudySessionActive, session, start: startStudySession, end: endStudySession } = useStudySession();
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 新增：强制刷新计数器
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // 新增：已完成流式传输的消息ID集合
  const [completedStreamingIds, setCompletedStreamingIds] = useState<Set<string>>(new Set());
  
  // 新增：监听 messages 变化以强制刷新
  const [localMessages, setLocalMessages] = useState(messages);
  
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);
  
  // 确保客户端渲染
  useEffect(() => {
    setMounted(true);
    // 从 localStorage 读取侧边栏状态
    const saved = localStorage.getItem('ai-chat-sidebar-collapsed');
    if (saved !== null) {
      setDesktopSidebarCollapsed(JSON.parse(saved));
    }
    
    // 检查并清理过大的 localStorage 数据
    try {
      const storageSize = new Blob([JSON.stringify(localStorage)]).size;
      if (storageSize > 4 * 1024 * 1024) { // 如果超过 4MB
        console.warn('localStorage 接近容量限制，清理旧数据...');
        // 清理旧的聊天数据
        const chatStorage = localStorage.getItem('law-chat-storage');
        if (chatStorage) {
          try {
            const data = JSON.parse(chatStorage);
            // 只保留最近的对话
            if (data.conversations && data.conversations.length > 5) {
              data.conversations = data.conversations.slice(-5);
              localStorage.setItem('law-chat-storage', JSON.stringify(data));
            }
          } catch (parseError) {
            // 如果解析失败，直接删除
            localStorage.removeItem('law-chat-storage');
          }
        }
        // 不再自动刷新页面，避免无限循环
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
  
  // 处理来自知识导图的跳转参数
  useEffect(() => {
    if (mounted) {
      const question = searchParams.get('q');
      const source = searchParams.get('source');
      
      if (question && source === 'knowledge-map') {
        // 如果有来自知识导图的问题，自动发送
        const subject = searchParams.get('subject');
        const keywords = searchParams.get('keywords');
        
        // 显示提示信息
        toast({
          description: `从知识导图跳转，正在为您解答：${question.substring(0, 30)}...`,
          duration: 3000,
        });
        
        // 延迟发送消息，确保对话已经创建
        setTimeout(() => {
          handleSendMessage(question);
        }, 500);
      }
    }
  }, [mounted, searchParams]);

  // 初始化对话 - 只在没有当前对话时创建新对话
  useEffect(() => {
    if (mounted && !currentConversationId) {
      // 只在没有当前对话时创建新对话
      // 先清理空对话
      cleanupEmptyConversations();
      // 创建新对话
      const newId = createNewConversation();
      console.log('页面加载，创建新对话:', newId);
    }
  }, [mounted, currentConversationId]); // 依赖 currentConversationId，避免重复创建
  
  // 页面卸载时清理空对话
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 页面卸载前清理空对话
      cleanupEmptyConversations();
    };
    
    // 监听页面卸载事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // 组件卸载时清理空对话
      cleanupEmptyConversations();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanupEmptyConversations]);
  
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

  // 切换对话时滚动到底部
  useEffect(() => {
    if (mounted && messages.length > 0 && currentConversationId) {
      // 只在真正切换到有内容的对话时才滚动
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
  }, [mounted, currentConversationId, messages.length]); // 添加 messages.length 依赖
  
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
    // console.log('点击暂停按钮');
    if (abortControllerRef.current) {
      // console.log('中止请求');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setCurrentStreamingMessageId(null);
    }
  }, []);
  
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // 首次使用时触发登录提醒
    checkAuthOnAction();
    
    // 如果没有当前对话，创建新对话
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = createNewConversation();
      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 100));
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
    
    // 更新对话标题
    if (messages.length <= 1 && conversationId) {
      const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
      updateConversationTitle(conversationId, title);
    }
    
    // 添加空的AI消息
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
      // 直接调用 API，包含认证头
      const response = await fetch('/api/ai/ask/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          question: text
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
            // console.log('流读取完成');
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
      // console.log('流式传输完成，重置状态');
      // console.log('最终内容长度:', fullText.length);
      
      // 确保消息有内容
      if (!fullText || fullText.trim().length === 0) {
        console.warn('警告：AI回复内容为空');
        fullText = '抱歉，生成回答时出现问题，请重试。';
      }
      
      // 先更新消息内容
      updateMessage(aiMessageId, { content: fullText });
      
      // 标记这条消息的流式传输已完成
      setCompletedStreamingIds(prev => new Set([...prev, aiMessageId]));
      
      // 强制同步更新流式状态
      setIsStreaming(false);
      setCurrentStreamingMessageId(null);
      
      // 增加刷新计数器以强制重新渲染
      setRefreshCounter(prev => prev + 1);
      
      // 强制从 store 重新获取消息
      const latestMessages = useChatStore.getState().messages;
      setLocalMessages([...latestMessages]);
      
      // 确保状态完全更新后再次刷新
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        const finalMessages = useChatStore.getState().messages;
        setLocalMessages([...finalMessages]);
        // console.log('流式传输完成，最终消息数:', finalMessages.length);
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
        {/* 调试面板 - 已隐藏 */}
        {/* <MessageDebugPanel 
          isStreaming={isStreaming} 
          currentStreamingMessageId={currentStreamingMessageId} 
        /> */}
        {/* 左侧边栏 - 对话历史 - 固定定位 */}
        <div className={`hidden lg:block fixed left-0 top-16 bottom-0 z-20 transition-all duration-300 ${
          desktopSidebarCollapsed ? 'w-14' : 'w-64'
        }`}>
          <SidebarSimpleFixed
            currentConversationId={currentConversationId}
            conversations={conversations}
            collapsed={desktopSidebarCollapsed}
            onNewConversation={() => {
              // 创建新对话前先清理当前的空对话
              cleanupEmptyConversations();
              const newId = createNewConversation();
              // 不再自动添加欢迎消息
            }}
            onSelectConversation={switchConversation}
            onDeleteConversation={deleteConversation}
            onCollapse={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
          />
        </div>
        
        <div className={`flex-1 flex flex-col relative transition-all duration-300 ${
          desktopSidebarCollapsed ? 'lg:ml-14' : 'lg:ml-64'
        }`}>
          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col bg-white relative">
            {/* 移动端顶部栏 */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium text-gray-600">法考AI助手</span>
              <div className="w-9" /> {/* 占位元素，保持标题居中 */}
            </div>
            
            {/* 学习计划提示区域 */}
            {plan && (
              <Alert className="m-4 mb-0 border-blue-200 bg-blue-50">
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">今日学习重点：</span>
                      {plan.subjects_order && plan.subjects_order[0] ? (
                        <span className="ml-2">{plan.subjects_order[0]}</span>
                      ) : (
                        <span className="ml-2">暂无安排</span>
                      )}
                      <span className="ml-4 text-sm text-muted-foreground">
                        计划学习 {plan.schedule_settings?.daily_hours || 3} 小时
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {!isStudySessionActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (plan.subjects_order && plan.subjects_order[0]) {
                              startStudySession(plan.subjects_order[0], 'ai_chat');
                              toast({
                                description: '学习会话已开始，祝您学习愉快！',
                              });
                            }
                          }}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          开始学习
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            endStudySession();
                            toast({
                              description: '学习会话已结束，记得休息一下！',
                            });
                          }}
                        >
                          结束学习
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.href = '/learning-plan'}
                      >
                        查看计划
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="pb-32">
                  {/* 空状态提示 */}
                  {(messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                      <div className="max-w-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                          欢迎使用法考助手AI
                        </h2>
                        <p className="text-gray-600 mb-6">
                          请输入您的法考问题，我会尽力帮您解答
                        </p>
                        <div className="text-sm text-gray-500">
                          <p className="mb-2 text-center">您可以问我：</p>
                          <ul className="space-y-1 text-left inline-block">
                            <li className="flex"><span className="mr-2">•</span><span>具体的法律概念解释</span></li>
                            <li className="flex"><span className="mr-2">•</span><span>法考真题的解析</span></li>
                            <li className="flex"><span className="mr-2">•</span><span>法律条文的理解</span></li>
                            <li className="flex"><span className="mr-2">•</span><span>案例分析等</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(localMessages || messages).map((message, index) => {
                    // 判断该消息是否正在流式输出
                    const isThisMessageStreaming = currentStreamingMessageId === message.id && isStreaming;
                    
                    // 获取前一条消息，用于判断是否有用户问题
                    const previousMessage = index > 0 ? (localMessages || messages)[index - 1] : null;
                    const hasUserQuestion = previousMessage && previousMessage.role === 'user';
                    const userQuestion = hasUserQuestion ? previousMessage.content : "";
                    
                    // 判断是否是欢迎消息（第一条消息或没有对应的用户问题）
                    const isWelcomeMessage = message.role === 'assistant' && (index === 0 || !hasUserQuestion);
                    
                    // 重写按钮显示逻辑：
                    // 1. 必须是AI消息
                    // 2. 必须有内容
                    // 3. 如果该消息ID在已完成集合中，或者不在流式传输中，则显示按钮
                    // 4. 不能是欢迎消息
                    const hasCompletedStreaming = completedStreamingIds.has(message.id);
                    
                    // 简化按钮显示条件 - 只要是AI消息，有内容，且不在流式传输中，就显示按钮
                    // 暂时去掉欢迎消息的判断，确保按钮能显示
                    const shouldShowButtons = 
                      message.role === 'assistant' && 
                      message.content && 
                      message.content.trim().length > 10 &&  // 至少有10个字符
                      !isThisMessageStreaming && 
                      hasUserQuestion;  // 只要有用户问题就显示
                    
                    // 调试日志 - 生产环境已禁用
                    // if (message.role === 'assistant') {
                    //   console.log('按钮显示调试:', { ... });
                    // }
                    
                    return (
                      <div key={`${message.id}-${refreshCounter}-${hasCompletedStreaming ? 'completed' : (isThisMessageStreaming ? 'streaming' : 'done')}`}>
                        {/* 调试组件 - 已隐藏 */}
                        {/* <DebugButtons
                          message={message}
                          index={index}
                          messages={messages}
                          isStreaming={isStreaming}
                          currentStreamingMessageId={currentStreamingMessageId}
                        /> */}
                        
                        <MinimalMessage
                          content={message.content}
                          role={message.role}
                          isStreaming={isThisMessageStreaming}
                        />
                        
                        {/* AI回答的操作按钮 - 只在满足条件时显示 */}
                        {shouldShowButtons && (
                          <div className="max-w-6xl mx-auto px-4 py-4 mb-4">
                            <div className="flex items-center gap-2 ml-14">
                              <SaveNoteButton
                                question={userQuestion}
                                answer={message.content}
                                chatId={message.id}
                                preserveHtml={true}
                              />
                              <MindMapButton
                                message={userQuestion}
                                answer={message.content}
                              />
                              <RelatedQuestionsButton
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
            desktopSidebarCollapsed ? 'left-0 lg:left-14' : 'left-0 lg:left-64'
          }`}>
            {/* 渐变遮罩层 - 仅在流式输出时显示 */}
            {isStreaming && (
              <div className="absolute inset-x-0 bottom-full h-24 bg-gradient-to-t from-white/95 via-white/60 to-transparent pointer-events-none" />
            )}
            <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 input-area-shadow">
              <div className="max-w-6xl mx-auto px-4 py-3">
                <InputArea
                  onSendMessage={handleSendMessage}
                  isAiThinking={isStreaming}
                  placeholder="输入您的法考问题..."
                  onStopGeneration={handleStopGeneration}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* 移动端侧边栏 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarSimpleFixed
            currentConversationId={currentConversationId}
            conversations={conversations}
            onNewConversation={() => {
              // 创建新对话前先清理当前的空对话
              cleanupEmptyConversations();
              const newId = createNewConversation();
              // 不再自动添加欢迎消息
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
