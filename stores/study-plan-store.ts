import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StudyPlan {
  id: number
  plan_type: 'comprehensive' | 'weekly' | 'daily'
  content: {
    overall_strategy: string
    daily_plan: string
    weekly_plan: string
  }
  metadata: {
    generated_at: string
    total_hours: number
    estimated_duration_weeks: number
    key_milestones: string[]
  }
  subjects_order: string[]
  schedule_settings: {
    daily_hours: number
    weekly_days: number
    rest_days: number
    preferred_times?: string[]
    break_frequency?: number
  }
  status: 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

interface UserPreferences {
  daily_hours: number
  weekly_days: number
  order_method: 'ai' | 'manual'
  learning_style?: string
  difficulty_preference?: string
  review_frequency?: string
}

interface StudyPlanStore {
  // 核心状态
  currentPlan: StudyPlan | null
  userPreferences: UserPreferences
  planHistory: StudyPlan[]
  
  // UI状态
  isLoading: boolean
  error: string | null
  
  // 计划管理
  setCurrentPlan: (plan: StudyPlan | null) => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  addToPlanHistory: (plan: StudyPlan) => void
  clearPlanHistory: () => void
  
  // 数据操作
  loadActivePlan: () => Promise<void>
  savePlan: (plan: StudyPlan) => Promise<void>
  generateNewPlan: (preferences: UserPreferences) => Promise<void>
  
  // 快捷访问
  getNextMilestone: () => string | null
  isActivePlanExpired: () => boolean
  
  // 状态管理
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useStudyPlanStore = create<StudyPlanStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentPlan: null,
      userPreferences: {
        daily_hours: 3,
        weekly_days: 5,
        order_method: 'ai'
      },
      planHistory: [],
      isLoading: false,
      error: null,
      
      // 计划管理
      setCurrentPlan: (plan: StudyPlan | null) => {
        set({ currentPlan: plan })
      },
      
      updatePreferences: (prefs: Partial<UserPreferences>) => {
        set(state => ({
          userPreferences: { ...state.userPreferences, ...prefs }
        }))
      },
      
      addToPlanHistory: (plan: StudyPlan) => {
        set(state => ({
          planHistory: [plan, ...state.planHistory.slice(0, 9)] // 只保留最近10个
        }))
      },
      
      clearPlanHistory: () => {
        set({ planHistory: [] })
      },
      
      // 数据操作
      loadActivePlan: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/study-plan/active')
          if (!response.ok) {
            throw new Error('获取学习计划失败')
          }
          
          const data = await response.json()
          set({
            currentPlan: data.plan,
            isLoading: false
          })
        } catch (error) {
          console.error('加载学习计划失败:', error)
          set({
            error: error instanceof Error ? error.message : '未知错误',
            isLoading: false
          })
        }
      },
      
      savePlan: async (plan: StudyPlan) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/study-plan/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan })
          })
          
          if (!response.ok) {
            throw new Error('保存学习计划失败')
          }
          
          const data = await response.json()
          set({
            currentPlan: data.plan,
            isLoading: false
          })
          
          // 添加到历史记录
          get().addToPlanHistory(data.plan)
        } catch (error) {
          console.error('保存学习计划失败:', error)
          set({
            error: error instanceof Error ? error.message : '未知错误',
            isLoading: false
          })
        }
      },
      
      generateNewPlan: async (preferences: UserPreferences) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/study-plan/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ preferences })
          })
          
          if (!response.ok) {
            throw new Error('生成学习计划失败')
          }
          
          const data = await response.json()
          set({
            currentPlan: data.plan,
            userPreferences: preferences,
            isLoading: false
          })
          
          // 添加到历史记录
          get().addToPlanHistory(data.plan)
        } catch (error) {
          console.error('生成学习计划失败:', error)
          set({
            error: error instanceof Error ? error.message : '未知错误',
            isLoading: false
          })
        }
      },
      
      // 快捷访问
      getNextMilestone: () => {
        const plan = get().currentPlan
        if (!plan || !plan.metadata.key_milestones.length) return null
        
        // 这里可以添加更复杂的逻辑来确定下一个里程碑
        return plan.metadata.key_milestones[0]
      },
      
      isActivePlanExpired: () => {
        const plan = get().currentPlan
        if (!plan) return false
        
        const planDate = new Date(plan.created_at)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // 如果计划超过30天，认为已过期
        return daysDiff > 30
      },
      
      // 状态管理
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'study-plan-store',
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        userPreferences: state.userPreferences,
        planHistory: state.planHistory
      })
    }
  )
)