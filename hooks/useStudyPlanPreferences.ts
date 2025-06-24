"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { debounce } from 'lodash'
import { toast } from '@/components/ui/use-toast'

interface UserPreferences {
  daily_hours: number
  weekly_days: number
  order_method: 'ai' | 'manual'
  learning_style?: string
  difficulty_preference?: string
  review_frequency?: string
}

interface SubjectProgress {
  subject: string
  status: 'completed' | 'in_progress' | 'not_started'
  progress: number
  chapters_completed: number
  total_chapters: number
}

interface UseStudyPlanPreferencesReturn {
  preferences: UserPreferences
  subjectsProgress: SubjectProgress[]
  isLoading: boolean
  isAutoSaving: boolean
  updatePreferences: (updates: Partial<UserPreferences>) => void
  updateSubjectsProgress: (progress: SubjectProgress[]) => void
  resetPreferences: () => void
  refreshData: () => Promise<void>
}

export function useStudyPlanPreferences(): UseStudyPlanPreferencesReturn {
  const { data: session } = useSession()
  
  // 默认偏好设置
  const defaultPreferences: UserPreferences = {
    daily_hours: 3,
    weekly_days: 5,
    order_method: 'manual',
    learning_style: undefined,
    difficulty_preference: undefined,
    review_frequency: undefined
  }

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [subjectsProgress, setSubjectsProgress] = useState<SubjectProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAutoSaving, setIsAutoSaving] = useState(false)

  // 从服务器加载用户偏好和进度
  const loadUserData = useCallback(async () => {
    if (!session?.user) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/study-plan/preferences')
      
      if (response.ok) {
        const data = await response.json()
        
        // 合并默认值和用户数据
        setPreferences({
          ...defaultPreferences,
          ...data.preferences
        })
        
        setSubjectsProgress(data.subjects_progress || [])
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast({
        title: '加载失败',
        description: '无法加载您的学习偏好设置',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [session])

  // 初始加载
  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // 创建防抖的保存函数
  const debouncedSavePreferences = useCallback(
    debounce(async (updates: Partial<UserPreferences>) => {
      if (!session?.user) return

      try {
        setIsAutoSaving(true)
        
        const response = await fetch('/api/study-plan/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        })

        if (!response.ok) {
          throw new Error('保存失败')
        }

        toast({
          title: '自动保存成功',
          description: '您的偏好设置已更新',
          duration: 2000
        })
      } catch (error) {
        console.error('Failed to save preferences:', error)
        toast({
          title: '保存失败',
          description: '无法保存您的偏好设置',
          variant: 'destructive'
        })
      } finally {
        setIsAutoSaving(false)
      }
    }, 1000),
    [session]
  )

  // 创建防抖的进度保存函数
  const debouncedSaveProgress = useCallback(
    debounce(async (progress: SubjectProgress[]) => {
      if (!session?.user) return

      try {
        setIsAutoSaving(true)
        
        const response = await fetch('/api/study-plan/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subjects_progress: progress })
        })

        if (!response.ok) {
          throw new Error('保存失败')
        }
      } catch (error) {
        console.error('Failed to save progress:', error)
        toast({
          title: '保存失败',
          description: '无法保存您的学习进度',
          variant: 'destructive'
        })
      } finally {
        setIsAutoSaving(false)
      }
    }, 2000),
    [session]
  )

  // 更新偏好设置（带自动保存）
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates }
      
      // 触发自动保存
      debouncedSavePreferences(updates)
      
      return newPreferences
    })
  }, [debouncedSavePreferences])

  // 更新科目进度（带自动保存）
  const updateSubjectsProgress = useCallback((progress: SubjectProgress[]) => {
    setSubjectsProgress(progress)
    
    // 触发自动保存
    debouncedSaveProgress(progress)
  }, [debouncedSaveProgress])

  // 重置偏好设置
  const resetPreferences = useCallback(async () => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/study-plan/preferences', {
        method: 'DELETE'
      })

      if (response.ok) {
        setPreferences(defaultPreferences)
        toast({
          title: '重置成功',
          description: '偏好设置已恢复为默认值'
        })
      }
    } catch (error) {
      console.error('Failed to reset preferences:', error)
      toast({
        title: '重置失败',
        description: '无法重置偏好设置',
        variant: 'destructive'
      })
    }
  }, [session])

  // 手动刷新数据
  const refreshData = useCallback(async () => {
    await loadUserData()
  }, [loadUserData])

  return {
    preferences,
    subjectsProgress,
    isLoading,
    isAutoSaving,
    updatePreferences,
    updateSubjectsProgress,
    resetPreferences,
    refreshData
  }
}

// 辅助函数：验证时间设置的合理性
export function validateTimeSettings(
  dailyHours: number,
  weeklyDays: number,
  userHistory?: {
    avgDailyHours?: number
    maxDailyHours?: number
    consistency?: number
  }
): {
  isValid: boolean
  warnings: string[]
  suggestions: string[]
} {
  const warnings: string[] = []
  const suggestions: string[] = []

  // 基础验证
  if (dailyHours < 1 || dailyHours > 12) {
    warnings.push('每日学习时间应在1-12小时之间')
  }

  if (weeklyDays < 1 || weeklyDays > 7) {
    warnings.push('每周学习天数应在1-7天之间')
  }

  // 根据历史数据验证
  if (userHistory) {
    // 检查是否超过历史最大值太多
    if (userHistory.maxDailyHours && dailyHours > userHistory.maxDailyHours * 1.5) {
      warnings.push(`您的历史最高学习时长为${userHistory.maxDailyHours}小时，建议循序渐进`)
      suggestions.push(`建议先设置为${Math.min(dailyHours, userHistory.maxDailyHours * 1.2)}小时`)
    }

    // 检查是否与平均值差距太大
    if (userHistory.avgDailyHours && Math.abs(dailyHours - userHistory.avgDailyHours) > 3) {
      suggestions.push(`您的平均学习时长为${userHistory.avgDailyHours.toFixed(1)}小时`)
    }

    // 根据完成率给建议
    if (userHistory.consistency && userHistory.consistency < 0.7 && dailyHours > 5) {
      suggestions.push('建议先保证学习的连续性，再逐步增加时长')
    }
  }

  // 通用建议
  if (dailyHours > 8) {
    suggestions.push('长时间学习请注意适当休息，保持效率')
  }

  if (weeklyDays === 7 && dailyHours > 5) {
    suggestions.push('高强度学习建议每周至少安排1天休息')
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  }
}

// 辅助函数：分析学习习惯
export function analyzeStudyHabits(
  studyRecords: Array<{
    date: string
    planned_hours: number
    actual_hours: number
    completion_rate: number
    subjects: string[]
  }>
): {
  avgDailyHours: number
  maxDailyHours: number
  consistency: number
  preferredTimes: string[]
  strongSubjects: string[]
  weakSubjects: string[]
  suggestions: string[]
} {
  if (studyRecords.length === 0) {
    return {
      avgDailyHours: 0,
      maxDailyHours: 0,
      consistency: 0,
      preferredTimes: [],
      strongSubjects: [],
      weakSubjects: [],
      suggestions: ['开始记录您的学习数据，以获得个性化建议']
    }
  }

  // 计算平均和最大学习时长
  const actualHours = studyRecords.map(r => r.actual_hours)
  const avgDailyHours = actualHours.reduce((a, b) => a + b, 0) / actualHours.length
  const maxDailyHours = Math.max(...actualHours)

  // 计算学习连续性（完成率）
  const completionRates = studyRecords.map(r => r.completion_rate)
  const consistency = completionRates.reduce((a, b) => a + b, 0) / completionRates.length

  // 分析科目表现
  const subjectPerformance = new Map<string, { count: number; avgCompletion: number }>()
  
  studyRecords.forEach(record => {
    record.subjects.forEach(subject => {
      const current = subjectPerformance.get(subject) || { count: 0, avgCompletion: 0 }
      current.count++
      current.avgCompletion = 
        (current.avgCompletion * (current.count - 1) + record.completion_rate) / current.count
      subjectPerformance.set(subject, current)
    })
  })

  // 识别强弱科目
  const subjectStats = Array.from(subjectPerformance.entries())
  const strongSubjects = subjectStats
    .filter(([_, stats]) => stats.avgCompletion > 0.8)
    .map(([subject]) => subject)
    .slice(0, 3)

  const weakSubjects = subjectStats
    .filter(([_, stats]) => stats.avgCompletion < 0.6)
    .map(([subject]) => subject)
    .slice(0, 3)

  // 生成建议
  const suggestions: string[] = []
  
  if (consistency < 0.7) {
    suggestions.push('建议制定更符合实际的学习计划，提高完成率')
  }
  
  if (avgDailyHours > 6) {
    suggestions.push('学习时间较长，注意劳逸结合')
  }
  
  if (weakSubjects.length > 0) {
    suggestions.push(`重点关注薄弱科目：${weakSubjects.join('、')}`)
  }

  return {
    avgDailyHours: Math.round(avgDailyHours * 10) / 10,
    maxDailyHours,
    consistency,
    preferredTimes: [], // 可以通过更详细的时间记录来分析
    strongSubjects,
    weakSubjects,
    suggestions
  }
}