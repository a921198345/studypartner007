import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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

interface TodayProgress {
  planned_hours: number
  actual_hours: number
  completed_tasks: string[]
  subjects_studied: string[]
  notes_created: number
  questions_practiced: number
  completion_rate: number
}

interface StudyPlanStore {
  // 当前活跃计划
  currentPlan: StudyPlan | null
  setCurrentPlan: (plan: StudyPlan | null) => void
  
  // 用户偏好
  userPreferences: UserPreferences
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  
  // 计划历史
  planHistory: StudyPlan[]
  addToPlanHistory: (plan: StudyPlan) => void
  clearPlanHistory: () => void
  
  // 今日进度
  todayProgress: TodayProgress
  updateTodayProgress: (progress: Partial<TodayProgress>) => void
  resetTodayProgress: () => void
  
  // 学习会话
  activeSession: {
    id: number | null
    subject: string | null
    startTime: Date | null
    activityType: string | null
  }
  startStudySession: (subject: string, activityType: string) => void
  endStudySession: () => void
  
  // 计划相关操作
  loadActivePlan: () => Promise<void>
  savePlanProgress: () => Promise<void>
  
  // UI状态
  isLoading: boolean
  error: string | null
  
  // 快捷访问
  getTodayTasks: () => string[]
  getCurrentSubject: () => string | null
  getNextMilestone: () => string | null
  
  // 离线支持
  offlineQueue: any[]
  addToOfflineQueue: (action: any) => void
  syncOfflineQueue: () => Promise<void>
}

export const useStudyPlanStore = create<StudyPlanStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentPlan: null,
      userPreferences: {
        daily_hours: 3,
        weekly_days: 5,
        order_method: 'manual'
      },
      planHistory: [],
      todayProgress: {
        planned_hours: 0,
        actual_hours: 0,
        completed_tasks: [],
        subjects_studied: [],
        notes_created: 0,
        questions_practiced: 0,
        completion_rate: 0
      },
      activeSession: {
        id: null,
        subject: null,
        startTime: null,
        activityType: null
      },
      isLoading: false,
      error: null,
      offlineQueue: [],

      // 设置当前计划
      setCurrentPlan: (plan) => set({ currentPlan: plan }),

      // 更新用户偏好
      updatePreferences: (prefs) => set((state) => ({
        userPreferences: { ...state.userPreferences, ...prefs }
      })),

      // 添加到计划历史
      addToPlanHistory: (plan) => set((state) => ({
        planHistory: [plan, ...state.planHistory].slice(0, 10) // 保留最近10个
      })),

      // 清空计划历史
      clearPlanHistory: () => set({ planHistory: [] }),

      // 更新今日进度
      updateTodayProgress: (progress) => set((state) => ({
        todayProgress: { ...state.todayProgress, ...progress }
      })),

      // 重置今日进度
      resetTodayProgress: () => set({
        todayProgress: {
          planned_hours: 0,
          actual_hours: 0,
          completed_tasks: [],
          subjects_studied: [],
          notes_created: 0,
          questions_practiced: 0,
          completion_rate: 0
        }
      }),

      // 开始学习会话
      startStudySession: (subject, activityType) => {
        const startTime = new Date()
        set({
          activeSession: {
            id: Date.now(),
            subject,
            startTime,
            activityType
          }
        })
        
        // 更新今日进度
        set((state) => ({
          todayProgress: {
            ...state.todayProgress,
            subjects_studied: state.todayProgress.subjects_studied.includes(subject)
              ? state.todayProgress.subjects_studied
              : [...state.todayProgress.subjects_studied, subject]
          }
        }))
      },

      // 结束学习会话
      endStudySession: () => {
        const { activeSession } = get()
        if (activeSession.startTime) {
          const duration = (Date.now() - activeSession.startTime.getTime()) / 1000 / 60 / 60
          set((state) => ({
            todayProgress: {
              ...state.todayProgress,
              actual_hours: state.todayProgress.actual_hours + duration
            },
            activeSession: {
              id: null,
              subject: null,
              startTime: null,
              activityType: null
            }
          }))
        }
      },

      // 加载活跃计划
      loadActivePlan: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/study-plan/active')
          if (response.ok) {
            const data = await response.json()
            set({ currentPlan: data.plan })
            
            // 更新今日计划时长
            if (data.plan) {
              set((state) => ({
                todayProgress: {
                  ...state.todayProgress,
                  planned_hours: data.plan.schedule_settings.daily_hours
                }
              }))
            }
          }
        } catch (error) {
          set({ error: '加载计划失败' })
        } finally {
          set({ isLoading: false })
        }
      },

      // 保存计划进度
      savePlanProgress: async () => {
        const { currentPlan, todayProgress } = get()
        if (!currentPlan) return

        try {
          await fetch('/api/study-plan/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan_id: currentPlan.id,
              progress: todayProgress
            })
          })
        } catch (error) {
          // 添加到离线队列
          get().addToOfflineQueue({
            type: 'save_progress',
            data: { plan_id: currentPlan.id, progress: todayProgress }
          })
        }
      },

      // 获取今日任务
      getTodayTasks: () => {
        const { currentPlan } = get()
        if (!currentPlan) return []

        // 从日计划中提取今日任务
        const dailyPlan = currentPlan.content.daily_plan
        const taskMatches = dailyPlan.match(/[-•]\s*(.+)/g) || []
        return taskMatches.map(task => task.replace(/[-•]\s*/, '').trim())
      },

      // 获取当前学习科目
      getCurrentSubject: () => {
        const { currentPlan, todayProgress } = get()
        if (!currentPlan) return null

        // 根据科目顺序和已学习科目确定当前科目
        const studied = new Set(todayProgress.subjects_studied)
        return currentPlan.subjects_order.find(subject => !studied.has(subject)) || null
      },

      // 获取下一个里程碑
      getNextMilestone: () => {
        const { currentPlan } = get()
        if (!currentPlan) return null

        const milestones = currentPlan.metadata.key_milestones
        // 简单返回第一个未完成的里程碑
        return milestones[0] || null
      },

      // 添加到离线队列
      addToOfflineQueue: (action) => set((state) => ({
        offlineQueue: [...state.offlineQueue, action]
      })),

      // 同步离线队列
      syncOfflineQueue: async () => {
        const { offlineQueue } = get()
        if (offlineQueue.length === 0) return

        const failedActions = []
        
        for (const action of offlineQueue) {
          try {
            if (action.type === 'save_progress') {
              await fetch('/api/study-plan/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.data)
              })
            }
            // 处理其他类型的离线操作
          } catch (error) {
            failedActions.push(action)
          }
        }

        set({ offlineQueue: failedActions })
      }
    }),
    {
      name: 'study-plan-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        todayProgress: state.todayProgress,
        planHistory: state.planHistory,
        offlineQueue: state.offlineQueue
      })
    }
  )
)

// 辅助hooks
export const useStudyPlan = () => {
  const plan = useStudyPlanStore((state) => state.currentPlan)
  const isLoading = useStudyPlanStore((state) => state.isLoading)
  const error = useStudyPlanStore((state) => state.error)
  
  return { plan, isLoading, error }
}

export const useTodayProgress = () => {
  const progress = useStudyPlanStore((state) => state.todayProgress)
  const updateProgress = useStudyPlanStore((state) => state.updateTodayProgress)
  
  return { progress, updateProgress }
}

export const useStudySession = () => {
  const activeSession = useStudyPlanStore((state) => state.activeSession)
  const startSession = useStudyPlanStore((state) => state.startStudySession)
  const endSession = useStudyPlanStore((state) => state.endStudySession)
  
  return {
    isActive: activeSession.id !== null,
    session: activeSession,
    start: startSession,
    end: endSession
  }
}