"use client";

import React, { useState } from 'react';
import { SendHorizontal, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface InputAreaProps {
  onSendMessage: (text: string) => void;
  isAiThinking?: boolean;
  placeholder?: string;
  onStopGeneration?: () => void;
}

export function InputArea({
  onSendMessage,
  isAiThinking = false,
  placeholder = '输入您的法考问题...',
  onStopGeneration
}: InputAreaProps) {
  const [inputText, setInputText] = useState('');
  const { toast } = useToast();
  
  // 提交表单，发送消息
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      toast({
        title: "无法发送",
        description: "请输入问题",
        variant: "destructive",
      });
      return;
    }
    
    if (isAiThinking) {
      toast({
        title: "AI正在思考中",
        description: "请等待AI完成当前回答后再提问",
      });
      return;
    }
    
    try {
      onSendMessage(inputText);
      
      // 重置输入状态
      setInputText('');
    } catch (error) {
      toast({
        title: "发送失败",
        description: "消息发送过程中出现错误",
        variant: "destructive",
      });
    }
  };
  
  // 处理键盘输入
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 阻止默认的换行行为
      handleSubmit(e);
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="relative"
    >
      
      {/* 输入区域 */}
      <div className="relative">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] pr-24 resize-none py-4 px-4 text-base border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-gray-50/50 focus:bg-white transition-all"
          disabled={isAiThinking}
        />
        
        {/* 右侧按钮区域 */}
        <div className="absolute right-3 bottom-3 flex items-center space-x-2">
          {/* 发送/暂停按钮 */}
          {isAiThinking && onStopGeneration ? (
            <Button
              type="button"
              size="icon"
              onClick={onStopGeneration}
              variant="destructive"
              className="h-9 w-9 rounded-lg shadow-sm"
              title="暂停生成"
            >
              <Square className="h-4 w-4" />
              <span className="sr-only">暂停</span>
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={isAiThinking || !inputText.trim()}
              className="h-9 w-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm disabled:from-gray-300 disabled:to-gray-400"
            >
              {isAiThinking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
              <span className="sr-only">发送</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* 提示文本 */}
      <div className="text-xs text-gray-500 mt-2 px-1">
        <p>按 Enter 发送，Shift + Enter 换行</p>
      </div>
    </form>
  );
} 