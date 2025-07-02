import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TodayProgress {
  planned_hours: number
  actual_hours: number
  completed_tasks: string[]
  subjects_studied: string[]
  notes_created: number
  questions_practiced: number
  completion_rate: number
}

interface StudySession {
  id: number | null
  subject: string | null
  startTime: Date | null
  endTime: Date | null
  activityType: string | null
  duration: number // 分钟
  completed: boolean
}

interface StudySessionStore {
  // 当前学习会话
  activeSession: StudySession | null
  
  // 今日进度
  todayProgress: TodayProgress
  
  // 会话历史
  sessionHistory: StudySession[]
  
  // UI状态
  isLoading: boolean
  error: string | null
  
  // 会话管理
  startStudySession: (subject: string, activityType: string) => void
  endStudySession: () => void
  pauseSession: () => void
  resumeSession: () => void
  
  // 进度更新
  updateTodayProgress: (progress: Partial<TodayProgress>) => void
  resetTodayProgress: () => void
  addCompletedTask: (task: string) => void
  addSubjectStudied: (subject: string) => void
  incrementNotesCreated: () => void
  incrementQuestionsAnswered: () => void
  
  // 数据获取
  loadTodayProgress: () => Promise<void>
  saveTodayProgress: () => Promise<void>
  
  // 快捷访问
  getTodayTasks: () => string[]
  getCurrentSubject: () => string | null
  getSessionDuration: () => number
  calculateCompletionRate: () => number
  
  // 状态管理
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useStudySessionStore = create<StudySessionStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      activeSession: null,
      todayProgress: {
        planned_hours: 0,
        actual_hours: 0,
        completed_tasks: [],
        subjects_studied: [],
        notes_created: 0,
        questions_practiced: 0,
        completion_rate: 0
      },
      sessionHistory: [],
      isLoading: false,
      error: null,
      
      // 会话管理
      startStudySession: (subject: string, activityType: string) => {
        const newSession: StudySession = {
          id: Date.now(),
          subject,
          startTime: new Date(),
          endTime: null,
          activityType,
          duration: 0,
          completed: false
        }
        
        set({ activeSession: newSession })
      },
      
      endStudySession: () => {
        const session = get().activeSession
        if (!session || !session.startTime) return
        
        const endTime = new Date()
        const duration = Math.round((endTime.getTime() - session.startTime.getTime()) / 60000) // 分钟
        
        const completedSession: StudySession = {
          ...session,
          endTime,
          duration,
          completed: true
        }
        
        set(state => ({
          activeSession: null,
          sessionHistory: [...state.sessionHistory, completedSession],
          todayProgress: {
            ...state.todayProgress,
            actual_hours: state.todayProgress.actual_hours + (duration / 60),
            subjects_studied: session.subject && !state.todayProgress.subjects_studied.includes(session.subject)
              ? [...state.todayProgress.subjects_studied, session.subject]
              : state.todayProgress.subjects_studied
          }
        }))
        
        // 自动保存进度
        get().saveTodayProgress()
      },
      
      pauseSession: () => {
        // 暂停功能暂不实现，可以后续扩展
      },
      
      resumeSession: () => {
        // 恢复功能暂不实现，可以后续扩展
      },
      
      // 进度更新
      updateTodayProgress: (progress: Partial<TodayProgress>) => {
        set(state => ({
          todayProgress: { ...state.todayProgress, ...progress }
        }))
        
        // 重新计算完成率
        const newState = get()
        const completionRate = newState.calculateCompletionRate()
        set(state => ({
          todayProgress: { ...state.todayProgress, completion_rate: completionRate }
        }))
      },
      
      resetTodayProgress: () => {
        set({
          todayProgress: {
            planned_hours: 0,
            actual_hours: 0,
            completed_tasks: [],
            subjects_studied: [],
            notes_created: 0,
            questions_practiced: 0,
            completion_rate: 0
          }
        })
      },
      
      addCompletedTask: (task: string) => {
        set(state => ({
          todayProgress: {
            ...state.todayProgress,
            completed_tasks: [...state.todayProgress.completed_tasks, task]
          }
        }))
      },
      
      addSubjectStudied: (subject: string) => {
        set(state => {
          if (!state.todayProgress.subjects_studied.includes(subject)) {
            return {
              todayProgress: {
                ...state.todayProgress,
                subjects_studied: [...state.todayProgress.subjects_studied, subject]
              }
            }
          }
          return state
        })
      },
      
      incrementNotesCreated: () => {
        set(state => ({
          todayProgress: {
            ...state.todayProgress,
            notes_created: state.todayProgress.notes_created + 1
          }
        }))
      },
      
      incrementQuestionsAnswered: () => {
        set(state => ({
          todayProgress: {
            ...state.todayProgress,
            questions_practiced: state.todayProgress.questions_practiced + 1
          }
        }))
      },
      
      // 数据加载
      loadTodayProgress: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/study/progress/today')
          if (!response.ok) {
            throw new Error('获取今日进度失败')
          }
          
          const data = await response.json()
          set({
            todayProgress: data.progress,
            isLoading: false
          })
        } catch (error) {
          console.error('加载今日进度失败:', error)
          set({
            error: error instanceof Error ? error.message : '未知错误',
            isLoading: false
          })
        }
      },
      
      saveTodayProgress: async () => {
        const progress = get().todayProgress
        
        try {
          await fetch('/api/study/progress/today', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progress })
          })
        } catch (error) {
          console.error('保存今日进度失败:', error)
        }
      },
      
      // 快捷访问
      getTodayTasks: () => {
        return get().todayProgress.completed_tasks
      },
      
      getCurrentSubject: () => {
        return get().activeSession?.subject || null
      },
      
      getSessionDuration: () => {
        const session = get().activeSession
        if (!session || !session.startTime) return 0
        
        return Math.round((Date.now() - session.startTime.getTime()) / 60000) // 分钟
      },
      
      calculateCompletionRate: () => {
        const progress = get().todayProgress
        if (progress.planned_hours === 0) return 0
        
        return Math.min(100, Math.round((progress.actual_hours / progress.planned_hours) * 100))
      },
      
      // 状态管理
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'study-session-store',
      partialize: (state) => ({
        todayProgress: state.todayProgress,
        sessionHistory: state.sessionHistory.slice(-10), // 只保存最近10个会话
        activeSession: state.activeSession
      })
    }
  )
)