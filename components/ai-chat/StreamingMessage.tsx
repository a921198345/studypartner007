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

const StreamingMessage: React.FC<StreamingMessageProps> = ({
  initialText = "",
  streamText = "",
  sender,
  timestamp,
  aiName = "法考助手",
  aiAvatar = "/placeholder.svg",
  isStreaming = false,
  typingSpeed = 20
}) => {
  // 客户端渲染标志
  const [isClient, setIsClient] = useState(false);

  // 在客户端挂载后设置标志
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 组合初始文本和流式文本，使用useMemo优化性能
  const fullText = useMemo(() => initialText + streamText, [initialText, streamText]);
  
  // 使用打字机效果，增加批量处理大小以减少渲染次数
  const { displayText, isTyping } = useTypewriter(
    isStreaming ? fullText : initialText,
    typingSpeed,
    { batchSize: 8 } // 每次更新增加更多字符，减少重渲染次数
  );

  // 使用客户端状态存储格式化后的时间，初始设为固定值以避免水合错误
  const [formattedTime, setFormattedTime] = useState<string>("--:--");
  
  // 只在客户端渲染后格式化时间
  useEffect(() => {
    if (isClient && timestamp) {
      try {
        const timeStr = timestamp;
        const formatted = new Date(timeStr).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
        setFormattedTime(formatted);
      } catch (e) {
        console.error("时间格式化错误:", e);
        setFormattedTime("--:--");
      }
    }
  }, [timestamp, isClient]);

  // 简单文本渲染组件
  const SimpleTextRenderer = ({ text }: { text: string }) => (
    <div className="whitespace-pre-wrap">{text}</div>
  );

  // 使用memo优化Markdown内容渲染
  const MarkdownContent = useMemo(() => {
    if (!isClient || !displayText) return null;
    
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义链接，在新标签页打开
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // 自定义代码块样式
          code: (props) => {
            const { className, children, ...rest } = props;
            
            // 检查是否是内联代码
            const isInline = !className;
            
            if (isInline) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            
            return (
              <div className="relative">
                <pre className={cn(
                  "rounded-md p-4 overflow-x-auto", 
                  className
                )}>
                  <code {...rest}>{children}</code>
                </pre>
              </div>
            );
          }
        }}
      >
        {displayText}
      </ReactMarkdown>
    );
  }, [displayText, isClient]);

  return (
    <div className={cn(
      "flex",
      sender === 'user' ? "justify-end" : "justify-start"
    )}>
      {/* 如果是AI消息，则显示头像 */}
      {sender === 'ai' && (
        <div className="flex-shrink-0 mr-2">
          <Avatar>
            <AvatarImage src={aiAvatar} alt={aiName} />
            <AvatarFallback>{aiName.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className={cn(
        "flex flex-col max-w-[80%] rounded-lg p-4",
        sender === 'user'
          ? "bg-primary text-primary-foreground rounded-tr-none"
          : "bg-muted rounded-tl-none"
      )}>
        {/* AI头像和名称只在AI消息中显示 */}
        {sender === 'ai' && (
          <div className="font-semibold mb-1">{aiName}</div>
        )}

        {/* 消息内容 */}
        <div className="prose dark:prose-invert max-w-none">
          {sender === 'ai' ? (
            isClient ? (
              MarkdownContent
            ) : (
              // 服务器端渲染使用简单文本
              <SimpleTextRenderer text={initialText} />
            )
          ) : (
            // 用户消息使用简单文本
            <div className="text-primary-foreground">{displayText}</div>
          )}
          {isTyping && isClient && <span className="cursor-blink opacity-70">▋</span>}
        </div>

        {/* 时间戳 */}
        <div className={cn(
          "text-xs mt-2",
          sender === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default React.memo(StreamingMessage); 