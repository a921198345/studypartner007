"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Badge } from "../ui/badge"
import { Textarea } from "../ui/textarea"
import { Alert, AlertDescription } from "../ui/alert"
import { Separator } from "../ui/separator"
import { 
  Eye, 
  Edit, 
  RefreshCw, 
  CheckCircle, 
  MessageSquare, 
  Lightbulb,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Send
} from "lucide-react"
import { OverallStrategyDisplay } from "./displays/overall-strategy-display"
import { DailyPlanDisplay } from "./displays/daily-plan-display"
import { WeeklyPlanDisplay } from "./displays/weekly-plan-display"
import { StudyPlanFormData } from "./study-plan-wizard-v2"

interface PlanPreviewProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  generatedPlan: any
  isLoading: boolean
  conflicts?: any[]
  onRegeneratePlan: () => void
  onConfirmPlan: (planData: any) => void
}

export function PlanPreview({ 
  data, 
  onChange, 
  generatedPlan, 
  isLoading, 
  conflicts = [],
  onRegeneratePlan,
  onConfirmPlan
}: PlanPreviewProps) {
  const [activeTab, setActiveTab] = useState("strategy")
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null)

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">正在生成您的专属学习计划...</h3>
          <p className="text-sm text-muted-foreground">
            AI正在根据您的设置生成最优学习方案，请稍候
          </p>
        </div>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    )
  }

  // 如果没有生成计划，显示提示
  if (!generatedPlan) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">准备生成学习计划</h3>
        <p className="text-sm text-muted-foreground">
          点击"生成计划"按钮开始创建您的专属学习方案
        </p>
      </div>
    )
  }

  // 处理反馈提交
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      return
    }

    try {
      // 更新表单数据，添加用户反馈
      const updatedData = {
        ...data,
        user_feedback: feedbackText
      }
      onChange(updatedData)

      // 重新生成计划
      await onRegeneratePlan()
      
      // 清空反馈
      setFeedbackText("")
      setFeedbackType(null)
      setShowFeedback(false)
      
    } catch (error) {
      console.error('提交反馈失败:', error)
    }
  }

  // 处理计划确认
  const handleConfirmPlan = () => {
    onConfirmPlan(generatedPlan)
  }

  return (
    <div className="space-y-6">
      {/* 冲突警告 */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">检测到计划冲突：</p>
              <ul className="list-disc list-inside space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm">{conflict.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 计划概览卡片 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            学习计划生成成功
          </CardTitle>
          <CardDescription>
            AI已根据您的设置生成个性化学习计划，请查看详情并确认
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(data.subject_progress).length}
              </div>
              <div className="text-sm text-muted-foreground">学习科目</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.study_schedule.daily_hours}h
              </div>
              <div className="text-sm text-muted-foreground">每日学习</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {data.study_schedule.weekly_days}
              </div>
              <div className="text-sm text-muted-foreground">每周天数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {data.weak_subjects?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">重点科目</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 三级计划展示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            学习计划详情
          </CardTitle>
          <CardDescription>
            查看AI为您定制的三级学习计划结构
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strategy" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                总体策略
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                今日计划
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                本周计划
              </TabsTrigger>
            </TabsList>

            <TabsContent value="strategy" className="mt-6">
              <OverallStrategyDisplay 
                content={generatedPlan.overall_strategy}
                userData={data}
              />
            </TabsContent>

            <TabsContent value="daily" className="mt-6">
              <DailyPlanDisplay 
                content={generatedPlan.daily_plan}
                schedule={data.study_schedule}
              />
            </TabsContent>

            <TabsContent value="weekly" className="mt-6">
              <WeeklyPlanDisplay 
                content={generatedPlan.weekly_plan}
                subjectOrder={data.subject_order}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 反馈区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            计划反馈
          </CardTitle>
          <CardDescription>
            对生成的计划有建议？告诉我们，我们会重新优化
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showFeedback ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedback(true)
                  setFeedbackType('positive')
                }}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="h-4 w-4 text-green-600" />
                很满意
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedback(true)
                  setFeedbackType('negative')
                }}
                className="flex items-center gap-2"
              >
                <ThumbsDown className="h-4 w-4 text-red-600" />
                需要调整
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFeedback(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                详细反馈
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                {feedbackType === 'positive' && (
                  <>
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      很高兴您满意这个计划！有什么具体建议吗？
                    </span>
                  </>
                )}
                {feedbackType === 'negative' && (
                  <>
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      请告诉我们哪里需要调整，我们会重新生成
                    </span>
                  </>
                )}
                {!feedbackType && (
                  <>
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      请详细说明您的建议和需求
                    </span>
                  </>
                )}
              </div>
              
              <Textarea
                placeholder="请详细说明您的建议，比如：
                
• 希望调整某个科目的学习时间
• 需要更改学习顺序
• 时间安排不太合适
• 难度设置需要调整
• 其他具体建议...

您的反馈越详细，重新生成的计划就越符合您的需求。"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              
              <div className="flex gap-3">
                <Button
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackText.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  重新生成计划
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedback(false)
                    setFeedbackText("")
                    setFeedbackType(null)
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4 pt-4">
        <Button
          onClick={onRegeneratePlan}
          variant="outline"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          重新生成
        </Button>
        
        <Button
          onClick={handleConfirmPlan}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          确认计划，开始学习
        </Button>
      </div>

      {/* 使用提示 */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 mb-2">使用提示</p>
            <ul className="space-y-1 text-blue-800 text-xs">
              <li>• 点击不同标签页查看三级计划的详细内容</li>
              <li>• 如果计划不满意，可以提供反馈重新生成</li>
              <li>• 确认计划后，系统会保存您的学习偏好，下次使用更便捷</li>
              <li>• 计划生成后可以在学习计划页面随时查看和调整</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}