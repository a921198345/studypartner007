"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Target, AlertTriangle } from "lucide-react"
import { StudyPlanFormData } from "../study-plan-wizard-v2"

interface ExamCountdownStepProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

export function ExamCountdownStep({ data, onChange, userPreferences }: ExamCountdownStepProps) {
  // 默认法考日期为2025年9月20日
  const [examDate, setExamDate] = useState(data.exam_date || '2025-09-20')
  const [weeklyDays, setWeeklyDays] = useState(data.study_schedule?.weekly_days || 5)
  
  // 计算剩余天数
  const calculateDaysRemaining = () => {
    const today = new Date()
    const exam = new Date(examDate)
    const diffTime = exam.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  // 计算需要学习的科目总时长
  const calculateTotalStudyHours = () => {
    const subjects = Object.keys(data.subject_progress || {})
    let totalHours = 0
    
    // 每个科目的预估学习时长（基于未开始或进行中的状态）
    const SUBJECT_HOURS = {
      '民法': 150,      // 民法内容最多
      '刑法': 100,
      '行政法': 80,
      '民事诉讼法': 70,
      '刑事诉讼法': 70,
      '商经法': 90,
      '理论法': 60,
      '三国法': 50
    }
    
    subjects.forEach(subject => {
      const progress = data.subject_progress[subject]
      if (progress?.status === 'not_started') {
        totalHours += SUBJECT_HOURS[subject] || 60
      } else if (progress?.status === 'in_progress') {
        const remaining = (100 - (progress.progress || 0)) / 100
        totalHours += (SUBJECT_HOURS[subject] || 60) * remaining
      }
      // 已完成的科目不计算
    })
    
    return totalHours
  }

  // 智能计算每日学习时长
  const calculateOptimalDailyHours = () => {
    const daysRemaining = calculateDaysRemaining()
    const totalHours = calculateTotalStudyHours()
    const availableStudyDays = Math.floor((daysRemaining / 7) * weeklyDays)
    
    if (availableStudyDays <= 0) return 8 // 紧急情况
    
    const dailyHours = totalHours / availableStudyDays
    
    // 限制在合理范围内
    if (dailyHours < 2) return 2    // 最少2小时
    if (dailyHours > 10) return 10  // 最多10小时
    
    return Math.ceil(dailyHours * 2) / 2 // 四舍五入到0.5小时
  }

  const daysRemaining = calculateDaysRemaining()
  const totalHours = calculateTotalStudyHours()
  const optimalDailyHours = calculateOptimalDailyHours()
  const availableStudyDays = Math.floor((daysRemaining / 7) * weeklyDays)

  // 更新数据
  useEffect(() => {
    const newSchedule = {
      daily_hours: optimalDailyHours,
      weekly_days: weeklyDays
    }
    
    onChange({ 
      study_schedule: newSchedule,
      exam_date: examDate,
      calculated_total_hours: totalHours
    })
  }, [examDate, weeklyDays, optimalDailyHours, totalHours])

  // 获取紧急程度
  const getUrgencyLevel = () => {
    if (daysRemaining < 30) return { level: 'urgent', color: 'text-red-600', bg: 'bg-red-50', text: '紧急冲刺' }
    if (daysRemaining < 90) return { level: 'moderate', color: 'text-orange-600', bg: 'bg-orange-50', text: '适中备考' }
    return { level: 'relaxed', color: 'text-green-600', bg: 'bg-green-50', text: '充裕备考' }
  }

  const urgency = getUrgencyLevel()

  return (
    <div className="space-y-6">
      {/* 法考倒计时设置 */}
      <Card className={`border-2 ${urgency.level === 'urgent' ? 'border-red-200' : urgency.level === 'moderate' ? 'border-orange-200' : 'border-green-200'} ${urgency.bg}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className={`h-5 w-5 ${urgency.color}`} />
            法考倒计时设置
          </CardTitle>
          <CardDescription>
            设置法考日期，系统将智能计算您的每日学习时长
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 法考日期设置 */}
          <div>
            <Label className="text-base font-medium mb-3 block">法考日期</Label>
            <Input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* 每周学习天数 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">每周可学习天数</Label>
              <Badge variant="outline" className="text-blue-600">
                {weeklyDays} 天
              </Badge>
            </div>
            <Slider
              value={[weeklyDays]}
              onValueChange={(value) => setWeeklyDays(value[0])}
              max={7}
              min={2}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>2天</span>
              <span>7天</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 备考状态提醒 */}
      <div className="flex items-center justify-center">
        <Badge variant="outline" className={`text-base py-2 px-4 ${
          urgency.level === 'urgent' ? 'bg-red-100 text-red-800' :
          urgency.level === 'moderate' ? 'bg-orange-100 text-orange-800' :
          'bg-green-100 text-green-800'
        }`}>
          {urgency.text}状态 - 距离法考还有{daysRemaining}天
        </Badge>
      </div>

      {urgency.level === 'urgent' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">时间紧迫提醒：</p>
            <p>距离法考时间较短，建议您专注学习核心考点，适当调整学习策略。</p>
          </div>
        </div>
      )}

    </div>
  )
}