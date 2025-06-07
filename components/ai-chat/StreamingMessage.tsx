"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
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
  <ReactMarkdown
    rehypePlugins={[rehypeHighlight]}
    remarkPlugins={[remarkGfm]}
    className="prose prose-sm dark:prose-invert max-w-full break-words"
  >
    {content}
  </ReactMarkdown>
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
    return (initialText + streamText).trim();
  }, [initialText, streamText]);
  
  // 使用打字机效果
  const { displayText, isTyping } = useTypewriter(combinedText, typingSpeed, {
    batchSize: 3, // 每次更新显示3个字符
    initialDelay: sender === 'ai' ? 300 : 0 // 如果是AI回复，添加一点初始延迟
  });

  // 决定是否以打字机效果显示内容
  const shouldUseTypewriter = sender === 'ai' && streamText && isStreaming;
  const textToDisplay = shouldUseTypewriter ? displayText : combinedText;

  // 如果没有内容，则不渲染任何内容
  if (!textToDisplay && !isStreaming) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex w-full mb-4",
      sender === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "rounded-lg p-4 max-w-[90%]",
        sender === 'user' 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-muted rounded-tl-none"
      )}>
        {sender === 'ai' && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={aiAvatar} />
              <AvatarFallback>{aiName?.[0] || 'A'}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{aiName}</span>
          </div>
        )}

        <div className="relative min-h-[1.5em]">
          {/* 打字机光标效果，仅在AI正在输入时显示 */}
          {shouldUseTypewriter && isTyping && (
            <span className="typing-cursor absolute -right-2 bottom-0"></span>
          )}
          
          {/* 使用Markdown渲染内容或者纯文本 */}
          {textToDisplay.includes('```') || textToDisplay.includes('#') ? (
            <MemoizedMarkdown content={textToDisplay} />
          ) : (
            <div className="whitespace-pre-wrap">{textToDisplay}</div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          {new Date(timestamp).toLocaleTimeString()}
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