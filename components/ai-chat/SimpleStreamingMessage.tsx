"use client";

import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "../../lib/utils";

interface SimpleStreamingMessageProps {
  initialText?: string;
  streamText?: string;
  sender: 'user' | 'ai';
  timestamp?: string;
  aiName?: string;
  aiAvatar?: string;
  isStreaming?: boolean;
  imageBase64?: string;
}

// 简单的Markdown渲染函数
const renderSimpleMarkdown = (text: string) => {
  // 基本的Markdown转换
  let html = text;
  
  // 转换标题
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
  
  // 转换粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // 转换列表
  html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">• $1</li>');
  html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>');
  
  // 转换代码块
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```/g, '');
    return `<pre class="bg-gray-100 p-2 rounded my-2 overflow-x-auto"><code>${code}</code></pre>`;
  });
  
  // 转换内联代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
  
  // 转换换行
  html = html.replace(/\n/g, '<br/>');
  
  return html;
};

const SimpleStreamingMessage = ({
  initialText = '',
  streamText = '',
  sender,
  timestamp = new Date().toISOString(),
  aiName = "法考助手",
  aiAvatar = "/placeholder-user.jpg",
  isStreaming = false,
  imageBase64,
}: SimpleStreamingMessageProps) => {
  // 使用 ref 跟踪渲染次数
  const renderCountRef = useRef(0);
  const prevStreamTextRef = useRef(streamText);
  
  renderCountRef.current++;
  
  // 确保每次都使用最新的文本
  const combinedText = (initialText + (streamText || '')).trim();
  
  // 监听 streamText 变化
  useEffect(() => {
    if (sender === 'ai' && streamText !== prevStreamTextRef.current) {
      console.log('🔄 StreamText 变化:', {
        之前: prevStreamTextRef.current?.length || 0,
        现在: streamText?.length || 0,
        渲染次数: renderCountRef.current
      });
      prevStreamTextRef.current = streamText;
    }
  }, [streamText, sender]);
  
  // 调试日志
  if (sender === 'ai' && isStreaming) {
    console.log('🎨 SimpleStreamingMessage 渲染:', {
      initialText: initialText?.length || 0,
      streamText: streamText?.length || 0,
      combinedText: combinedText?.length || 0,
      isStreaming,
      渲染次数: renderCountRef.current
    });
  }
  
  if (!combinedText && !imageBase64 && !isStreaming) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex w-full mb-6",
      sender === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "rounded-lg p-5 max-w-[95%] shadow-sm border",
        sender === 'user' 
          ? "bg-blue-600 text-white rounded-tr-none border-blue-600" 
          : "bg-white rounded-tl-none border-gray-200"
      )}>
        {sender === 'ai' && (
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
            <Avatar className="h-8 w-8 ring-2 ring-blue-100">
              <AvatarImage src={aiAvatar} />
              <AvatarFallback className="bg-blue-500 text-white text-sm font-semibold">
                {aiName?.[0] || '法'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="font-semibold text-gray-800 text-sm">{aiName}</span>
              <div className="text-xs text-gray-500">专业法考辅导</div>
            </div>
          </div>
        )}

        <div className="relative min-h-[1.5em]">
          {isStreaming && sender === 'ai' && (
            <span className="absolute -right-2 bottom-0 w-0.5 h-4 bg-blue-500 animate-pulse"></span>
          )}
          
          {imageBase64 && sender === 'user' && (
            <div className="mb-3">
              <div className="inline-block bg-gray-100 rounded-lg p-2">
                <img 
                  src={imageBase64} 
                  alt="用户上传的图片" 
                  className="max-h-[200px] max-w-full w-auto rounded-md object-contain block"
                />
              </div>
            </div>
          )}
          
          {(combinedText || (isStreaming && sender === 'ai')) && combinedText !== '[图片]' && (
            <div 
              className={cn(
                "whitespace-pre-wrap leading-relaxed",
                sender === 'user' ? "text-white" : "text-gray-800"
              )}
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(combinedText || '') }}
            />
          )}
          
          {!combinedText && isStreaming && sender === 'ai' && (
            <div className="text-gray-500 flex items-center gap-2">
              <span>正在输入</span>
              <span className="inline-flex">
                <span className="animate-bounce delay-0">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "text-xs mt-3 pt-2 border-t",
          sender === 'user' 
            ? "text-blue-100 border-blue-500" 
            : "text-gray-400 border-gray-100"
        )}>
          <span suppressHydrationWarning>
            {typeof window !== 'undefined' ? new Date(timestamp).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

// 不使用 memo，确保流式更新能实时显示
export default SimpleStreamingMessage;