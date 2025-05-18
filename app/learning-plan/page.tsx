"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Target, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react"
import { Footer } from "@/components/footer"
import { useRouter } from "next/navigation"
import { PlanWizard } from "@/components/learning-plan/plan-wizard"
import { DailyTaskList } from "@/components/learning-plan/daily-task-list"
import { WeeklyPlanView } from "@/components/learning-plan/weekly-plan-view"
import { MonthlyPlanView } from "@/components/learning-plan/monthly-plan-view"
import { LearningStats } from "@/components/learning-plan/learning-stats"
import { LearningTips } from "@/components/learning-plan/learning-tips"
import { ExamCountdown } from "@/components/learning-plan/exam-countdown"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LearningPlanPage() {
  const router = useRouter()
  const [hasPlan, setHasPlan] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [planData, setPlanData] = useState<any>(null)
  const [isFirstVisit, setIsFirstVisit] = useState(true)

  // 模拟从服务器获取计划数据
  useEffect(() => {
    // 这里应该是从API获取数据
    // 模拟已有计划的情况
    const savedPlan = localStorage.getItem("learningPlan")
    if (savedPlan) {
      setPlanData(JSON.parse(savedPlan))
      setHasPlan(true)
      setIsFirstVisit(false)
    }
  }, [])

  const handleCreatePlan = (data: any) => {
    // 这里应该是发送到API
    setPlanData(data)
    setHasPlan(true)
    setShowWizard(false)
    localStorage.setItem("learningPlan", JSON.stringify(data))
  }

  const handleStartNow = () => {
    if (isFirstVisit) {
      setShowWizard(true)
      setIsFirstVisit(false)
    } else {
      router.push("/ai-chat")
    }
  }

  // 模拟任务数据
  const today = new Date()
  const todayTasks = [
    {
      id: "1",
      type: "reading",
      title: "民法总则",
      description: "第三章 民事法律行为\n第一节 一般规定\n第二节 意思表示",
      duration: 60,
      completed: false,
      subject: "民法",
      link: "/knowledge-map",
    },
    {
      id: "2",
      type: "knowledge_map",
      title: "知识导图学习",
      description: "民事法律行为知识导图\n重点关注有效要件和无效情形",
      duration: 30,
      completed: false,
      subject: "民法",
      link: "/knowledge-map",
    },
    {
      id: "3",
      type: "practice",
      title: "真题练习",
      description: "民法总则 - 民事法律行为专项练习\n10道题目",
      duration: 30,
      completed: false,
      subject: "民法",
      link: "/question-bank",
    },
  ]

  const handleTaskComplete = (taskId: string, completed: boolean) => {
    // 这里应该是发送到API
    console.log(`Task ${taskId} marked as ${completed ? "completed" : "incomplete"}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8 gradient-text">学习计划</h1>

          {!hasPlan && !showWizard && (
            <div className="max-w-3xl mx-auto text-center">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl">开始您的法考备考之旅</CardTitle>
                  <CardDescription>定制专属学习计划，科学规划备考时间，提高学习效率</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        <Calendar className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-medium">科学规划时间</h3>
                      <p className="text-sm text-gray-500">根据您的备考时间和学习习惯，合理安排每日学习任务</p>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-medium">个性化学习路径</h3>
                      <p className="text-sm text-gray-500">根据您的学习进度和薄弱环节，定制专属学习路径</p>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        <CheckCircle className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-medium">进度跟踪与调整</h3>
                      <p className="text-sm text-gray-500">实时记录学习进度，智能调整学习计划，确保备考效果</p>
                    </Card>
                  </div>

                  <div className="pt-4">
                    <Button size="lg" onClick={handleStartNow} className="mx-auto">
                      定制我的学习计划 <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {showWizard && <PlanWizard onComplete={handleCreatePlan} onCancel={() => setShowWizard(false)} />}

          {hasPlan && !showWizard && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>您的学习计划</CardTitle>
                    <CardDescription>
                      基于您的目标和时间安排，我们为您制定了以下学习计划。您可以随时调整计划内容。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="daily">
                      <TabsList className="mb-4">
                        <TabsTrigger value="daily">今日计划</TabsTrigger>
                        <TabsTrigger value="weekly">本周计划</TabsTrigger>
                        <TabsTrigger value="monthly">月度计划</TabsTrigger>
                      </TabsList>

                      <TabsContent value="daily" className="space-y-4">
                        <DailyTaskList date={today} tasks={todayTasks} onTaskComplete={handleTaskComplete} />
                      </TabsContent>

                      <TabsContent value="weekly">
                        <WeeklyPlanView startDate={today} studyHours={planData?.studyHours || 2} />
                      </TabsContent>

                      <TabsContent value="monthly">
                        <MonthlyPlanView
                          month={today.getMonth()}
                          year={today.getFullYear()}
                          goal={planData?.selectedGoal || "通过考试"}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setShowWizard(true)}>
                      调整计划
                    </Button>
                    <Button>开始今日学习</Button>
                  </CardFooter>
                </Card>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>学习提醒</AlertTitle>
                  <AlertDescription>您已连续2天未完成学习任务，请及时安排学习以避免进度落后。</AlertDescription>
                </Alert>
              </div>

              <div className="space-y-6">
                <LearningStats
                  totalProgress={35}
                  dailyHours={0}
                  weeklyHours={4}
                  studyHours={planData?.studyHours || 2}
                  weeklyStudyDays={planData?.weeklyStudyDays || 5}
                  streak={0}
                />

                <LearningTips />

                <ExamCountdown examName="2025年法律职业资格考试" daysLeft={120} />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
