// 学习表现数据追踪器

import pool from './db'

interface DailyStudyRecord {
  user_id: string
  plan_id: number
  date: string
  planned_hours: number
  actual_hours: number
  subjects_studied: string[]
  chapters_completed: string[]
  questions_practiced: number
  correct_rate: number
  notes_created: number
  completion_rate: number
  mood: 'excellent' | 'good' | 'normal' | 'tired' | 'stressed'
  feedback?: string
}

interface StudySession {
  user_id: string
  subject: string
  start_time: Date
  end_time?: Date
  duration_minutes?: number
  activity_type: 'reading' | 'video' | 'practice' | 'review' | 'note'
  content_id?: string
  content_title?: string
  completion_status: 'in_progress' | 'completed' | 'paused'
  performance_metrics?: {
    questions_answered?: number
    correct_answers?: number
    notes_created?: number
    highlights_made?: number
  }
}

interface PerformanceAnalysis {
  user_id: string
  period: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  
  // 学习时间统计
  total_planned_hours: number
  total_actual_hours: number
  completion_rate: number
  average_daily_hours: number
  peak_study_time: string // 最佳学习时段
  
  // 科目分析
  subjects_distribution: Record<string, {
    hours: number
    percentage: number
    performance: number
  }>
  strongest_subjects: string[]
  weakest_subjects: string[]
  
  // 学习效果
  total_questions_practiced: number
  average_correct_rate: number
  improvement_trend: number // 进步趋势
  
  // 行为模式
  consistency_score: number // 学习连续性得分
  preferred_activity_types: string[]
  average_session_duration: number
  
  // 建议
  recommendations: string[]
  alerts: string[]
}

export class StudyPerformanceTracker {
  // 开始学习会话
  async startSession(session: Omit<StudySession, 'duration_minutes'>): Promise<number> {
    const connection = await pool.getConnection()
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO study_sessions 
         (user_id, subject, start_time, activity_type, content_id, content_title, completion_status)
         VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`,
        [
          session.user_id,
          session.subject,
          session.start_time,
          session.activity_type,
          session.content_id || null,
          session.content_title || null
        ]
      )
      
      connection.release()
      return (result as any).insertId
      
    } catch (error) {
      connection.release()
      console.error('Failed to start study session:', error)
      throw error
    }
  }

  // 结束学习会话
  async endSession(
    sessionId: number,
    endTime: Date,
    status: 'completed' | 'paused',
    metrics?: StudySession['performance_metrics']
  ): Promise<void> {
    const connection = await pool.getConnection()
    
    try {
      // 获取会话开始时间
      const [sessions] = await connection.execute(
        `SELECT start_time FROM study_sessions WHERE id = ?`,
        [sessionId]
      )
      
      if (!sessions || (sessions as any[]).length === 0) {
        throw new Error('Session not found')
      }
      
      const startTime = new Date((sessions as any[])[0].start_time)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)
      
      // 更新会话信息
      await connection.execute(
        `UPDATE study_sessions 
         SET end_time = ?, duration_minutes = ?, completion_status = ?,
             performance_metrics = ?
         WHERE id = ?`,
        [
          endTime,
          durationMinutes,
          status,
          metrics ? JSON.stringify(metrics) : null,
          sessionId
        ]
      )
      
      connection.release()
      
    } catch (error) {
      connection.release()
      console.error('Failed to end study session:', error)
      throw error
    }
  }

  // 记录每日学习数据
  async recordDailyPerformance(record: DailyStudyRecord): Promise<void> {
    const connection = await pool.getConnection()
    
    try {
      await connection.execute(
        `INSERT INTO daily_study_records 
         (user_id, plan_id, date, planned_hours, actual_hours, subjects_studied,
          chapters_completed, questions_practiced, correct_rate, notes_created,
          completion_rate, mood, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         actual_hours = VALUES(actual_hours),
         subjects_studied = VALUES(subjects_studied),
         chapters_completed = VALUES(chapters_completed),
         questions_practiced = VALUES(questions_practiced),
         correct_rate = VALUES(correct_rate),
         notes_created = VALUES(notes_created),
         completion_rate = VALUES(completion_rate),
         mood = VALUES(mood),
         feedback = VALUES(feedback)`,
        [
          record.user_id,
          record.plan_id,
          record.date,
          record.planned_hours,
          record.actual_hours,
          JSON.stringify(record.subjects_studied),
          JSON.stringify(record.chapters_completed),
          record.questions_practiced,
          record.correct_rate,
          record.notes_created,
          record.completion_rate,
          record.mood,
          record.feedback || null
        ]
      )
      
      connection.release()
      
    } catch (error) {
      connection.release()
      console.error('Failed to record daily performance:', error)
      throw error
    }
  }

  // 分析学习表现
  async analyzePerformance(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    endDate: Date = new Date()
  ): Promise<PerformanceAnalysis> {
    const connection = await pool.getConnection()
    
    try {
      // 计算日期范围
      const startDate = new Date(endDate)
      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1)
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7)
      } else {
        startDate.setMonth(startDate.getMonth() - 1)
      }
      
      // 查询学习记录
      const [records] = await connection.execute(
        `SELECT * FROM daily_study_records 
         WHERE user_id = ? AND date BETWEEN ? AND ?
         ORDER BY date`,
        [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      )
      
      // 查询学习会话
      const [sessions] = await connection.execute(
        `SELECT * FROM study_sessions 
         WHERE user_id = ? AND start_time BETWEEN ? AND ?
         AND completion_status != 'in_progress'`,
        [userId, startDate, endDate]
      )
      
      connection.release()
      
      // 分析数据
      const analysis = this.calculatePerformanceMetrics(
        records as any[],
        sessions as any[],
        userId,
        period,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      return analysis
      
    } catch (error) {
      connection.release()
      console.error('Failed to analyze performance:', error)
      throw error
    }
  }

  // 获取学习建议
  async getStudyRecommendations(userId: string): Promise<{
    timeOptimization: string[]
    subjectFocus: string[]
    methodImprovement: string[]
    warnings: string[]
  }> {
    // 获取最近的表现分析
    const weeklyAnalysis = await this.analyzePerformance(userId, 'weekly')
    const monthlyAnalysis = await this.analyzePerformance(userId, 'monthly')
    
    const recommendations = {
      timeOptimization: [],
      subjectFocus: [],
      methodImprovement: [],
      warnings: []
    }
    
    // 时间优化建议
    if (weeklyAnalysis.completion_rate < 0.7) {
      recommendations.timeOptimization.push(
        '您的计划完成率较低，建议适当减少每日学习时长，确保可持续性'
      )
    }
    
    if (weeklyAnalysis.peak_study_time) {
      recommendations.timeOptimization.push(
        `您在${weeklyAnalysis.peak_study_time}时段学习效果最好，建议优先安排重要内容`
      )
    }
    
    // 科目重点建议
    if (weeklyAnalysis.weakest_subjects.length > 0) {
      recommendations.subjectFocus.push(
        `建议加强${weeklyAnalysis.weakest_subjects.join('、')}的学习时间`
      )
    }
    
    // 学习方法改进
    if (weeklyAnalysis.average_correct_rate < 0.6) {
      recommendations.methodImprovement.push(
        '练习正确率偏低，建议先巩固基础知识再进行大量练习'
      )
    }
    
    // 警告提示
    if (weeklyAnalysis.consistency_score < 0.5) {
      recommendations.warnings.push(
        '学习连续性不足，容易遗忘所学内容'
      )
    }
    
    if (monthlyAnalysis.improvement_trend < 0) {
      recommendations.warnings.push(
        '近期学习效果有下降趋势，请及时调整学习策略'
      )
    }
    
    return recommendations
  }

  // 计算表现指标
  private calculatePerformanceMetrics(
    records: any[],
    sessions: any[],
    userId: string,
    period: string,
    startDate: string,
    endDate: string
  ): PerformanceAnalysis {
    // 时间统计
    const totalPlannedHours = records.reduce((sum, r) => sum + r.planned_hours, 0)
    const totalActualHours = records.reduce((sum, r) => sum + r.actual_hours, 0)
    const completionRate = totalPlannedHours > 0 ? totalActualHours / totalPlannedHours : 0
    const avgDailyHours = records.length > 0 ? totalActualHours / records.length : 0
    
    // 科目分布
    const subjectsMap = new Map<string, { hours: number; questions: number; correct: number }>()
    
    records.forEach(record => {
      const subjects = JSON.parse(record.subjects_studied || '[]')
      subjects.forEach((subject: string) => {
        const current = subjectsMap.get(subject) || { hours: 0, questions: 0, correct: 0 }
        current.hours += record.actual_hours / subjects.length
        current.questions += record.questions_practiced / subjects.length
        current.correct += (record.questions_practiced * record.correct_rate) / subjects.length
        subjectsMap.set(subject, current)
      })
    })
    
    // 转换科目数据
    const subjectsDistribution: Record<string, any> = {}
    subjectsMap.forEach((data, subject) => {
      subjectsDistribution[subject] = {
        hours: data.hours,
        percentage: totalActualHours > 0 ? data.hours / totalActualHours : 0,
        performance: data.questions > 0 ? data.correct / data.questions : 0
      }
    })
    
    // 找出强弱科目
    const subjectPerformance = Object.entries(subjectsDistribution)
      .sort((a, b) => b[1].performance - a[1].performance)
    
    const strongestSubjects = subjectPerformance.slice(0, 3).map(([subject]) => subject)
    const weakestSubjects = subjectPerformance.slice(-3).map(([subject]) => subject)
    
    // 学习效果
    const totalQuestions = records.reduce((sum, r) => sum + r.questions_practiced, 0)
    const totalCorrect = records.reduce((sum, r) => sum + r.questions_practiced * r.correct_rate, 0)
    const avgCorrectRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
    
    // 连续性得分
    const studyDays = records.filter(r => r.actual_hours > 0).length
    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    const consistencyScore = totalDays > 0 ? studyDays / totalDays : 0
    
    // 活动类型偏好
    const activityCounts = new Map<string, number>()
    sessions.forEach(session => {
      activityCounts.set(session.activity_type, (activityCounts.get(session.activity_type) || 0) + 1)
    })
    const preferredActivities = Array.from(activityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type)
    
    // 平均会话时长
    const totalSessionMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const avgSessionDuration = sessions.length > 0 ? totalSessionMinutes / sessions.length : 0
    
    // 进步趋势（简化计算）
    const firstHalfCorrectRate = this.calculatePeriodCorrectRate(records.slice(0, Math.floor(records.length / 2)))
    const secondHalfCorrectRate = this.calculatePeriodCorrectRate(records.slice(Math.floor(records.length / 2)))
    const improvementTrend = secondHalfCorrectRate - firstHalfCorrectRate
    
    return {
      user_id: userId,
      period,
      start_date: startDate,
      end_date: endDate,
      total_planned_hours: totalPlannedHours,
      total_actual_hours: totalActualHours,
      completion_rate: completionRate,
      average_daily_hours: avgDailyHours,
      peak_study_time: this.findPeakStudyTime(sessions),
      subjects_distribution: subjectsDistribution,
      strongest_subjects: strongestSubjects,
      weakest_subjects: weakestSubjects,
      total_questions_practiced: totalQuestions,
      average_correct_rate: avgCorrectRate,
      improvement_trend: improvementTrend,
      consistency_score: consistencyScore,
      preferred_activity_types: preferredActivities,
      average_session_duration: avgSessionDuration,
      recommendations: [],
      alerts: []
    }
  }

  // 计算时段正确率
  private calculatePeriodCorrectRate(records: any[]): number {
    const totalQuestions = records.reduce((sum, r) => sum + r.questions_practiced, 0)
    const totalCorrect = records.reduce((sum, r) => sum + r.questions_practiced * r.correct_rate, 0)
    return totalQuestions > 0 ? totalCorrect / totalQuestions : 0
  }

  // 找出最佳学习时段
  private findPeakStudyTime(sessions: any[]): string {
    const timeSlots = new Map<string, { count: number; performance: number }>()
    
    sessions.forEach(session => {
      const hour = new Date(session.start_time).getHours()
      let timeSlot = ''
      
      if (hour >= 5 && hour < 9) timeSlot = '早晨(5:00-9:00)'
      else if (hour >= 9 && hour < 12) timeSlot = '上午(9:00-12:00)'
      else if (hour >= 12 && hour < 14) timeSlot = '中午(12:00-14:00)'
      else if (hour >= 14 && hour < 18) timeSlot = '下午(14:00-18:00)'
      else if (hour >= 18 && hour < 22) timeSlot = '晚上(18:00-22:00)'
      else timeSlot = '深夜(22:00-5:00)'
      
      const current = timeSlots.get(timeSlot) || { count: 0, performance: 0 }
      current.count++
      
      if (session.performance_metrics) {
        const metrics = JSON.parse(session.performance_metrics)
        if (metrics.questions_answered && metrics.correct_answers) {
          current.performance += metrics.correct_answers / metrics.questions_answered
        }
      }
      
      timeSlots.set(timeSlot, current)
    })
    
    // 找出最频繁且表现最好的时段
    let bestSlot = ''
    let bestScore = 0
    
    timeSlots.forEach((data, slot) => {
      const score = data.count * (1 + data.performance / data.count)
      if (score > bestScore) {
        bestScore = score
        bestSlot = slot
      }
    })
    
    return bestSlot
  }
}