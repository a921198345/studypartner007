import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 聊天消息接口
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant'; // 用户或AI助手
  content: string;           // 消息内容
  timestamp: string;         // 时间戳
  imageBase64?: string;      // 可选的图片数据
  isError?: boolean;         // 是否是错误消息
}

// 聊天状态接口
interface ChatState {
  messages: ChatMessage[];                  // 消息列表
  addMessage: (message: ChatMessage) => void;                // 添加新消息
  updateMessage: (id: string, update: Partial<ChatMessage>) => void; // 更新现有消息
  deleteMessage: (id: string) => void;      // 删除消息
  clearMessages: () => void;                // 清空所有消息
}

// 创建状态管理存储
export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],  // 初始为空，避免水合错误
      
      // 添加新消息
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      
      // 更新现有消息
      updateMessage: (id, update) => set((state) => {
        console.log('🔄 更新消息:', { id, update, messageCount: state.messages.length });
        return {
          messages: state.messages.map((msg) => 
            msg.id === id ? { ...msg, ...update } : msg
          )
        };
      }),
      
      // 删除消息
      deleteMessage: (id) => set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== id)
      })),
      
      // 清空所有消息
      clearMessages: () => set({
        messages: []
      })
    }),
    {
      name: 'law-chat-storage', // 本地存储的键名
      partialize: (state) => ({ messages: state.messages }), // 只持久化消息数据
    }
  )
); 