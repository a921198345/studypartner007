"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, Plus, Trash2 } from "lucide-react"
import { Footer } from "@/components/footer"
import { ExamCountdown } from "@/components/learning-plan/exam-countdown"
import { useToast } from "@/components/ui/use-toast"

interface Task {
  id: string
  content: string
  completed: boolean
  createdAt: string
}

interface PlanData {
  dailyTasks: Task[]
  weeklyTasks: Task[]
  monthlyTasks: Task[]
}

export default function LearningPlanPage() {
  const [planData, setPlanData] = useState<PlanData>({
    dailyTasks: [],
    weeklyTasks: [],
    monthlyTasks: []
  })
  const [newTaskContent, setNewTaskContent] = useState({
    daily: "",
    weekly: "",
    monthly: ""
  })
  const { toast } = useToast()

  // 从本地存储加载计划数据
  useEffect(() => {
    const savedPlan = localStorage.getItem("law-exam-plan")
    if (savedPlan) {
      setPlanData(JSON.parse(savedPlan))
    }
  }, [])

  // 保存计划数据到本地存储
  const savePlanData = (data: PlanData) => {
    localStorage.setItem("law-exam-plan", JSON.stringify(data))
    setPlanData(data)
  }

  // 生成任务ID
  const generateTaskId = () => {
    return Date.now().toString()
  }

  // 添加任务
  const addTask = (type: 'daily' | 'weekly' | 'monthly') => {
    const content = newTaskContent[type].trim()
    if (!content) {
      toast({
        variant: "destructive",
        title: "添加失败",
        description: "任务内容不能为空"
      })
      return
    }

    const newTask: Task = {
      id: generateTaskId(),
      content,
      completed: false,
      createdAt: new Date().toISOString()
    }

    const updatedPlan = {
      ...planData,
      [`${type}Tasks`]: [...planData[`${type}Tasks`], newTask]
    }

    savePlanData(updatedPlan)
    setNewTaskContent(prev => ({ ...prev, [type]: "" }))
    
    toast({
      title: "添加成功",
      description: "任务已添加到计划中"
    })
  }

  // 切换任务完成状态
  const toggleTask = (type: 'daily' | 'weekly' | 'monthly', taskId: string) => {
    const updatedTasks = planData[`${type}Tasks`].map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )

    const updatedPlan = {
      ...planData,
      [`${type}Tasks`]: updatedTasks
    }

    savePlanData(updatedPlan)
  }

  // 删除任务
  const deleteTask = (type: 'daily' | 'weekly' | 'monthly', taskId: string) => {
    const updatedTasks = planData[`${type}Tasks`].filter(task => task.id !== taskId)

    const updatedPlan = {
      ...planData,
      [`${type}Tasks`]: updatedTasks
    }

    savePlanData(updatedPlan)
    
    toast({
      title: "删除成功",
      description: "任务已从计划中移除"
    })
  }

  // 渲染任务列表
  const renderTaskList = (type: 'daily' | 'weekly' | 'monthly') => {
    const tasks = planData[`${type}Tasks`]
    const typeLabel = type === 'daily' ? '今日' : type === 'weekly' ? '本周' : '本月'

    return (
      <div className="space-y-4">
        {/* 添加任务输入框 */}
        <div className="flex gap-2">
          <Input
            placeholder={`输入${typeLabel}计划任务...`}
            value={newTaskContent[type]}
            onChange={(e) => setNewTaskContent(prev => ({ ...prev, [type]: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addTask(type)
              }
            }}
          />
          <Button onClick={() => addTask(type)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 任务列表 */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无{typeLabel}计划，点击上方添加任务
            </div>
          ) : (
            tasks.map(task => (
              <Card key={task.id} className={`p-4 ${task.completed ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(type, task.id)}
                    />
                    <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.content}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTask(type, task.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 完成统计 */}
        {tasks.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            已完成 {tasks.filter(t => t.completed).length} / {tasks.length} 项任务
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 学习计划管理 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>我的学习计划</CardTitle>
                  <CardDescription>
                    制定并管理您的学习计划，通过打勾标记完成状态
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="daily">
                    <TabsList className="mb-6 grid w-full grid-cols-3">
                      <TabsTrigger value="daily">今日计划</TabsTrigger>
                      <TabsTrigger value="weekly">本周计划</TabsTrigger>
                      <TabsTrigger value="monthly">本月计划</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily">
                      {renderTaskList('daily')}
                    </TabsContent>

                    <TabsContent value="weekly">
                      {renderTaskList('weekly')}
                    </TabsContent>

                    <TabsContent value="monthly">
                      {renderTaskList('monthly')}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* 考试倒计时 */}
            <div className="space-y-6">
              <ExamCountdown 
                examName="2025年法律职业资格考试" 
              />

              {/* 学习提示 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    制定计划小贴士
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">📌 <strong>今日计划</strong>：具体到每个学习任务，如"完成民法第三章阅读"</p>
                    <p className="mb-2">📅 <strong>本周计划</strong>：设定本周要完成的大目标，如"完成民法总则学习"</p>
                    <p className="mb-2">🎯 <strong>本月计划</strong>：制定月度里程碑，如"完成民法和刑法基础部分"</p>
                    <p>💡 建议每天晚上制定第二天的计划，每周日制定下周计划</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}