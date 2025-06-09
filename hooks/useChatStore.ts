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

// 对话接口
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// 聊天状态接口
interface ChatState {
  // 当前对话
  currentConversationId: string | null;
  conversations: Conversation[];
  
  // 消息操作（针对当前对话）
  messages: ChatMessage[];                  // 当前对话的消息列表
  addMessage: (message: ChatMessage) => void;                // 添加新消息
  updateMessage: (id: string, update: Partial<ChatMessage>) => void; // 更新现有消息
  deleteMessage: (id: string) => void;      // 删除消息
  clearMessages: () => void;                // 清空当前对话的所有消息
  
  // 对话操作
  createNewConversation: () => string;      // 创建新对话，返回对话ID
  switchConversation: (id: string) => void; // 切换对话
  deleteConversation: (id: string) => void; // 删除对话
  updateConversationTitle: (id: string, title: string) => void; // 更新对话标题
}

// 创建状态管理存储
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentConversationId: null,
      conversations: [],
      messages: [],  // 当前对话的消息
      
      // 添加新消息到当前对话
      addMessage: (message) => set((state) => {
        if (!state.currentConversationId) return state;
        
        const currentConv = state.conversations.find(c => c.id === state.currentConversationId);
        if (!currentConv) return state;
        
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        return {
          messages: [...state.messages, message],
          conversations: updatedConversations
        };
      }),
      
      // 更新现有消息
      updateMessage: (id, update) => set((state) => {
        console.log('🔄 更新消息:', { id, update, messageCount: state.messages.length });
        
        const updatedMessages = state.messages.map((msg) => 
          msg.id === id ? { ...msg, ...update } : msg
        );
        
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: conv.messages.map((msg) => 
                msg.id === id ? { ...msg, ...update } : msg
              ),
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        return {
          messages: updatedMessages,
          conversations: updatedConversations
        };
      }),
      
      // 删除消息
      deleteMessage: (id) => set((state) => {
        const updatedMessages = state.messages.filter((msg) => msg.id !== id);
        
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: conv.messages.filter((msg) => msg.id !== id),
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        return {
          messages: updatedMessages,
          conversations: updatedConversations
        };
      }),
      
      // 清空当前对话的所有消息
      clearMessages: () => set((state) => {
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: [],
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        return {
          messages: [],
          conversations: updatedConversations
        };
      }),
      
      // 创建新对话
      createNewConversation: () => {
        const newId = `conv-${Date.now()}`;
        const newConversation: Conversation = {
          id: newId,
          title: '新对话',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newId,
          messages: []
        }));
        
        return newId;
      },
      
      // 切换对话
      switchConversation: (id) => set((state) => {
        const conversation = state.conversations.find(c => c.id === id);
        if (!conversation) return state;
        
        return {
          currentConversationId: id,
          messages: conversation.messages
        };
      }),
      
      // 删除对话
      deleteConversation: (id) => set((state) => {
        const updatedConversations = state.conversations.filter(c => c.id !== id);
        const isCurrentConversation = state.currentConversationId === id;
        
        return {
          conversations: updatedConversations,
          currentConversationId: isCurrentConversation ? null : state.currentConversationId,
          messages: isCurrentConversation ? [] : state.messages
        };
      }),
      
      // 更新对话标题
      updateConversationTitle: (id, title) => set((state) => ({
        conversations: state.conversations.map(conv => 
          conv.id === id ? { ...conv, title, updatedAt: new Date().toISOString() } : conv
        )
      }))
    }),
    {
      name: 'law-chat-storage', // 本地存储的键名
      partialize: (state) => ({ 
        conversations: state.conversations,
        currentConversationId: state.currentConversationId
      }), // 持久化对话数据
    }
  )
); 