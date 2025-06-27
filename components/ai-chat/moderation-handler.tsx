/**
 * AI回答内容审核处理工具
 * 
 * 提供处理流式回答中审核消息的函数和组件
 */

import React from "react";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

/**
 * 审核消息类型定义
 */
export interface ModerationMessage {
  type: 'moderation_notice' | 'moderation_rejection' | 'content_modified' | 'error';
  message?: string;
  has_modification?: boolean;
  original_length?: number;
  modified_length?: number;
}

/**
 * 检查是否为审核相关消息
 * @param data - 事件数据
 * @returns 是否为审核消息
 */
export function isModerationMessage(data: any): boolean {
  if (!data) return false;
  
  try {
    // 尝试解析JSON
    const json = typeof data === 'object' ? data : JSON.parse(data);
    
    // 检查是否包含审核消息的特征
    return (
      json.type === 'moderation_notice' ||
      json.type === 'moderation_rejection' ||
      json.type === 'content_modified' ||
      json.type === 'error'
    );
  } catch (e) {
    return false;
  }
}

/**
 * 解析审核消息
 * @param data - 事件数据
 * @returns 解析后的审核消息对象
 */
export function parseModerationMessage(data: string): ModerationMessage | null {
  try {
    // 移除SSE格式前缀
    const jsonStr = data.replace(/^data:\s*/, '').trim();
    if (jsonStr === '[DONE]') return null;
    
    // 解析JSON
    const json = JSON.parse(jsonStr);
    
    // 验证格式
    if (
      json.type === 'moderation_notice' ||
      json.type === 'moderation_rejection' ||
      json.type === 'content_modified' ||
      json.type === 'error'
    ) {
      return json as ModerationMessage;
    }
    
    return null;
  } catch (e) {
    console.error('解析审核消息失败:', e);
    return null;
  }
}

/**
 * 审核提示组件
 */
export function ModerationAlert({ message }: { message: ModerationMessage }) {
  // 不同类型消息的样式和内容
  const getAlertProps = () => {
    switch (message.type) {
      case 'moderation_notice':
        return {
          variant: 'default' as const,
          icon: <Info className="h-4 w-4" />,
          title: '内容提示',
          description: message.message || '此回答已被系统检查'
        };
      case 'moderation_rejection':
        return {
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-4 w-4" />,
          title: '内容被拒绝',
          description: message.message || '此回答不符合内容规范'
        };
      case 'content_modified':
        return {
          variant: 'warning' as const,
          icon: <Info className="h-4 w-4" />,
          title: '内容已修改',
          description: `回答内容已被系统优化${
            message.original_length && message.modified_length 
              ? `（原长度：${message.original_length}字符，现长度：${message.modified_length}字符）` 
              : ''
          }`
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-4 w-4" />,
          title: '处理错误',
          description: message.message || '处理回答时发生错误'
        };
      default:
        return {
          variant: 'default' as const,
          icon: <Info className="h-4 w-4" />,
          title: '系统提示',
          description: message.message || '有关此回答的提示'
        };
    }
  };

  const props = getAlertProps();

  return (
    <Alert variant={props.variant}>
      <div className="flex items-center gap-2">
        {props.icon}
        <AlertTitle>{props.title}</AlertTitle>
      </div>
      <AlertDescription className="mt-1">
        {props.description}
      </AlertDescription>
    </Alert>
  );
}

/**
 * 示例：如何在流式接收中处理审核消息
 * 
 * ```tsx
 * // 流式接收示例
 * useEffect(() => {
 *   if (!question) return;
 *   
 *   const fetchStreamingAnswer = async () => {
 *     setIsLoading(true);
 *     
 *     try {
 *       const response = await fetch('/api/ai/ask/answer/stream', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ 
 *           question_text: question,
 *           chat_id: chatId,
 *           context: relevantContext
 *         })
 *       });
 *       
 *       const reader = response.body?.getReader();
 *       if (!reader) throw new Error('无法获取响应流');
 *       
 *       const decoder = new TextDecoder();
 *       let answer = '';
 *       let moderationMessages: ModerationMessage[] = [];
 *       
 *       while (true) {
 *         const { done, value } = await reader.read();
 *         if (done) break;
 *         
 *         const text = decoder.decode(value);
 *         const lines = text.split('\n\n');
 *         
 *         for (const line of lines) {
 *           if (!line.trim() || !line.startsWith('data:')) continue;
 *           
 *           // 检查是否为结束标记
 *           if (line.includes('[DONE]')) continue;
 *           
 *           // 解析数据
 *           const data = line.replace('data: ', '');
 *           
 *           // 检查是否为审核消息
 *           if (isModerationMessage(data)) {
 *             const moderationMsg = parseModerationMessage(line);
 *             if (moderationMsg) {
 *               moderationMessages.push(moderationMsg);
 *             }
 *           } else {
 *             // 常规内容
 *             try {
 *               const json = JSON.parse(data);
 *               if (json.content) {
 *                 answer += json.content;
 *                 setCurrentAnswer(answer);
 *               }
 *             } catch (e) {
 *               console.error('解析JSON失败:', e);
 *             }
 *           }
 *         }
 *       }
 *       
 *       // 处理所有审核消息
 *       if (moderationMessages.length > 0) {
 *         setModerationAlerts(moderationMessages);
 *       }
 *       
 *     } catch (error) {
 *       console.error('获取流式回答失败:', error);
 *       setError('获取回答时出错，请稍后重试');
 *     } finally {
 *       setIsLoading(false);
 *     }
 *   };
 *   
 *   fetchStreamingAnswer();
 * }, [question, chatId, relevantContext]);
 * ```
 */ 