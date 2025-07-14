"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Calendar, Clock, Plus, Edit2, BookOpen, FileText, Brain } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { EditPlanForm } from "./edit-plan-form"
import { DailyTaskList } from "./daily-task-list"

interface Task {
  id: string
  title: string
  description: string
  duration: number // 分钟
  progress: number // 百分比
  subject: string
  completed: boolean
  type: "reading" | "knowledge_map" | "practice"
  link?: string
  planType: "daily" | "weekly" | "monthly"
  date: string // YYYY-MM-DD 格式
}

interface BasicPlanManagerProps {
  onBack?: () => void
}

export function BasicPlanManager({ onBack }: BasicPlanManagerProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // 加载保存的任务
  useEffect(() => {
    const savedTasks = localStorage.getItem('basic-study-tasks')
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks))
      } catch (error) {
        console.error('加载任务失败:', error)
      }
    }
  }, [])

  // 保存任务到本地存储
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem('basic-study-tasks', JSON.stringify(newTasks))
  }

  // 添加新任务
  const handleAddTask = () => {
    setEditingTask(null)
    setShowEditDialog(true)
  }

  // 编辑任务
  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowEditDialog(true)
  }

  // 保存任务
  const handleSaveTask = (taskData: Omit<Task, 'id' | 'completed' | 'type' | 'planType' | 'date'>) => {
    const today = new Date().toISOString().split('T')[0]
    
    if (editingTask) {
      // 更新现有任务
      const updatedTasks = tasks.map(task =>
        task.id === editingTask.id
          ? { ...task, ...taskData }
          : task
      )
      saveTasks(updatedTasks)
      toast({
        title: "任务更新成功",
        description: "学习任务已保存"
      })
    } else {
      // 添加新任务
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        completed: false,
        type: "reading", // 默认类型
        planType: activeTab,
        date: today
      }
      saveTasks([...tasks, newTask])
      toast({
        title: "任务添加成功",
        description: "新的学习任务已创建"
      })
    }
    
    setShowEditDialog(false)
    setEditingTask(null)
  }

  // 删除任务
  const handleDeleteTask = () => {
    if (editingTask) {
      const updatedTasks = tasks.filter(task => task.id !== editingTask.id)
      saveTasks(updatedTasks)
      setShowEditDialog(false)
      setEditingTask(null)
      toast({
        title: "任务删除成功",
        description: "学习任务已从计划中移除"
      })
    }
  }

  // 切换任务完成状态
  const handleTaskComplete = (taskId: string, completed: boolean) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed } : task
    )
    saveTasks(updatedTasks)
  }

  // 获取当前选中日期的任务
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => 
      task.planType === activeTab && 
      task.date === dateStr
    ).map(task => ({
      ...task,
      link: task.type === "knowledge_map" ? "/knowledge-map" : 
            task.type === "practice" ? "/question-bank" : undefined
    }))
  }

  // 获取计划统计
  const getPlanStats = () => {
    const planTasks = tasks.filter(task => task.planType === activeTab)
    const totalTasks = planTasks.length
    const completedTasks = planTasks.filter(task => task.completed).length
    const totalDuration = planTasks.reduce((sum, task) => sum + task.duration, 0)
    const completedDuration = planTasks.filter(task => task.completed).reduce((sum, task) => sum + task.duration, 0)

    return {
      totalTasks,
      completedTasks,
      totalDuration: Math.round(totalDuration / 60), // 转换为小时
      completedDuration: Math.round(completedDuration / 60),
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  }

  const stats = getPlanStats()
  const todayTasks = getTasksForDate(selectedDate)

  // 格式化日期显示
  const formatDateDisplay = (date: Date) => {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"]
    const weekday = weekdays[date.getDay()]
    return `${month}月${day}日 周${weekday}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部标题和返回按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">基础学习计划管理</h1>
          <p className="text-sm text-muted-foreground">手动创建和管理您的学习计划</p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            返回
          </Button>
        )}
      </div>

      {/* 计划类型选择 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            日计划
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            周计划
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            月计划
          </TabsTrigger>
        </TabsList>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="flex items-center p-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
                <p className="text-xs text-muted-foreground">总任务数</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
                <p className="text-xs text-muted-foreground">已完成</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Clock className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.completedDuration}h</p>
                <p className="text-xs text-muted-foreground">已学习时长</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Brain className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">完成率</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 计划内容区域 */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  今日学习计划 - {formatDateDisplay(selectedDate)}
                </CardTitle>
                <Button onClick={handleAddTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DailyTaskList
                date={selectedDate}
                tasks={todayTasks}
                onTaskComplete={handleTaskComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  本周学习计划
                </CardTitle>
                <Button onClick={handleAddTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>周计划功能开发中...</p>
                <p className="text-sm">您可以使用日计划功能管理学习任务</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  本月学习计划
                </CardTitle>
                <Button onClick={handleAddTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>月计划功能开发中...</p>
                <p className="text-sm">您可以使用日计划功能管理学习任务</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑任务对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "编辑学习任务" : "添加学习任务"}
            </DialogTitle>
          </DialogHeader>
          <EditPlanForm
            task={editingTask}
            onSave={handleSaveTask}
            onDelete={editingTask ? handleDeleteTask : undefined}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}