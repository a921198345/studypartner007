"use client";

import React, { useState, useEffect, useMemo } from 'react';
// import { useTypewriter } from '@/hooks/useTypewriter';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

// 动态导入ReactMarkdown组件，仅在客户端渲染
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <div className="whitespace-pre-wrap">加载中...</div>
});

// 直接导入插件，但只在客户端使用
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

interface StreamingMessageProps {
  initialText?: string;
  streamText?: string;
  sender: 'user' | 'ai';
  timestamp?: string;
  aiName?: string;
  aiAvatar?: string;
  isStreaming?: boolean;
  typingSpeed?: number;
}

// 记忆化的Markdown组件，减少重渲染
const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none break-words 
                  prose-headings:text-blue-700 prose-headings:font-bold
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                  prose-strong:text-blue-600 prose-strong:font-semibold
                  prose-table:text-sm prose-th:bg-blue-50 prose-th:font-semibold
                  prose-td:border-gray-200 prose-td:p-2
                  prose-ul:space-y-1 prose-li:marker:text-blue-500
                  prose-p:leading-relaxed prose-p:mb-3
                  prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                  prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50">
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  </div>
));
MemoizedMarkdown.displayName = 'MemoizedMarkdown';

const StreamingMessage = ({
  initialText = '',
  streamText = '',
  sender,
  timestamp = new Date().toISOString(),
  aiName = "法考助手",
  aiAvatar = "/placeholder-user.jpg",
  isStreaming = false,
  typingSpeed = 20,
}: StreamingMessageProps) => {
  // 组合初始文本和流式文本
  const combinedText = useMemo(() => {
    const combined = (initialText + streamText).trim();
    // 减少日志输出，避免性能问题
    if (streamText) {
      console.log('🔄 文本组合 - 流式长度:', streamText.length, '总长度:', combined.length);
    }
    return combined;
  }, [initialText, streamText]);
  
  // 注释掉打字机效果，直接显示
  // const { displayText, isTyping } = useTypewriter(combinedText, typingSpeed, {
  //   batchSize: 1, // 改为1个字符，实现真正的实时显示
  //   initialDelay: sender === 'ai' ? 0 : 0 // 完全移除初始延迟
  // });

  // 决定是否以打字机效果显示内容 - 暂时完全禁用打字机效果以保证流式显示
  const textToDisplay = combinedText;

  // 如果没有内容但正在流式传输，显示占位符
  if (!textToDisplay && isStreaming) {
    return (
      <div className="flex w-full mb-6 justify-start">
        <div className="rounded-lg p-5 max-w-[95%] shadow-sm border bg-white rounded-tl-none border-gray-200">
          <div>正在输入...</div>
        </div>
      </div>
    );
  }
  
  // 如果没有内容且不在流式传输，则不渲染
  if (!textToDisplay) {
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
          {/* 流式输入指示器 */}
          {isStreaming && sender === 'ai' && (
            <span className="absolute -right-2 bottom-0 w-0.5 h-4 bg-blue-500 animate-pulse"></span>
          )}
          
          {/* 使用Markdown渲染内容或者纯文本 */}
          {textToDisplay.includes('```') || textToDisplay.includes('#') || textToDisplay.includes('**') ? (
            <MemoizedMarkdown content={textToDisplay} />
          ) : (
            <div className={cn(
              "whitespace-pre-wrap leading-relaxed",
              sender === 'user' ? "text-white" : "text-gray-800"
            )}>{textToDisplay}</div>
          )}
        </div>
        
        <div className={cn(
          "text-xs mt-3 pt-2 border-t",
          sender === 'user' 
            ? "text-blue-100 border-blue-500" 
            : "text-gray-400 border-gray-100"
        )}>
          {/* 避免水合错误，使用静态时间显示 */}
          <span suppressHydrationWarning>
            {typeof window !== 'undefined' ? new Date(timestamp).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(StreamingMessage);

// 添加全局CSS (添加到你的globals.css文件中)
// .typing-cursor {
//   display: inline-block;
//   width: 0.5em;
//   height: 1em;
//   background-color: currentColor;
//   animation: cursor-blink 1s step-end infinite;
// }
// 
// @keyframes cursor-blink {
//   0%, 100% { opacity: 1; }
//   50% { opacity: 0; }
// } 