"use client"

import { useState, useEffect } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Slider } from "../../ui/slider"
import { Badge } from "../../ui/badge"
import { Label } from "../../ui/label"
import { Clock, Calendar } from "lucide-react"
import { StudyPlanFormData } from "../study-plan-wizard-v2"

interface TimeSettingsStepSimpleProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

export function TimeSettingsStepSimple({ data, onChange, userPreferences }: TimeSettingsStepSimpleProps) {
  const [localSchedule, setLocalSchedule] = useState(data.study_schedule)

  // 初始化数据
  useEffect(() => {
    if (userPreferences) {
      const newSchedule = {
        ...localSchedule,
        daily_hours: userPreferences.daily_hours || localSchedule.daily_hours,
        weekly_days: userPreferences.weekly_days || localSchedule.weekly_days
      }
      setLocalSchedule(newSchedule)
      updateData(newSchedule)
    }
  }, [userPreferences])

  // 更新数据
  const updateData = (newSchedule: any) => {
    setLocalSchedule(newSchedule)
    onChange({ study_schedule: newSchedule })
  }

  // 更新每日学习时长
  const updateDailyHours = (hours: number[]) => {
    const newSchedule = {
      ...localSchedule,
      daily_hours: hours[0]
    }
    updateData(newSchedule)
  }

  // 更新每周学习天数
  const updateWeeklyDays = (days: number[]) => {
    const newSchedule = {
      ...localSchedule,
      weekly_days: days[0]
    }
    updateData(newSchedule)
  }

  // 计算学习负载
  const calculateWorkload = () => {
    const weeklyHours = localSchedule.daily_hours * localSchedule.weekly_days
    const monthlyHours = weeklyHours * 4.3 // 一个月约4.3周
    
    let intensity = "适中"
    if (weeklyHours < 10) intensity = "轻松"
    else if (weeklyHours > 25) intensity = "高强度"
    
    return {
      weeklyHours,
      monthlyHours: Math.round(monthlyHours),
      intensity
    }
  }

  const workload = calculateWorkload()

  return (
    <div className="space-y-6">
      {/* 基本时间设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            学习时间设置
          </CardTitle>
          <CardDescription>
            设置您的基本学习时间安排
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 每日学习时长 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">每日学习时长</Label>
              <Badge variant="outline" className="text-blue-600">
                {localSchedule.daily_hours} 小时
              </Badge>
            </div>
            <Slider
              value={[localSchedule.daily_hours]}
              onValueChange={updateDailyHours}
              max={8}
              min={1}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1小时</span>
              <span>8小时</span>
            </div>
          </div>

          {/* 每周学习天数 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">每周学习天数</Label>
              <Badge variant="outline" className="text-green-600">
                {localSchedule.weekly_days} 天
              </Badge>
            </div>
            <Slider
              value={[localSchedule.weekly_days]}
              onValueChange={updateWeeklyDays}
              max={7}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1天</span>
              <span>7天</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习负载预览 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            学习负载预览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {localSchedule.daily_hours}h
              </div>
              <div className="text-sm text-muted-foreground">每日学习</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {workload.weeklyHours}h
              </div>
              <div className="text-sm text-muted-foreground">每周总计</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {workload.monthlyHours}h
              </div>
              <div className="text-sm text-muted-foreground">每月预计</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className={`text-sm py-1 px-3 ${
                workload.intensity === '轻松' ? 'bg-green-100 text-green-800' :
                workload.intensity === '适中' ? 'bg-blue-100 text-blue-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {workload.intensity}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">学习强度</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}