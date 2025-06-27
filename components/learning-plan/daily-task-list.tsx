"use client"

import { useState } from "react"
import { Card, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { BookOpen, Brain, FileText, Calendar, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Task {
  id: string
  type: "reading" | "knowledge_map" | "practice"
  title: string
  description: string
  duration: number // 分钟
  completed: boolean
  subject: string
  link?: string
}

interface DailyTaskListProps {
  date: Date
  tasks: Task[]
  onTaskComplete: (taskId: string, completed: boolean) => void
}

export function DailyTaskList({ date, tasks, onTaskComplete }: DailyTaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // 格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
    const weekday = weekdays[date.getDay()]

    return `${year}年${month}月${day}日 ${weekday}`
  }

  // 切换任务展开状态
  const toggleTaskExpanded = (taskId: string) => {
    const newExpandedTasks = new Set(expandedTasks)
    if (expandedTasks.has(taskId)) {
      newExpandedTasks.delete(taskId)
    } else {
      newExpandedTasks.add(taskId)
    }
    setExpandedTasks(newExpandedTasks)
  }

  // 计算总时长
  const totalDuration = tasks.reduce((total, task) => total + task.duration, 0)

  // 计算已完成时长
  const completedDuration = tasks.filter((task) => task.completed).reduce((total, task) => total + task.duration, 0)

  // 计算完成进度
  const completionProgress =
    tasks.length > 0 ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100) : 0

  // 获取任务图标
  const getTaskIcon = (type: Task["type"]) => {
    switch (type) {
      case "reading":
        return <BookOpen className="h-4 w-4 mr-2 text-primary" />
      case "knowledge_map":
        return <Brain className="h-4 w-4 mr-2 text-primary" />
      case "practice":
        return <FileText className="h-4 w-4 mr-2 text-primary" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg flex items-center">
          <Calendar className="h-5 w-5 text-primary mr-2" />
          {formatDate(date)}
        </h3>
        <Badge className="badge">
          <Clock className="h-3 w-3 mr-1" />
          {completedDuration}/{totalDuration} 分钟
        </Badge>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${completionProgress}%` }}></div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`border-l-4 ${task.completed ? "border-l-green-500" : "border-l-primary"} transition-all hover:shadow-md`}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => onTaskComplete(task.id, checked as boolean)}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className={`font-medium flex items-center cursor-pointer ${task.completed ? "line-through text-gray-500" : ""}`}
                  >
                    {getTaskIcon(task.type)}
                    {task.title}
                  </label>
                </div>
                <Badge className="badge">{task.duration}分钟</Badge>
              </div>

              <div className={`overflow-hidden transition-all ${expandedTasks.has(task.id) ? "max-h-40" : "max-h-0"}`}>
                <p className="text-sm text-gray-600 mt-2 mb-3 whitespace-pre-line">{task.description}</p>

                {task.link && (
                  <div className="flex justify-end">
                    <Link href={task.link}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {task.type === "reading" && "开始学习"}
                        {task.type === "knowledge_map" && "查看导图"}
                        {task.type === "practice" && "开始做题"}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{task.subject}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleTaskExpanded(task.id)}>
                  {expandedTasks.has(task.id) ? "收起" : "详情"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card className="border-dashed border-2 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-12 w-12 text-gray-300 mb-2" />
            <h3 className="text-lg font-medium text-gray-500">今日暂无学习任务</h3>
            <p className="text-sm text-gray-400 mt-1">您可以休息一下，或者提前开始明天的学习计划</p>
          </div>
        </Card>
      )}

      {tasks.every((task) => task.completed) && tasks.length > 0 && (
        <Card className="border-green-200 bg-green-50 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <h3 className="text-lg font-medium text-green-700">恭喜！今日学习任务已全部完成</h3>
            <p className="text-sm text-green-600 mt-1">坚持每日学习，成功将不会远离你</p>
          </div>
        </Card>
      )}
    </div>
  )
}
