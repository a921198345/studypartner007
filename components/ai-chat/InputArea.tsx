"use client";

import React, { useState, useRef } from 'react';
import { SendHorizontal, Loader2, ImagePlus, FileText, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

interface InputAreaProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
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
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
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
      // console.log("输入内容:", inputText);
      // console.log("发送消息:", inputText);
      onSendMessage(inputText, imageBase64 || undefined);
      
      // 重置输入状态
      setInputText('');
      setImageBase64(null);
    } catch (error) {
      // console.error("发送消息失败:", error);
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
  
  // 处理粘贴事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processFile(file);
        }
        break;
      }
    }
  };
  
  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
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
  
  // OCR处理函数
  const performOCR = async (base64Image: string) => {
    setIsProcessingOCR(true);
    setOcrProgress(20);
    
    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 80));
      }, 300);
      
      // 使用JSON格式发送数据
      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image })
      });
      
      clearInterval(progressInterval);
      setOcrProgress(90);
      
      if (!ocrResponse.ok) {
        throw new Error('OCR识别失败');
      }
      
      const result = await ocrResponse.json();
      setOcrProgress(100);
      
      if (result.success && result.text) {
        // 将识别的文字添加到输入框
        setInputText(prev => {
          const newText = prev ? prev + '\n\n' + result.text : result.text;
          return newText;
        });
        
        toast({
          title: "文字识别成功",
          description: "已将识别的文字添加到输入框",
        });
      } else {
        throw new Error(result.message || 'OCR识别失败');
      }
    } catch (error) {
      console.error('OCR错误:', error);
      toast({
        title: "文字识别失败",
        description: error instanceof Error ? error.message : "请手动输入题目内容",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
  };
  
  // 处理文件（用于拖拽和选择）
  const processFile = async (file: File) => {
    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "请上传小于5MB的图片",
        variant: "destructive",
      });
      return;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "不支持的文件类型",
        description: "请上传图片文件 (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // 读取图片文件为Base64
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImageBase64(base64);
      setIsUploading(false);
      
      // 自动执行OCR
      await performOCR(base64);
    };
    
    reader.onerror = () => {
      toast({
        title: "上传失败",
        description: "读取图片时出错，请重试",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };
  
  // 拖拽事件处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当离开整个表单区域时才关闭拖拽状态
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 拖拽提示层 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-lg">
          <div className="text-center">
            <ImagePlus className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <p className="text-blue-600 font-medium">拖放图片到这里</p>
          </div>
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="relative">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="min-h-[100px] pr-24 resize-none py-4 px-4 text-base border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-gray-50/50 focus:bg-white transition-all"
          disabled={isAiThinking || isUploading || isProcessingOCR}
        />
        
        {/* 右侧按钮区域 */}
        <div className="absolute right-3 bottom-3 flex items-center space-x-2">
          {/* 上传图片按钮 */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={triggerFileInput}
            disabled={isAiThinking || isUploading || !!imageBase64}
            title="上传图片"
            className="h-9 w-9 hover:bg-gray-100 rounded-lg"
          >
            <ImagePlus className="h-5 w-5 text-gray-600" />
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
              disabled={isAiThinking || isUploading || (!inputText.trim() && !imageBase64)}
              className="h-9 w-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm disabled:from-gray-300 disabled:to-gray-400"
            >
              {isAiThinking || isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
              <span className="sr-only">发送</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* 显示上传的图片预览 */}
      {imageBase64 && (
        <div className="relative mt-2 space-y-2">
          <div className="relative inline-block max-w-full">
            <div className="relative group">
              <div className="bg-gray-100 rounded-lg p-2 inline-block">
                <img
                  src={imageBase64}
                  alt="上传的图片"
                  className="max-h-32 max-w-[200px] w-auto rounded object-contain block"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full shadow-md"
                onClick={handleRemoveImage}
              >
                <span>×</span>
                <span className="sr-only">删除图片</span>
              </Button>
              
              {/* OCR处理状态覆盖层 */}
              {isProcessingOCR && (
                <div className="absolute inset-0 bg-black/50 rounded-md flex flex-col items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white animate-pulse mb-2" />
                  <span className="text-white text-sm font-medium">识别文字中...</span>
                </div>
              )}
            </div>
          </div>
          
          {/* OCR进度条 */}
          {isProcessingOCR && (
            <div className="w-full max-w-xs">
              <Progress value={ocrProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">正在智能识别图片中的文字...</p>
            </div>
          )}
          
          {/* OCR功能提示 */}
          {!isProcessingOCR && !inputText && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="h-3 w-3" />
              <span>正在自动识别图片中的文字</span>
            </div>
          )}
        </div>
      )}
      
      {/* 提示文本 */}
      <div className="text-xs text-gray-500 mt-2 space-y-1 px-1">
        <p>按 Enter 发送，Shift + Enter 换行 | 支持拖拽或粘贴图片</p>
        {imageBase64 && !isProcessingOCR && inputText && (
          <p className="text-green-600 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            文字识别完成，您可以编辑后发送
          </p>
        )}
      </div>
    </form>
  );
} 