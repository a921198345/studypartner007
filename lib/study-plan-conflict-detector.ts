// 学习计划冲突检测器

import pool from './db'
import { validateTimeSettings, analyzeStudyHabits } from '@/hooks/useStudyPlanPreferences'

interface ConflictCheckResult {
  hasConflicts: boolean
  conflicts: ConflictItem[]
  warnings: WarningItem[]
  suggestions: string[]
}

interface ConflictItem {
  type: 'progress' | 'time' | 'content' | 'difficulty'
  severity: 'high' | 'medium' | 'low'
  message: string
  details?: any
}

interface WarningItem {
  type: string
  message: string
  suggestion?: string
}

interface UserStudyData {
  currentProgress: Record<string, {
    subject: string
    progress: number
    lastUpdated: Date
    averageSpeed: number // 每周进度百分比
  }>
  historicalPerformance: {
    avgDailyHours: number
    maxDailyHours: number
    consistency: number
    completionRates: number[]
  }
  activePlans: Array<{
    id: number
    subjects: string[]
    dailyHours: number
    weeklyDays: number
    startDate: Date
  }>
}

export class StudyPlanConflictDetector {
  // 检测所有潜在冲突
  async detectConflicts(
    userId: string,
    newPlanData: {
      subjects_progress: any[]
      ordered_subjects: string[]
      schedule: {
        daily_hours: number
        weekly_days: number
      }
      start_date?: Date
    }
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictItem[] = []
    const warnings: WarningItem[] = []
    const suggestions: string[] = []

    try {
      // 获取用户当前数据
      const userData = await this.getUserStudyData(userId)

      // 1. 进度冲突检测
      const progressConflicts = await this.checkProgressConflicts(
        newPlanData.subjects_progress,
        userData.currentProgress
      )
      conflicts.push(...progressConflicts)

      // 2. 时间合理性检查
      const timeValidation = validateTimeSettings(
        newPlanData.schedule.daily_hours,
        newPlanData.schedule.weekly_days,
        userData.historicalPerformance
      )
      
      if (!timeValidation.isValid) {
        timeValidation.warnings.forEach(warning => {
          conflicts.push({
            type: 'time',
            severity: 'high',
            message: warning
          })
        })
      }
      
      warnings.push(...timeValidation.warnings.map(w => ({
        type: 'time',
        message: w
      })))
      
      suggestions.push(...timeValidation.suggestions)

      // 3. 活跃计划冲突
      if (userData.activePlans.length > 0) {
        const activePlanConflicts = this.checkActivePlanConflicts(
          newPlanData,
          userData.activePlans
        )
        conflicts.push(...activePlanConflicts)
      }

      // 4. 内容衔接验证
      const contentIssues = this.checkContentContinuity(
        newPlanData.ordered_subjects,
        newPlanData.subjects_progress
      )
      warnings.push(...contentIssues)

      // 5. 难度适配检查
      const difficultyIssues = await this.checkDifficultyAdaptation(
        userId,
        newPlanData
      )
      warnings.push(...difficultyIssues)

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        warnings,
        suggestions
      }

    } catch (error) {
      console.error('Conflict detection error:', error)
      return {
        hasConflicts: false,
        conflicts: [],
        warnings: [{
          type: 'system',
          message: '无法完成冲突检测，但您可以继续创建计划'
        }],
        suggestions: []
      }
    }
  }

  // 获取用户学习数据
  private async getUserStudyData(userId: string): Promise<UserStudyData> {
    const connection = await pool.getConnection()

    try {
      // 获取当前进度
      const [progress] = await connection.execute(
        `SELECT subject, progress, last_studied_at 
         FROM user_subject_progress 
         WHERE user_id = ? AND status = 'in_progress'`,
        [userId]
      )

      // 获取历史表现
      const [performance] = await connection.execute(
        `SELECT 
          AVG(actual_hours) as avg_daily_hours,
          MAX(actual_hours) as max_daily_hours,
          AVG(completion_rate) as avg_completion_rate
         FROM daily_study_records
         WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId]
      )

      // 获取活跃计划
      const [plans] = await connection.execute(
        `SELECT id, subjects_order, schedule_settings, created_at
         FROM study_plans
         WHERE user_id = ? AND status = 'active'`,
        [userId]
      )

      connection.release()

      // 处理数据
      const currentProgress: UserStudyData['currentProgress'] = {}
      ;(progress as any[]).forEach(p => {
        currentProgress[p.subject] = {
          subject: p.subject,
          progress: p.progress,
          lastUpdated: new Date(p.last_studied_at),
          averageSpeed: 5 // 默认每周5%进度
        }
      })

      const perf = (performance as any[])[0] || {}
      const historicalPerformance = {
        avgDailyHours: perf.avg_daily_hours || 0,
        maxDailyHours: perf.max_daily_hours || 0,
        consistency: perf.avg_completion_rate || 0,
        completionRates: []
      }

      const activePlans = (plans as any[]).map(p => ({
        id: p.id,
        subjects: JSON.parse(p.subjects_order || '[]'),
        dailyHours: JSON.parse(p.schedule_settings || '{}').daily_hours || 3,
        weeklyDays: JSON.parse(p.schedule_settings || '{}').weekly_days || 5,
        startDate: new Date(p.created_at)
      }))

      return {
        currentProgress,
        historicalPerformance,
        activePlans
      }

    } catch (error) {
      connection.release()
      throw error
    }
  }

  // 检查进度冲突
  private async checkProgressConflicts(
    newProgress: any[],
    currentProgress: UserStudyData['currentProgress']
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = []

    newProgress.forEach(subject => {
      const current = currentProgress[subject.subject]
      
      if (current) {
        // 检查进度是否倒退
        if (subject.progress < current.progress) {
          conflicts.push({
            type: 'progress',
            severity: 'high',
            message: `${subject.subject}的进度(${subject.progress}%)低于系统记录(${current.progress}%)`,
            details: {
              subject: subject.subject,
              newProgress: subject.progress,
              currentProgress: current.progress
            }
          })
        }

        // 检查进度更新时间
        const daysSinceUpdate = Math.floor(
          (Date.now() - current.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysSinceUpdate > 30 && Math.abs(subject.progress - current.progress) > 20) {
          conflicts.push({
            type: 'progress',
            severity: 'medium',
            message: `${subject.subject}已有${daysSinceUpdate}天未更新，进度差异较大`,
            details: {
              subject: subject.subject,
              daysSinceUpdate,
              progressDiff: Math.abs(subject.progress - current.progress)
            }
          })
        }
      }
    })

    return conflicts
  }

  // 检查活跃计划冲突
  private checkActivePlanConflicts(
    newPlan: any,
    activePlans: UserStudyData['activePlans']
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = []

    activePlans.forEach(plan => {
      // 检查是否有重复的科目安排
      const overlappingSubjects = plan.subjects.filter(s => 
        newPlan.ordered_subjects.includes(s)
      )

      if (overlappingSubjects.length > 0) {
        conflicts.push({
          type: 'content',
          severity: 'medium',
          message: `您已有活跃计划包含${overlappingSubjects.join('、')}等科目`,
          details: {
            planId: plan.id,
            overlappingSubjects
          }
        })
      }

      // 检查时间安排冲突
      const totalDailyHours = plan.dailyHours + newPlan.schedule.daily_hours
      if (totalDailyHours > 12) {
        conflicts.push({
          type: 'time',
          severity: 'high',
          message: `新计划与现有计划的每日学习时间总和(${totalDailyHours}小时)超过合理范围`,
          details: {
            existingHours: plan.dailyHours,
            newHours: newPlan.schedule.daily_hours,
            total: totalDailyHours
          }
        })
      }
    })

    return conflicts
  }

  // 检查内容衔接性
  private checkContentContinuity(
    orderedSubjects: string[],
    subjectsProgress: any[]
  ): WarningItem[] {
    const warnings: WarningItem[] = []
    const progressMap = new Map(
      subjectsProgress.map(s => [s.subject, s])
    )

    // 检查是否有未完成的前置科目
    const coreSubjects = ['民法', '刑法', '行政法']
    const advancedSubjects = ['民事诉讼法', '刑事诉讼法', '商法']

    orderedSubjects.forEach((subject, index) => {
      if (advancedSubjects.includes(subject)) {
        // 检查相关基础科目是否已学习
        const relatedCore = coreSubjects.find(core => 
          subject.includes(core.substring(0, 2))
        )
        
        if (relatedCore) {
          const coreIndex = orderedSubjects.indexOf(relatedCore)
          const coreProgress = progressMap.get(relatedCore)
          
          if (coreIndex > index || (coreProgress && coreProgress.progress < 50)) {
            warnings.push({
              type: 'content_order',
              message: `建议先学习${relatedCore}再学习${subject}`,
              suggestion: `将${relatedCore}调整到${subject}之前`
            })
          }
        }
      }
    })

    // 检查学习负载分布
    let consecutiveHardSubjects = 0
    const hardSubjects = ['民法', '刑法', '商法']
    
    orderedSubjects.forEach(subject => {
      if (hardSubjects.includes(subject)) {
        consecutiveHardSubjects++
        if (consecutiveHardSubjects >= 3) {
          warnings.push({
            type: 'difficulty_distribution',
            message: '连续安排了多个高难度科目，可能影响学习效果',
            suggestion: '在难度较高的科目之间穿插一些相对简单的科目'
          })
        }
      } else {
        consecutiveHardSubjects = 0
      }
    })

    return warnings
  }

  // 检查难度适配
  private async checkDifficultyAdaptation(
    userId: string,
    newPlan: any
  ): Promise<WarningItem[]> {
    const warnings: WarningItem[] = []
    const connection = await pool.getConnection()

    try {
      // 获取用户最近的学习表现
      const [recentPerformance] = await connection.execute(
        `SELECT AVG(correct_rate) as avg_correct_rate,
                AVG(completion_rate) as avg_completion_rate
         FROM daily_study_records
         WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 14 DAY)`,
        [userId]
      )

      connection.release()

      const perf = (recentPerformance as any[])[0]
      
      if (perf && perf.avg_correct_rate < 0.6) {
        // 正确率较低，检查是否安排了过多难题
        const hardSubjects = newPlan.ordered_subjects.filter((s: string) => 
          ['民法', '刑法', '商法'].includes(s)
        )
        
        if (hardSubjects.length > newPlan.ordered_subjects.length * 0.5) {
          warnings.push({
            type: 'difficulty',
            message: '近期练习正确率较低，建议适当降低学习难度',
            suggestion: '增加基础知识复习时间，减少高难度科目比例'
          })
        }
      }

      if (perf && perf.avg_completion_rate < 0.7) {
        // 完成率较低
        if (newPlan.schedule.daily_hours > 4) {
          warnings.push({
            type: 'workload',
            message: '近期计划完成率较低，新计划的学习时长可能过长',
            suggestion: '建议将每日学习时间调整为3-4小时'
          })
        }
      }

      return warnings

    } catch (error) {
      connection.release()
      console.error('Difficulty check error:', error)
      return warnings
    }
  }

  // 自动调整计划以解决冲突
  async autoResolveConflicts(
    userId: string,
    originalPlan: any,
    conflicts: ConflictItem[]
  ): Promise<{
    adjustedPlan: any
    adjustments: string[]
  }> {
    const adjustedPlan = JSON.parse(JSON.stringify(originalPlan))
    const adjustments: string[] = []

    // 根据冲突类型进行调整
    conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'time':
          // 调整学习时间
          if (conflict.details?.total > 12) {
            const reduction = Math.ceil((conflict.details.total - 10) / 2)
            adjustedPlan.schedule.daily_hours = Math.max(
              originalPlan.schedule.daily_hours - reduction,
              2
            )
            adjustments.push(
              `将每日学习时间从${originalPlan.schedule.daily_hours}小时调整为${adjustedPlan.schedule.daily_hours}小时`
            )
          }
          break

        case 'progress':
          // 更新进度数据
          if (conflict.details) {
            const subjectIndex = adjustedPlan.subjects_progress.findIndex(
              (s: any) => s.subject === conflict.details.subject
            )
            if (subjectIndex !== -1) {
              adjustedPlan.subjects_progress[subjectIndex].progress = 
                conflict.details.currentProgress
              adjustments.push(
                `更新${conflict.details.subject}进度为${conflict.details.currentProgress}%`
              )
            }
          }
          break

        case 'content':
          // 调整科目顺序或移除重复科目
          if (conflict.details?.overlappingSubjects) {
            conflict.details.overlappingSubjects.forEach((subject: string) => {
              const index = adjustedPlan.ordered_subjects.indexOf(subject)
              if (index !== -1) {
                adjustedPlan.ordered_subjects.splice(index, 1)
                adjustments.push(`移除已在学习的科目：${subject}`)
              }
            })
          }
          break
      }
    })

    return {
      adjustedPlan,
      adjustments
    }
  }
}