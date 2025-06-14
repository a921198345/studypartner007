"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MinimalMessageProps {
  content: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
  imageBase64?: string;
}

export function MinimalMessage({
  content,
  role,
  isStreaming = false,
  imageBase64
}: MinimalMessageProps) {
  return (
    <div className={cn(
      "group w-full",
      role === 'user' ? 'bg-white' : 'bg-gray-50/50'
    )}>
      <div className="max-w-6xl mx-auto py-6 px-4 flex gap-6">
        {/* 头像 */}
        <div className="flex-shrink-0">
          {role === 'user' ? (
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <Bot className="w-5 h-5 text-gray-700" />
            </div>
          )}
        </div>
        
        {/* 内容区 */}
        <div className="flex-1 space-y-2">
          {/* 用户上传的图片 */}
          {imageBase64 && role === 'user' && (
            <div className="mb-3">
              <img 
                src={imageBase64} 
                alt="上传的图片" 
                className="max-w-md rounded-lg border border-gray-200"
              />
            </div>
          )}
          
          {/* 消息内容 */}
          <div className={cn(
            "prose prose-gray max-w-none",
            "prose-pre:bg-gray-900 prose-pre:text-gray-100",
            "prose-code:bg-gray-100 prose-code:text-gray-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2",
            "prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
            "prose-table:text-sm prose-table:border-collapse",
            "prose-th:bg-gray-100 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:font-semibold",
            "prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2",
            "prose-tr:border-b prose-tr:border-gray-300"
          )}>
            {role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-3" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => 
                    inline ? (
                      <code className="bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code {...props} />
                    ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 my-2 space-y-1" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-semibold mt-5 mb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-medium mt-4 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="my-2 leading-relaxed" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 my-3 text-gray-700 italic" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-gray-900" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-gray-100" {...props} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="bg-white divide-y divide-gray-200" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-r border-gray-300 last:border-r-0" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-300 last:border-r-0" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-gray-50" {...props} />
                  ),
                }}
              >
                {content || (isStreaming ? '正在思考...' : '')}
              </ReactMarkdown>
            ) : (
              <div className="whitespace-pre-wrap">{content}</div>
            )}
          </div>
          
          {/* 流式加载指示器 */}
          {isStreaming && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}