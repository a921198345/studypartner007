import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  user_id: number
  phone_number: string
  nickname?: string
  created_at?: string
}

interface MembershipInfo {
  type: 'free_user' | 'active_member'
  expires_at?: string
  remaining_queries?: number
  daily_queries_used?: number
  daily_limit?: number
}

interface UserStore {
  // 认证状态
  isAuthenticated: boolean
  token: string | null
  
  // 用户信息
  user: User | null
  membership: MembershipInfo | null
  
  // UI状态
  isLoading: boolean
  error: string | null
  
  // 认证操作
  login: (token: string, user: User) => void
  logout: () => void
  
  // 用户信息操作
  updateUser: (user: Partial<User>) => void
  setMembership: (membership: MembershipInfo) => void
  
  // 会员状态检查
  isPremiumUser: () => boolean
  canMakeQuery: () => boolean
  
  // 数据加载
  loadUserData: () => Promise<void>
  refreshMembership: () => Promise<void>
  
  // 状态重置
  clearError: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      token: null,
      user: null,
      membership: null,
      isLoading: false,
      error: null,
      
      // 认证操作
      login: (token: string, user: User) => {
        set({
          isAuthenticated: true,
          token,
          user,
          error: null
        })
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          token: null,
          user: null,
          membership: null,
          error: null
        })
        // 清理localStorage中的token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token')
        }
      },
      
      // 用户信息操作
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },
      
      setMembership: (membership: MembershipInfo) => {
        set({ membership })
      },
      
      // 会员状态检查
      isPremiumUser: () => {
        const membership = get().membership
        return membership?.type === 'active_member'
      },
      
      canMakeQuery: () => {
        const membership = get().membership
        if (!membership) return false
        
        if (membership.type === 'active_member') return true
        
        // 免费用户检查每日限制
        const dailyUsed = membership.daily_queries_used || 0
        const dailyLimit = membership.daily_limit || 5
        return dailyUsed < dailyLimit
      },
      
      // 数据加载
      loadUserData: async () => {
        const token = get().token
        if (!token) return
        
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) {
            throw new Error('获取用户信息失败')
          }
          
          const data = await response.json()
          
          set({
            user: data.user,
            membership: data.membership,
            isLoading: false
          })
        } catch (error) {
          console.error('加载用户数据失败:', error)
          set({
            error: error instanceof Error ? error.message : '未知错误',
            isLoading: false
          })
        }
      },
      
      refreshMembership: async () => {
        const token = get().token
        if (!token) return
        
        try {
          const response = await fetch('/api/auth/membership', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) return
          
          const data = await response.json()
          set({ membership: data.membership })
        } catch (error) {
          console.error('刷新会员信息失败:', error)
        }
      },
      
      // 状态管理
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error })
    }),
    {
      name: 'user-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        user: state.user,
        membership: state.membership
      })
    }
  )
)