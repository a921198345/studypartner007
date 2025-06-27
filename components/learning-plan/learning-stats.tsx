"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"

interface LearningStatsProps {
  totalProgress: number
  dailyHours: number
  weeklyHours: number
  studyHours: number
  weeklyStudyDays: number
  streak: number
}

export function LearningStats({
  totalProgress,
  dailyHours,
  weeklyHours,
  studyHours,
  weeklyStudyDays,
  streak,
}: LearningStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">学习进度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>总体进度</span>
            <span className="font-medium">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>今日完成</span>
            <span className="font-medium">
              {dailyHours}/{studyHours}小时
            </span>
          </div>
          <Progress value={(dailyHours / studyHours) * 100} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>本周完成</span>
            <span className="font-medium">
              {weeklyHours}/{studyHours * weeklyStudyDays}小时
            </span>
          </div>
          <Progress value={(weeklyHours / (studyHours * weeklyStudyDays)) * 100} className="h-2" />
        </div>

        <div className="pt-2 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg font-semibold text-primary">{streak}天</div>
            <div className="text-xs text-gray-500">连续学习</div>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <div className="text-lg font-semibold text-primary">{dailyHours}h</div>
            <div className="text-xs text-gray-500">今日学习</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
