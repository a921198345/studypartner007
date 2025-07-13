"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, RefreshCw, Target, Check, BookOpen, AlertCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"
import { useFirstUseAuth } from '@/components/auth/first-use-auth-guard'
import { StudyPlanWizardSimple } from '@/components/learning-plan/study-plan-wizard-simple'
import { BasicPlanManager } from '@/components/learning-plan/basic-plan-manager'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PlanRenderer } from "@/components/learning-plan/plan-renderer"

interface StudyPlan {
  id: string
  title: string
  description: string
  subjects: string[]
  totalWeeks: number
  currentWeek: number
  progressPercentage: number
  // AI生成的三级计划内容
  generatedContent?: {
    overallStrategy: string
    dailyPlan: string
    weeklyPlan: string
    generatedAt: string
    settings: {
      dailyHours: number
      weeklyDays: number
      subjects: string[]
    }
  }
  // 向后兼容
  weeklyPlan?: any
  dailyPlan?: any
  createdAt: string
  lastUpdated: string
}

export default function LearningPlanPage() {
  const { checkAuthOnAction } = useFirstUseAuth('learning-plan')
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null)
  const [showPlanWizard, setShowPlanWizard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'overall'>('daily')
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})
  const [showBasicManager, setShowBasicManager] = useState(false)
  const { toast } = useToast()

  // 加载当前学习计划和完成状态
  useEffect(() => {
    loadCurrentPlan()
    loadCompletedTasks()
    
    // 调试：显示开发工具
    if (process.env.NODE_ENV === 'development') {
      const showDevTools = () => {
        console.log('=== 学习计划调试工具 ===')
        console.log('当前计划:', currentPlan)
        console.log('本地存储计划:', localStorage.getItem("current-study-plan"))
        console.log('清除计划: clearStudyPlan()')
        window.clearStudyPlan = () => {
          localStorage.removeItem("current-study-plan")
          setCurrentPlan(null)
          console.log('计划已清除')
        }
      }
      showDevTools()
    }
  }, [])

  const loadCurrentPlan = async () => {
    try {
      // 降级到本地存储
      const savedPlan = localStorage.getItem("current-study-plan")
      if (savedPlan) {
        const plan = JSON.parse(savedPlan)
        // 验证计划数据的完整性
        if (plan && plan.generatedContent) {
          setCurrentPlan(plan)
        } else {
          console.warn('计划数据不完整，缺少generatedContent')
          // 尝试修复旧格式的计划数据
          if (plan && (plan.dailyPlan || plan.weeklyPlan)) {
            plan.generatedContent = {
              dailyPlan: plan.dailyPlan || '',
              weeklyPlan: plan.weeklyPlan || '',
              overallStrategy: plan.overallStrategy || '',
              generatedAt: plan.createdAt || new Date().toISOString(),
              settings: {
                dailyHours: 3,
                weeklyDays: 6,
                subjects: plan.subjects || []
              }
            }
            setCurrentPlan(plan)
            // 保存修复后的数据
            localStorage.setItem("current-study-plan", JSON.stringify(plan))
          }
        }
      }
    } catch (error) {
      console.error('加载学习计划失败:', error)
      // 如果数据损坏，清除它
      localStorage.removeItem("current-study-plan")
    }
  }

  const loadCompletedTasks = () => {
    const saved = localStorage.getItem('completed-study-tasks')
    if (saved) {
      setCompletedTasks(JSON.parse(saved))
    }
  }

  const handleTaskToggle = (taskId: string) => {
    const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] }
    setCompletedTasks(updated)
    localStorage.setItem('completed-study-tasks', JSON.stringify(updated))
  }

  // 创建新的学习计划
  const createNewPlan = () => {
    checkAuthOnAction()
    setShowPlanWizard(true)
  }

  // 使用基础计划管理
  const useBasicManager = () => {
    checkAuthOnAction()
    setShowBasicManager(true)
  }

  // 处理计划生成完成（简化版）
  const handlePlanGenerated = async (planData: any) => {
    try {
      console.log('收到的简化计划数据:', planData)
      
      // 从简化表单数据中获取科目信息
      const activeSubjects = Object.keys(planData.subjectProgress || {}).filter(
        subject => planData.subjectProgress[subject]?.status !== '已完成'
      )
      
      // 创建简化的学习计划内容
      const generatedContent = {
        overallStrategy: planData.plan?.overallStrategy || `🎯 学习计划总体策略\n\n📊 当前学习状况分析：\n• 总计科目：${activeSubjects.length}个待学习科目\n• 每日学习时间：${planData.dailyHours}小时\n• 每周学习天数：${planData.weeklyDays}天\n${planData.customNotes ? `• 个人需求：${planData.customNotes}` : ''}\n\n🎯 学习目标：\n• 系统掌握法考核心知识点\n• 通过题库练习提升答题技能\n• 建立完整的法律知识框架\n\n📚 学习策略：\n• 教材学习 + 题库练习相结合\n• 重点科目优先，循序渐进\n• 及时复习，巩固记忆\n• 利用知识导图理清脉络`,
        dailyPlan: planData.plan?.dailyPlan || `📅 每日学习计划（总时长${planData.dailyHours}小时）\n\n📚 核心学习时间（${Math.ceil(planData.dailyHours * 0.6)}小时）\n• 主要科目：${activeSubjects.slice(0, 2).join('、')}\n• 学习方式：教材阅读 + 笔记整理\n• 重点掌握：基本概念、法条理解、案例分析\n\n💻 题库练习时间（${Math.ceil(planData.dailyHours * 0.3)}小时）\n• 每日练题：20-30道选择题\n• 真题演练：历年法考题目\n• 错题整理：收藏重点错题\n\n📝 复习总结时间（${Math.ceil(planData.dailyHours * 0.1)}小时）\n• 知识点梳理：回顾今日学习内容\n• 明日预习：简要了解明日学习计划\n• 学习笔记：记录重要知识点和疑问`,
        weeklyPlan: planData.plan?.weeklyPlan || `🗓️ 本周学习计划\n\n📊 本周学习目标\n• 完成科目：${activeSubjects[0] || '主要科目'}的核心章节\n• 学习时间：每周${planData.weeklyDays}天，总计${planData.dailyHours * planData.weeklyDays}小时\n• 练题数量：${planData.weeklyDays * 25}道题目\n\n📚 具体学习安排：\n${Array.from({length: planData.weeklyDays}, (_, i) => {
          const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
          const subject = activeSubjects[i % activeSubjects.length] || '复习巩固'
          return `${days[i]}：${subject}（${planData.dailyHours}h） + 题库练习（20-25题）`
        }).join('\n')}\n\n📝 周末复习安排：\n• 周末总结：回顾本周学习内容\n• 错题专练：集中处理本周错题\n• 知识梳理：使用知识导图整理知识点`,
        generatedAt: new Date().toISOString(),
        settings: {
          dailyHours: planData.dailyHours || 3,
          weeklyDays: planData.weeklyDays || 5,
          subjects: activeSubjects
        }
      }
      
      // 保存生成的计划
      const newPlan: StudyPlan = {
        id: Date.now().toString(),
        title: "我的学习计划",
        description: "简化版个性化学习计划",
        subjects: activeSubjects,
        totalWeeks: 12,
        currentWeek: 1,
        progressPercentage: 0,
        generatedContent: generatedContent,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
      
      console.log('最终保存的简化计划:', newPlan)
      
      // 保存到状态和本地存储
      setCurrentPlan(newPlan)
      localStorage.setItem("current-study-plan", JSON.stringify(newPlan))
      
      // 关闭向导
      setShowPlanWizard(false)
      
      toast({
        title: "学习计划创建成功！",
        description: "您的简化学习计划已生成，开始学习之旅吧！"
      })
      
    } catch (error) {
      console.error('保存简化计划失败:', error)
      toast({
        variant: "destructive",
        title: "保存计划失败",
        description: "请重试"
      })
    }
  }

  // 处理任务变更
  const handleTasksChange = (tasks: any[], planType: 'daily' | 'weekly') => {
    // 将任务变更保存到本地存储
    const tasksKey = `${planType}-tasks`
    localStorage.setItem(tasksKey, JSON.stringify(tasks))
  }

  // 渲染带有复选框的计划内容
  const renderPlanWithCheckboxes = (content: string, planType: 'daily' | 'weekly') => {
    return (
      <PlanRenderer 
        content={content}
        planType={planType}
        completedTasks={completedTasks}
        onTaskToggle={handleTaskToggle}
        onTasksChange={(tasks) => handleTasksChange(tasks, planType)}
      />
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
          <div className="max-w-4xl mx-auto">


            {/* 如果没有计划，显示欢迎界面 */}
            {!currentPlan && !showBasicManager && (
              <div className="space-y-6">
                {/* 简化版AI计划 */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl flex items-center justify-center gap-2">
                      <Target className="h-6 w-6 text-blue-600" />
                      简化版学习计划
                    </CardTitle>
                    <CardDescription className="text-base">
                      通过简单的问卷设置，快速生成适合您的基础学习计划
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="flex justify-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          简单问卷设置
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          基础计划生成
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          日周计划管理
                        </div>
                      </div>
                    </div>
                    <Button size="lg" onClick={createNewPlan} className="bg-blue-600 hover:bg-blue-700">
                      开始制定计划
                    </Button>
                  </CardContent>
                </Card>

                {/* 基础版手动管理 */}
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl flex items-center justify-center gap-2">
                      <BookOpen className="h-6 w-6 text-green-600" />
                      基础手动管理
                    </CardTitle>
                    <CardDescription className="text-base">
                      完全手动创建和管理学习任务，不依赖AI生成
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="flex justify-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          手动添加任务
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          自由编辑管理
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          完全自主控制
                        </div>
                      </div>
                    </div>
                    <Button size="lg" onClick={useBasicManager} className="bg-green-600 hover:bg-green-700" variant="default">
                      基础管理模式
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 基础计划管理器 */}
            {showBasicManager && (
              <BasicPlanManager onBack={() => setShowBasicManager(false)} />
            )}

            {/* 如果有计划，显示计划内容 */}
            {currentPlan && !showBasicManager ? (
              <div className="space-y-6">
                {/* 切换按钮和法考倒计时 */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <div className="flex gap-2 overflow-x-auto">
                    <Button
                      variant={viewMode === 'daily' ? 'default' : 'outline'}
                      onClick={() => setViewMode('daily')}
                      className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                      size="sm"
                    >
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">今日学习计划</span>
                      <span className="sm:hidden">今日计划</span>
                    </Button>
                    <Button
                      variant={viewMode === 'weekly' ? 'default' : 'outline'}
                      onClick={() => setViewMode('weekly')}
                      className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                      size="sm"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">本周学习计划</span>
                      <span className="sm:hidden">本周计划</span>
                    </Button>
                    <Button
                      variant={viewMode === 'overall' ? 'default' : 'outline'}
                      onClick={() => setViewMode('overall')}
                      className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                      size="sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">总体规划</span>
                      <span className="sm:hidden">总体规划</span>
                    </Button>
                  </div>
                  
                  {/* 法考倒计时 */}
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 sm:px-4 py-2 rounded-lg border border-blue-200 text-center sm:text-left">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">
                      距离法考还有 <span className="font-bold text-base sm:text-lg text-red-600">{Math.max(0, Math.ceil((new Date('2025-09-20').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}</span> 天
                    </span>
                  </div>
                </div>

                {/* 根据选择显示不同计划 */}
                {currentPlan.generatedContent && (
                  currentPlan.generatedContent.dailyPlan || 
                  currentPlan.generatedContent.weeklyPlan || 
                  currentPlan.generatedContent.overallStrategy
                ) ? (
                  viewMode === 'daily' ? (
                    <Card className="border-green-200 bg-green-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5 text-green-600" />
                          今日学习计划
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currentPlan.generatedContent.dailyPlan ? (
                          renderPlanWithCheckboxes(currentPlan.generatedContent.dailyPlan, 'daily')
                        ) : (
                          <p className="text-gray-500">今日计划正在生成中...</p>
                        )}
                      </CardContent>
                    </Card>
                  ) : viewMode === 'weekly' ? (
                    <Card className="border-purple-200 bg-purple-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          本周学习计划
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currentPlan.generatedContent.weeklyPlan ? (
                          renderPlanWithCheckboxes(currentPlan.generatedContent.weeklyPlan, 'weekly')
                        ) : (
                          <p className="text-gray-500">本周计划正在生成中...</p>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          总体规划
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          {currentPlan.generatedContent.overallStrategy ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {currentPlan.generatedContent.overallStrategy}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-gray-500">总体规划正在生成中...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card className="border-yellow-200 bg-yellow-50/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        学习计划未完成
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        您的学习计划设置不完整。请重新制定计划以获得完整的AI学习建议。
                      </p>
                      <Button onClick={createNewPlan} className="w-full">
                        重新制定完整计划
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}

            {/* 重新制定计划按钮 - 只有在有AI计划时显示 */}
            {currentPlan && !showBasicManager && (
              <div className="mt-8 text-center space-y-4">
                <Button 
                  size="lg" 
                  onClick={createNewPlan} 
                  variant="outline"
                  className="flex items-center gap-2 mr-4"
                >
                  <RefreshCw className="h-5 w-5" />
                  重新制定计划
                </Button>
                <Button 
                  size="lg" 
                  onClick={useBasicManager} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  使用基础管理
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* 学习计划生成向导 */}
      <Dialog open={showPlanWizard} onOpenChange={setShowPlanWizard}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>制定个性化学习计划</DialogTitle>
            <DialogDescription>
              通过简化的问卷流程，快速制定适合您的学习计划
            </DialogDescription>
          </DialogHeader>
          <StudyPlanWizardSimple 
            onComplete={handlePlanGenerated}
            onCancel={() => setShowPlanWizard(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}