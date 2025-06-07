"use client";

import React, { useState, useRef } from 'react';
import { SendHorizontal, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface InputAreaProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
  isAiThinking?: boolean;
  placeholder?: string;
}

export function InputArea({
  onSendMessage,
  isAiThinking = false,
  placeholder = '输入您的法考问题...'
}: InputAreaProps) {
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // 提交表单，发送消息
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() && !imageBase64) {
      toast({
        title: "无法发送",
        description: "请输入问题或上传图片",
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
      console.log("输入内容:", inputText);
      console.log("发送消息:", inputText);
      onSendMessage(inputText, imageBase64 || undefined);
      
      // 重置输入状态
      setInputText('');
      setImageBase64(null);
    } catch (error) {
      console.error("发送消息失败:", error);
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
  
  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "请上传小于5MB的图片",
        variant: "destructive",
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "不支持的文件类型",
        description: "请上传图片文件 (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // 读取图片文件为Base64
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageBase64(base64);
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: "上传失败",
        description: "读取图片时出错，请重试",
        variant: "destructive",
      });
      setIsUploading(false);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsDataURL(file);
  };
  
  // 删除已上传的图片
  const handleRemoveImage = () => {
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // 触发文件选择对话框
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* 输入区域 */}
      <div className="relative">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] pr-20 resize-none py-3"
          disabled={isAiThinking || isUploading}
        />
        
        {/* 右侧按钮区域 */}
        <div className="absolute right-2 bottom-2 flex items-center space-x-2">
          {/* 上传图片按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={triggerFileInput}
            disabled={isAiThinking || isUploading || !!imageBase64}
            title="上传图片"
            className="h-8 w-8"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="sr-only">上传图片</span>
            
            {/* 隐藏的文件输入框 */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
          </Button>
          
          {/* 发送按钮 */}
          <Button
            type="submit"
            size="icon"
            disabled={isAiThinking || isUploading || (!inputText.trim() && !imageBase64)}
            className="h-8 w-8"
          >
            {isAiThinking || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
            <span className="sr-only">发送</span>
          </Button>
        </div>
      </div>
      
      {/* 显示上传的图片预览 */}
      {imageBase64 && (
        <div className="relative mt-2 inline-block">
          <img
            src={imageBase64}
            alt="上传的图片"
            className="max-h-32 rounded-md border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={handleRemoveImage}
          >
            <span>×</span>
            <span className="sr-only">删除图片</span>
          </Button>
        </div>
      )}
      
      {/* 提示文本 */}
      <p className="text-xs text-muted-foreground mt-2">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </form>
  );
} 