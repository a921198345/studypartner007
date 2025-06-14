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
  cleanupEmptyConversations: () => void;    // 清理空对话
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
        // console.log('📝 添加消息:', { messageId: message.id, role: message.role });
        
        if (!state.currentConversationId) {
          // console.warn('没有当前对话ID');
          return state;
        }
        
        const currentConv = state.conversations.find(c => c.id === state.currentConversationId);
        if (!currentConv) {
          // console.warn('找不到当前对话');
          return state;
        }
        
        // 更新对话中的消息
        const updatedMessages = [...currentConv.messages, message];
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: updatedMessages,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        // console.log('📝 消息添加完成，当前消息数:', updatedMessages.length);
        
        return {
          messages: updatedMessages, // 确保使用更新后的消息列表
          conversations: updatedConversations
        };
      }),
      
      // 更新现有消息
      updateMessage: (id, update) => set((state) => {
        // console.log('🔄 更新消息:', { id, update: update.content?.substring(0, 50), messageCount: state.messages.length });
        
        // 找到当前对话
        const currentConv = state.conversations.find(c => c.id === state.currentConversationId);
        if (!currentConv) {
          // console.warn('更新消息时找不到当前对话');
          return state;
        }
        
        // 更新对话中的消息
        const updatedMessages = currentConv.messages.map((msg) => 
          msg.id === id ? { ...msg, ...update } : msg
        );
        
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === state.currentConversationId) {
            return {
              ...conv,
              messages: updatedMessages,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        
        // console.log('🔄 消息更新完成，更新后消息数:', updatedMessages.length);
        
        return {
          messages: updatedMessages, // 确保使用更新后的消息列表
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
      })),
      
      // 清理空对话
      cleanupEmptyConversations: () => set((state) => {
        // 过滤掉没有实质内容的对话
        const updatedConversations = state.conversations.filter(conv => {
          // 如果没有消息，直接过滤掉
          if (conv.messages.length === 0) {
            return false;
          }
          
          // 保留有实质内容的对话（至少有一条用户消息，且用户消息不为空）
          const hasValidUserMessage = conv.messages.some(msg => 
            msg.role === 'user' && msg.content && msg.content.trim().length > 0
          );
          
          // 只保留有有效用户消息的对话
          return hasValidUserMessage;
        });
        
        // 如果当前对话被清理了，重置当前对话ID
        const currentConvExists = updatedConversations.some(c => c.id === state.currentConversationId);
        
        return {
          conversations: updatedConversations,
          currentConversationId: currentConvExists ? state.currentConversationId : null,
          messages: currentConvExists ? state.messages : []
        };
      })
    }),
    {
      name: 'law-chat-storage', // 本地存储的键名
      partialize: (state) => {
        // 限制只保存最近的 10 个对话
        const MAX_CONVERSATIONS = 10;
        const sortedConversations = [...state.conversations]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, MAX_CONVERSATIONS);
        
        return {
          // 只持久化对话元数据，不包含图片
          conversations: sortedConversations.map(conv => ({
            ...conv,
            messages: conv.messages.map(msg => ({
              ...msg,
              // 保留图片标记但不存储实际数据
              imageBase64: msg.imageBase64 ? 'IMAGE_PLACEHOLDER' : undefined,
              // 保存完整内容，避免影响按钮显示
              content: msg.content
            }))
          })),
          // 不保存当前对话ID，每次都从新对话开始
          currentConversationId: null
        };
      }, // 持久化对话数据（不包含图片）
    }
  )
); 