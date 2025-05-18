"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, Clock } from "lucide-react"

interface WeeklyPlanViewProps {
  startDate: Date
  studyHours: number
}

export function WeeklyPlanView({ startDate, studyHours }: WeeklyPlanViewProps) {
  // 获取一周的日期范围
  const getWeekDates = (date: Date) => {
    const day = date.getDay() // 0 是星期日，1 是星期一，以此类推
    const diff = date.getDate() - day
    const sunday = new Date(date)
    sunday.setDate(diff)

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(sunday)
      currentDate.setDate(sunday.getDate() + i)
      weekDates.push(currentDate)
    }

    return weekDates
  }

  // 格式化日期范围
  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 0) return ""

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]

    const formatDate = (date: Date) => {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }

    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`
  }

  // 获取星期几
  const getWeekday = (date: Date) => {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return weekdays[date.getDay()]
  }

  // 模拟周计划数据
  const weekDates = getWeekDates(startDate)
  const weeklyPlan = weekDates.map((date, index) => {
    const isToday = new Date().toDateString() === date.toDateString()

    // 模拟不同科目
    const subjects = ["民法总则", "民法总则", "民法总则", "刑法总论", "刑法总论", "刑法总论", "复习与巩固"]
    const contents = [
      "第三章 民事法律行为",
      "第四章 民事权利能力和行为能力",
      "第五章 民事法律行为",
      "第一章 刑法概述",
      "第二章 犯罪概念与构成要件",
      "第三章 正当防卫与紧急避险",
      "本周知识点复习与真题练习",
    ]

    return {
      date,
      weekday: getWeekday(date),
      subject: subjects[index],
      content: contents[index],
      hours: studyHours,
      progress: isToday ? 0 : index < new Date().getDay() ? Math.floor(Math.random() * 100) : 0,
      isToday,
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-primary mr-2" />
          <h3 className="font-medium text-lg">{formatDateRange(weekDates)}</h3>
        </div>
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          周计划学习时间: {studyHours * 7}小时
        </Badge>
      </div>

      <div className="space-y-3">
        {weeklyPlan.map((day, index) => (
          <Card key={index} className={day.isToday ? "border-l-4 border-l-primary" : ""}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium flex items-center">
                  <span className="w-16 text-gray-500">{day.weekday}</span>
                  <BookOpen className="h-4 w-4 mx-2 text-primary" />
                  {day.subject}
                </h4>
                <Badge className="badge">{day.hours}小时</Badge>
              </div>
              <p className="text-sm text-gray-600 ml-16">{day.content}</p>
              <div className="flex justify-between items-center text-xs text-gray-500 ml-16">
                <span>进度: {day.progress}%</span>
                {day.isToday && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    今日任务
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
