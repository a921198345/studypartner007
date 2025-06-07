import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  initialDelay?: number; // 开始前的延迟时间
  typingDelay?: number; // 每个字符之间的延迟
  batchSize?: number;   // 每次更新的字符数
}

interface UseTypewriterResult {
  displayText: string;
  isTyping: boolean;
  isDone: boolean;
  reset: () => void;
}

/**
 * 使用打字机效果逐字显示文本
 * @param text 要显示的完整文本
 * @param speed 打字速度（毫秒/字符）
 * @param options 配置选项
 */
export function useTypewriter(
  text: string, 
  speed: number = 20, 
  options: UseTypewriterOptions = {}
): UseTypewriterResult {
  const { 
    initialDelay = 0, 
    typingDelay = speed, 
    batchSize = 3  // 默认每次更新3个字符
  } = options;
  
  // 为避免SSR水合错误，初始状态应保持空
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // 使用ref存储索引，避免过多的重渲染
  const indexRef = useRef(0);
  // 存储当前文本以便对比是否变化
  const textRef = useRef('');
  // 使用ref存储timeout id
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 检测客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 重置打字效果
  const reset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayText('');
    indexRef.current = 0;
    setIsTyping(false);
    setIsDone(false);
  };
  
  // 当输入文本发生变化时，重置打字效果
  useEffect(() => {
    // 检查文本是否真的变化了
    if (isClient && textRef.current !== text) {
      textRef.current = text;
      reset();
    }
  }, [text, isClient]);
  
  // 打字效果逻辑
  useEffect(() => {
    // 确保在客户端执行
    if (!isClient) return;
    
    // 如果没有文本，则结束
    if (!text) {
      setIsDone(true);
      setIsTyping(false);
      return;
    }
    
    // 如果索引已经到达文本末尾，完成打字
    if (indexRef.current >= text.length) {
      setIsDone(true);
      setIsTyping(false);
      return;
    }
    
    setIsTyping(true);
    setIsDone(false);
    
    // 计算本次应该添加的字符数
    const remainingChars = text.length - indexRef.current;
    const charsToAdd = Math.min(batchSize, remainingChars);
    
    // 设置初始延迟或字符间延迟
    const delay = indexRef.current === 0 ? initialDelay : typingDelay;
    
    // 使用setTimeout实现延迟打字效果
    timeoutRef.current = setTimeout(() => {
      // 批量添加多个字符
      setDisplayText(prev => {
        const nextChunk = text.substring(indexRef.current, indexRef.current + charsToAdd);
        indexRef.current += charsToAdd;
        return prev + nextChunk;
      });
      
      // 触发useEffect重新执行，继续打字
      setIsTyping(prevIsTyping => prevIsTyping);
    }, delay);
    
    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, isTyping, isClient, initialDelay, typingDelay, batchSize]);
  
  // 如果不是客户端渲染，直接返回完整文本（避免水合错误）
  if (!isClient) {
    return {
      displayText: text || '',
      isTyping: false,
      isDone: true,
      reset
    };
  }
  
  return { displayText, isTyping, isDone, reset };
} 