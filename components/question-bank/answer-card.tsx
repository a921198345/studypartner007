"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"
import { useState, useEffect } from "react"

interface AnswerCardProps {
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  startTime: Date
  onFinish?: () => void
}

export function AnswerCard({
  totalQuestions,
  answeredQuestions,
  correctAnswers,
  startTime,
  onFinish,
}: AnswerCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // 计算已用时间
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours > 0 ? hours + "小时" : ""}${minutes}分${secs}秒`
  }

  // 计算正确率
  const accuracy = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0

  // 计算进度
  const progress = Math.round((answeredQuestions / totalQuestions) * 100)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>答题进度</span>
          <Badge className="badge-outline">
            <Clock className="h-3 w-3 mr-1" />
            已用时间: {formatTime(elapsedTime)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>完成进度</span>
            <span className="font-medium">
              {answeredQuestions}/{totalQuestions}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>正确率</span>
            <span className="font-medium">{accuracy}%</span>
          </div>
          <Progress
            value={accuracy}
            className="h-2"
            indicatorClassName={accuracy >= 60 ? "bg-green-500" : "bg-red-500"}
          />
        </div>

        <div className="pt-2 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg font-semibold text-green-500">{correctAnswers}</div>
            <div className="text-xs text-gray-500">答对题数</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg font-semibold text-red-500">{answeredQuestions - correctAnswers}</div>
            <div className="text-xs text-gray-500">答错题数</div>
          </div>
        </div>

        {answeredQuestions === totalQuestions && (
          <Button className="w-full" onClick={onFinish}>
            完成答题
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
