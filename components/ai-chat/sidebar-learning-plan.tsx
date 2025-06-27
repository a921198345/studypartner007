"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Calendar, Clock, Edit2, Plus } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { EditPlanForm } from "../../learning-plan/edit-plan-form"

interface Task {
  id: string
  title: string
  description: string
  duration: number // 分钟
  progress: number // 百分比
  subject: string
}

interface SidebarLearningPlanProps {
  totalHours?: number
  tasks?: Task[]
}

export function SidebarLearningPlan({ totalHours = 4, tasks = [] }: SidebarLearningPlanProps) {
  const [localTasks, setLocalTasks] = useState(
    tasks.length > 0
      ? tasks
      : [
          {
            id: "1",
            title: "民法总则",
            description: "第三章 民事法律行为\n第一节 一般规定\n第二节 意思表示",
            duration: 120, // 2小时
            progress: 45,
            subject: "民法",
          },
          {
            id: "2",
            title: "刑法分则",
            description: "第二章 危害公共安全罪\n第一节 放火、决水、爆炸等危害公共安全罪",
            duration: 120, // 2小时
            progress: 0,
            subject: "刑法",
          },
        ],
  )

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId)
    setIsEditDialogOpen(true)
  }

  const handleAddTask = () => {
    setEditingTaskId(null)
    setIsEditDialogOpen(true)
  }

  const handleSaveTask = (task: Task) => {
    if (editingTaskId) {
      // 更新现有任务
      setLocalTasks(localTasks.map((t) => (t.id === editingTaskId ? task : t)))
    } else {
      // 添加新任务
      const newTask = {
        ...task,
        id: `task-${Date.now()}`,
      }
      setLocalTasks([...localTasks, newTask])
    }
    setIsEditDialogOpen(false)
  }

  const handleDeleteTask = (taskId: string) => {
    setLocalTasks(localTasks.filter((t) => t.id !== taskId))
    setIsEditDialogOpen(false)
  }

  // 计算剩余时间
  const getRemainingTime = (duration: number, progress: number) => {
    const totalMinutes = duration
    const remainingMinutes = Math.round(totalMinutes * (1 - progress / 100))
    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60

    if (hours > 0) {
      return `${hours}小时${minutes > 0 ? minutes + "分钟" : ""}`
    }
    return `${minutes}分钟`
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          今日学习计划
        </CardTitle>
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          {totalHours}小时
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {localTasks.map((task) => (
          <Card key={task.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-base">{task.title}</h3>
                <Badge className="bg-blue-100 text-blue-800">{task.duration / 60}小时</Badge>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line mb-2">{task.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center">
                  <span>进度: {task.progress}%</span>
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full ml-2">
                    <div className="h-1.5 bg-primary rounded-full" style={{ width: `${task.progress}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span>剩余: {getRemainingTime(task.duration, task.progress)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleEditTask(task.id)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-1" /> 添加任务
          </Button>
          <Link href="/learning-plan">
            <Button variant="default" size="sm">
              查看完整计划
            </Button>
          </Link>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingTaskId ? "编辑学习任务" : "添加学习任务"}</DialogTitle>
            </DialogHeader>
            <EditPlanForm
              task={editingTaskId ? localTasks.find((t) => t.id === editingTaskId) : undefined}
              onSave={handleSaveTask}
              onDelete={editingTaskId ? () => handleDeleteTask(editingTaskId) : undefined}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
