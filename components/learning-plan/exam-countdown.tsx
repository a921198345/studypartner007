"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Calendar, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface ExamCountdownProps {
  examName: string
  daysLeft?: number
}

export function ExamCountdown({ examName, daysLeft: initialDaysLeft }: ExamCountdownProps) {
  const [examDate, setExamDate] = useState<string>("")
  const [daysLeft, setDaysLeft] = useState<number>(initialDaysLeft || 0)
  const [isSettingDate, setIsSettingDate] = useState(false)
  const [tempDate, setTempDate] = useState<string>("")

  // 计算剩余天数
  const calculateDaysLeft = (targetDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exam = new Date(targetDate)
    exam.setHours(0, 0, 0, 0)
    const diffTime = exam.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  // 从本地存储加载考试日期
  useEffect(() => {
    const savedExamDate = localStorage.getItem("law-exam-date")
    if (savedExamDate) {
      setExamDate(savedExamDate)
      setDaysLeft(calculateDaysLeft(savedExamDate))
    } else {
      // 默认设置为2025年9月的第一个周六（通常是法考时间）
      const defaultDate = "2025-09-06"
      setExamDate(defaultDate)
      setDaysLeft(calculateDaysLeft(defaultDate))
    }
  }, [])

  // 每天更新倒计时
  useEffect(() => {
    if (examDate) {
      const timer = setInterval(() => {
        setDaysLeft(calculateDaysLeft(examDate))
      }, 1000 * 60 * 60) // 每小时更新一次

      return () => clearInterval(timer)
    }
  }, [examDate])

  // 保存考试日期
  const handleSaveDate = () => {
    if (tempDate) {
      localStorage.setItem("law-exam-date", tempDate)
      setExamDate(tempDate)
      setDaysLeft(calculateDaysLeft(tempDate))
      setIsSettingDate(false)
    }
  }

  // 格式化日期显示
  const formatExamDate = () => {
    if (!examDate) return ""
    const date = new Date(examDate)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // 获取倒计时状态样式
  const getCountdownStyle = () => {
    if (daysLeft <= 30) return "text-red-500"
    if (daysLeft <= 90) return "text-orange-500"
    return "text-primary"
  }

  // 获取提示信息
  const getCountdownMessage = () => {
    if (daysLeft === 0) return "考试就在今天！加油！"
    if (daysLeft <= 7) return "最后冲刺阶段"
    if (daysLeft <= 30) return "时间紧迫，请抓紧复习"
    if (daysLeft <= 90) return "稳步推进，保持节奏"
    return "时间充裕，制定好计划"
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              考试倒计时
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempDate(examDate)
                setIsSettingDate(true)
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-1">{examName}</h3>
            <p className="text-sm text-muted-foreground mb-3">{formatExamDate()}</p>
            <div className={`text-5xl font-bold mb-2 ${getCountdownStyle()}`}>
              {daysLeft}
            </div>
            <p className="text-sm text-gray-500 mb-3">天</p>
            <p className="text-sm font-medium text-gray-600">
              {getCountdownMessage()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSettingDate} onOpenChange={setIsSettingDate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置考试日期</DialogTitle>
            <DialogDescription>
              请选择您的法律职业资格考试日期
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam-date">考试日期</Label>
              <Input
                id="exam-date"
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingDate(false)}>
              取消
            </Button>
            <Button onClick={handleSaveDate}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}