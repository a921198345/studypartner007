"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Clock, 
  Calendar, 
  Coffee, 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset,
  Timer,
  TrendingUp,
  User,
  AlertCircle
} from "lucide-react"
import { StudyPlanFormData } from "../study-plan-wizard-v2"

interface TimeSettingsStepProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

// 时间段配置
const TIME_SLOTS = [
  { id: "06:00-09:00", label: "早晨", icon: Sunrise, color: "bg-orange-100 text-orange-800" },
  { id: "09:00-12:00", label: "上午", icon: Sun, color: "bg-yellow-100 text-yellow-800" },
  { id: "12:00-14:00", label: "午休", icon: Coffee, color: "bg-green-100 text-green-800" },
  { id: "14:00-18:00", label: "下午", icon: Sun, color: "bg-blue-100 text-blue-800" },
  { id: "18:00-21:00", label: "傍晚", icon: Sunset, color: "bg-purple-100 text-purple-800" },
  { id: "21:00-24:00", label: "夜间", icon: Moon, color: "bg-indigo-100 text-indigo-800" }
]

// 学习强度选项
const INTENSITY_OPTIONS = [
  {
    id: "gradual",
    name: "循序渐进",
    description: "稳步推进，注重基础",
    dailyHours: [1, 3],
    weeklyDays: [4, 6],
    breakMinutes: 15
  },
  {
    id: "intensive", 
    name: "高强度",
    description: "集中突破，效率优先",
    dailyHours: [3, 6],
    weeklyDays: [5, 7],
    breakMinutes: 10
  },
  {
    id: "flexible",
    name: "灵活安排",
    description: "弹性时间，自由调节",
    dailyHours: [2, 5],
    weeklyDays: [3, 6],
    breakMinutes: 20
  }
]

export function TimeSettingsStep({ data, onChange, userPreferences }: TimeSettingsStepProps) {
  const [localSchedule, setLocalSchedule] = useState(data.study_schedule)
  const [selectedIntensity, setSelectedIntensity] = useState<string>("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 初始化数据
  useEffect(() => {
    if (userPreferences) {
      const newSchedule = {
        ...localSchedule,
        daily_hours: userPreferences.daily_hours || localSchedule.daily_hours,
        weekly_days: userPreferences.weekly_days || localSchedule.weekly_days,
        preferred_times: userPreferences.preferred_study_times || localSchedule.preferred_times
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

  // 应用学习强度模板
  const applyIntensityTemplate = (intensityId: string) => {
    const template = INTENSITY_OPTIONS.find(opt => opt.id === intensityId)
    if (!template) return

    const newSchedule = {
      ...localSchedule,
      daily_hours: Math.round((template.dailyHours[0] + template.dailyHours[1]) / 2),
      weekly_days: Math.round((template.weeklyDays[0] + template.weeklyDays[1]) / 2),
      break_frequency: template.breakMinutes
    }

    setSelectedIntensity(intensityId)
    updateData(newSchedule)
  }

  // 更新每日学习时长
  const updateDailyHours = (hours: number[]) => {
    const newSchedule = {
      ...localSchedule,
      daily_hours: hours[0]
    }
    updateData(newSchedule)
    setSelectedIntensity("") // 清除模板选择
  }

  // 更新每周学习天数
  const updateWeeklyDays = (days: number[]) => {
    const newSchedule = {
      ...localSchedule,
      weekly_days: days[0]
    }
    updateData(newSchedule)
    setSelectedIntensity("") // 清除模板选择
  }

  // 切换时间段
  const toggleTimeSlot = (timeId: string) => {
    const currentTimes = localSchedule.preferred_times || []
    const newTimes = currentTimes.includes(timeId)
      ? currentTimes.filter(t => t !== timeId)
      : [...currentTimes, timeId]
    
    const newSchedule = {
      ...localSchedule,
      preferred_times: newTimes
    }
    updateData(newSchedule)
  }

  // 更新休息频率
  const updateBreakFrequency = (frequency: string) => {
    const newSchedule = {
      ...localSchedule,
      break_frequency: parseInt(frequency)
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
      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Timer className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 mb-2">时间安排建议</p>
            <ul className="space-y-1 text-blue-800">
              <li>• 每日学习时长建议在1-6小时，根据个人情况调整</li>
              <li>• 每周至少保证3天学习，建议5-6天获得最佳效果</li>
              <li>• 选择合适的时间段，确保精力充沛时学习</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 学习强度模板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            学习强度模板
          </CardTitle>
          <CardDescription>
            选择适合您的学习强度，我们会自动配置相关参数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INTENSITY_OPTIONS.map((option) => (
              <Card 
                key={option.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedIntensity === option.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => applyIntensityTemplate(option.id)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="font-medium mb-2">{option.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {option.description}
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>每日</span>
                        <span className="font-medium">
                          {option.dailyHours[0]}-{option.dailyHours[1]}小时
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>每周</span>
                        <span className="font-medium">
                          {option.weeklyDays[0]}-{option.weeklyDays[1]}天
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>休息间隔</span>
                        <span className="font-medium">
                          {option.breakMinutes}分钟
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 详细时间设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            详细时间设置
          </CardTitle>
          <CardDescription>
            自定义您的学习时间安排
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

          {/* 偏好时间段 */}
          <div>
            <Label className="text-base font-medium mb-3 block">偏好学习时间段</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TIME_SLOTS.map((slot) => {
                const isSelected = localSchedule.preferred_times?.includes(slot.id)
                const IconComponent = slot.icon
                
                return (
                  <Button
                    key={slot.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTimeSlot(slot.id)}
                    className={`h-auto p-3 ${isSelected ? '' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <div className="text-center">
                        <div className="text-xs font-medium">{slot.label}</div>
                        <div className="text-xs opacity-75">{slot.id}</div>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              选择您精力最充沛的时间段，可以多选
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 学习负载统计 */}
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

      {/* 高级设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">高级设置</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '收起' : '展开'}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            {/* 休息频率 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                休息间隔时间
              </Label>
              <Select 
                value={localSchedule.break_frequency?.toString() || "15"}
                onValueChange={updateBreakFrequency}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择休息间隔" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">每10分钟休息</SelectItem>
                  <SelectItem value="15">每15分钟休息</SelectItem>
                  <SelectItem value="20">每20分钟休息</SelectItem>
                  <SelectItem value="25">每25分钟休息（番茄钟）</SelectItem>
                  <SelectItem value="30">每30分钟休息</SelectItem>
                  <SelectItem value="45">每45分钟休息</SelectItem>
                  <SelectItem value="60">每小时休息</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 时间冲突提醒 */}
      {workload.weeklyHours > 30 && (
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-orange-900 mb-1">时间安排提醒</p>
            <p className="text-orange-800">
              当前设置每周学习超过30小时，建议适当降低强度，确保学习质量和身心健康。
            </p>
          </div>
        </div>
      )}

      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground">
        <p>合理的时间安排是学习成功的关键，建议根据自己的实际情况进行调整</p>
      </div>
    </div>
  )
}