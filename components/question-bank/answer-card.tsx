"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import { useState, useEffect } from "react"

interface AnswerCardProps {
  totalQuestions: number
  answeredQuestions: number
  correctAnswers: number
  startTime: Date
  onFinish?: () => void
  isCorrect: boolean
  correctAnswer: string
  explanation: string
}

export function AnswerCard({
  totalQuestions,
  answeredQuestions,
  correctAnswers,
  startTime,
  onFinish,
  isCorrect,
  correctAnswer,
  explanation,
}: AnswerCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // 添加调试日志，检查解析内容
  console.log("AnswerCard接收到的解析内容:", explanation);
  console.log("解析内容类型:", typeof explanation);

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
    <Card className="mb-6">
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

        <div className="flex items-center mb-4">
          {isCorrect ? (
            <div className="flex items-center text-green-500">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span className="font-medium">回答正确</span>
            </div>
          ) : (
            <div className="flex items-center text-red-500">
              <XCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">回答错误</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">正确答案:</div>
          <div className="font-medium">{correctAnswer}</div>
        </div>

        {explanation && explanation.trim() !== "" ? (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">题目解析</h3>
            <div className="text-sm bg-gray-50 p-4 rounded-md whitespace-pre-wrap">{explanation}</div>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">题目解析</h3>
            <div className="text-sm bg-gray-50 p-4 rounded-md">暂无解析</div>
          </div>
        )}

        {answeredQuestions === totalQuestions && (
          <Button className="w-full" onClick={onFinish}>
            完成答题
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
