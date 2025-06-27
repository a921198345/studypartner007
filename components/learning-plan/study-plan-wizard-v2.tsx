"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "../ui/alert"
import { SubjectProgressStep } from "./steps/subject-progress-step"
import { SubjectOrderStep } from "./steps/subject-order-step"
import { ExamCountdownStep } from "./steps/exam-countdown-step"
import { CustomNotesStepSimple } from "./steps/custom-notes-step-simple"
import { PlanPreviewSimple } from "./plan-preview-simple"
import { useToast } from "../ui/use-toast"
// import { useStudyPlanPreferences } from "../../../hooks/useStudyPlanPreferences" // 暂时注释掉，使用简化版本

// 步骤配置
const STEPS = [
  {
    id: 1,
    title: "学习进度",
    description: "选择各科目当前学习状态",
    component: SubjectProgressStep
  },
  {
    id: 2,
    title: "科目顺序",
    description: "设置科目学习优先级",
    component: SubjectOrderStep
  },
  {
    id: 3,
    title: "法考倒计时",
    description: "设置法考日期和学习安排",
    component: ExamCountdownStep
  },
  {
    id: 4,
    title: "个人说明",
    description: "添加特殊需求和偏好",
    component: CustomNotesStepSimple
  },
  {
    id: 5,
    title: "计划预览",
    description: "查看并确认学习计划",
    component: PlanPreviewSimple
  }
]

// 科目列表配置
export const SUBJECTS = [
  "民法", "刑法", "行政法", "刑事诉讼法", 
  "民事诉讼法", "商经法", "理论法", "三国法"
]

// 主向导组件接口
interface StudyPlanWizardV2Props {
  onComplete: (planData: any) => void
  onCancel?: () => void
  initialData?: Partial<StudyPlanFormData>
  className?: string
}

// 表单数据类型定义
export interface StudyPlanFormData {
  // 步骤1：科目进度数据
  subject_progress: Record<string, {
    status: 'completed' | 'in_progress' | 'not_started'
    progress: number // 0-100
    chapters?: string[] // 具体章节信息
    completedSections?: string[] // 民法等科目的详细小节信息
  }>
  
  // 步骤2：科目顺序数据
  subject_order: Array<{
    subject: string
    priority: number
    custom_weight?: number
  }>
  order_method: 'ai' | 'manual'
  
  // 步骤3：法考倒计时和智能时间计算
  study_schedule: {
    daily_hours: number // 智能计算的每日学习时长
    weekly_days: number // 用户选择的每周学习天数
    preferred_times?: string[] // ["09:00-12:00", "19:00-22:00"]
    break_frequency?: number // 分钟
  }
  exam_date: string // 法考日期
  calculated_total_hours?: number // 计算出的总学习时长
  
  // 步骤4：自定义说明
  custom_notes: string
  weak_subjects: string[]
  learning_goals: string[]
  special_requirements: string
  
  // 用户偏好
  preferences: {
    difficulty_preference: 'gradual' | 'intensive' | 'flexible'
    learning_style: 'video_text' | 'text_only' | 'practice_focused'
    review_frequency: 'daily' | 'weekly' | 'biweekly'
  }
}

export function StudyPlanWizardV2({ 
  onComplete, 
  onCancel, 
  initialData = {},
  className = ""
}: StudyPlanWizardV2Props) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState([])
  const [generatedPlan, setGeneratedPlan] = useState(null)
  
  // 简化的偏好管理（不依赖NextAuth）
  const [preferences, setPreferences] = useState(null)
  const [subjectsProgress, setSubjectsProgress] = useState([])
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  
  const updatePreferences = (updates: any) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }
  
  const updateSubjectsProgress = (progress: any[]) => {
    setSubjectsProgress(progress)
  }
  
  // 表单数据状态
  const [formData, setFormData] = useState<StudyPlanFormData>({
    subject_progress: {},
    subject_order: [],
    order_method: 'ai',
    study_schedule: {
      daily_hours: 4, // 默认值，会被智能计算覆盖
      weekly_days: 5
    },
    exam_date: '2025-09-20', // 默认法考日期
    calculated_total_hours: 0,
    custom_notes: '',
    weak_subjects: [],
    learning_goals: [],
    special_requirements: '',
    preferences: {
      difficulty_preference: 'gradual',
      learning_style: 'video_text',
      review_frequency: 'weekly'
    },
    ...initialData
  })

  // 简化的初始化逻辑
  useEffect(() => {
    // 从本地存储加载用户偏好
    const savedPreferences = localStorage.getItem('study-plan-preferences')
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        setFormData(prev => ({
          ...prev,
          study_schedule: {
            ...prev.study_schedule,
            daily_hours: parsed.daily_hours || prev.study_schedule.daily_hours,
            weekly_days: parsed.weekly_days || prev.study_schedule.weekly_days
          },
          order_method: parsed.order_method || prev.order_method
        }))
      } catch (error) {
        console.warn('加载本地偏好失败:', error)
      }
    }
  }, [])
  // 更新表单数据并简化保存
  const updateFormData = (stepData: Partial<StudyPlanFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...stepData
    }))
    
    // 保存到本地存储
    if ('study_schedule' in stepData || 'order_method' in stepData || 'preferences' in stepData) {
      const updatedData = { ...formData, ...stepData }
      const preferences = {
        daily_hours: updatedData.study_schedule?.daily_hours,
        weekly_days: updatedData.study_schedule?.weekly_days,
        order_method: updatedData.order_method,
        learning_style: updatedData.preferences?.learning_style,
        difficulty_preference: updatedData.preferences?.difficulty_preference,
        review_frequency: updatedData.preferences?.review_frequency
      }
      localStorage.setItem('study-plan-preferences', JSON.stringify(preferences))
    }
  }

  // 验证当前步骤数据
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        // 验证至少选择了一个科目
        const hasSubjects = Object.keys(formData.subject_progress).length > 0
        if (!hasSubjects) {
          toast({
            variant: "destructive",
            title: "请至少选择一个科目的学习状态"
          })
          return false
        }
        return true
        
      case 2:
        // 验证科目顺序
        if (formData.order_method === 'manual' && formData.subject_order.length === 0) {
          toast({
            variant: "destructive",
            title: "请设置科目学习顺序"
          })
          return false
        }
        return true
        
      case 3:
        // 验证时间设置
        if (formData.study_schedule.daily_hours < 1 || formData.study_schedule.daily_hours > 12) {
          toast({
            variant: "destructive",
            title: "每日学习时长请设置在1-12小时之间"
          })
          return false
        }
        return true
        
      case 4:
        // 自定义说明是可选的
        return true
        
      default:
        return true
    }
  }

  // 处理下一步
  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
      
      // 如果进入预览步骤，生成计划
      if (currentStep === 4) {
        await generatePlan()
      }
    }
  }

  // 处理上一步
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 生成学习计划（流式传输）
  const generatePlan = async () => {
    setIsLoading(true)
    setConflicts([])
    
    try {
      const response = await fetch('/api/study-plan/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let streamedPlan = {
        overallStrategy: '',
        dailyPlan: '',
        weeklyPlan: ''
      }
      
      // 逐步更新计划内容，实现流式显示
      let currentSection = 'overall'
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (!data || data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'start':
                  // 开始生成
                  break
                  
                case 'content':
                  // 流式内容更新
                  if (parsed.section === 'overall') {
                    streamedPlan.overallStrategy += parsed.content
                  } else if (parsed.section === 'daily') {
                    streamedPlan.dailyPlan += parsed.content
                  } else if (parsed.section === 'weekly') {
                    streamedPlan.weeklyPlan += parsed.content
                  }
                  
                  // 实时更新显示
                  setGeneratedPlan({ ...streamedPlan })
                  break
                  
                case 'complete':
                  // 生成完成
                  setGeneratedPlan(parsed.plan)
                  toast({
                    title: "学习计划生成成功！",
                    description: "请查看计划详情并确认"
                  })
                  break
                  
                case 'error':
                  throw new Error(parsed.error || '生成计划失败')
              }
            } catch (e) {
              console.error('解析流数据错误:', e)
            }
          }
        }
      }

    } catch (error) {
      console.error('生成计划失败:', error)
      
      // 智能错误分类和用户友好提示
      let title = "生成计划失败"
      let description = "请稍后重试"
      
      if (error.message?.includes('402') || error.message?.includes('Insufficient Balance')) {
        title = "服务暂时不可用"
        description = "AI 服务额度已用完，请联系管理员充值或稍后再试"
      } else if (error.message?.includes('API请求频率过高') || error.message?.includes('请等待')) {
        title = "请求过于频繁"
        description = "为保证服务质量，请等待1分钟后重试"
      } else if (error.message?.includes('429')) {
        title = "服务繁忙"
        description = "当前用户较多，请稍等片刻再试"
      } else if (error.message?.includes('网络') || error.message?.includes('超时')) {
        title = "网络连接异常"
        description = "请检查网络连接后重试"
      } else if (error.message?.includes('API密钥')) {
        title = "服务配置错误"
        description = "请联系管理员检查服务配置"
      }
      
      toast({
        variant: "destructive",
        title,
        description
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理计划确认
  const handlePlanConfirm = async (planData: any) => {
    try {
      // 保存用户偏好
      await saveUserPreferences()
      
      // 调用父组件的完成回调
      onComplete(planData)
      
      toast({
        title: "学习计划创建成功！",
        description: "开始您的法考学习之旅吧"
      })
      
    } catch (error) {
      console.error('保存计划失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "请重试"
      })
    }
  }

  // 保存用户偏好
  const saveUserPreferences = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const preferencesData = {
        daily_hours: formData.study_schedule.daily_hours,
        weekly_days: formData.study_schedule.weekly_days,
        order_method: formData.order_method,
        learning_style: formData.preferences.learning_style,
        difficulty_preference: formData.preferences.difficulty_preference,
        review_frequency: formData.preferences.review_frequency,
        preferred_study_times: formData.study_schedule.preferred_times,
        weak_subjects: formData.weak_subjects
      }

      await fetch('/api/study-plan/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferencesData)
      })
    } catch (error) {
      console.warn('保存用户偏好失败:', error)
    }
  }

  // 当前步骤组件
  const CurrentStepComponent = STEPS[currentStep - 1]?.component
  const currentStepConfig = STEPS[currentStep - 1]

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* 进度指示器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>创建学习计划</CardTitle>
              <CardDescription>
                步骤 {currentStep} / {STEPS.length}: {currentStepConfig?.description}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round((currentStep / STEPS.length) * 100)}% 完成
            </div>
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="mt-4" />
        </CardHeader>
      </Card>

      {/* 冲突警告 */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">检测到以下计划冲突：</p>
              <ul className="list-disc list-inside space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm">{conflict.message}</li>
                ))}
              </ul>
              <p className="text-sm">您可以继续生成计划或返回修改设置。</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 当前步骤内容 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{currentStepConfig?.title}</CardTitle>
              <CardDescription>{currentStepConfig?.description}</CardDescription>
            </div>
            {isAutoSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                自动保存中...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {CurrentStepComponent && (
            <CurrentStepComponent
              data={formData}
              onChange={updateFormData}
              userPreferences={preferences}
              conflicts={conflicts}
              generatedPlan={generatedPlan}
              isLoading={isLoading}
              onRegeneratePlan={generatePlan}
              onConfirmPlan={handlePlanConfirm}
            />
          )}
        </CardContent>
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              上一步
            </Button>
          )}
          {onCancel && currentStep === 1 && (
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              取消
            </Button>
          )}
        </div>

        <div className="space-x-2">
          {currentStep < STEPS.length && (
            <Button 
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === 4 ? '生成计划中...' : '处理中...'}
                </>
              ) : (
                <>
                  {currentStep === 4 ? '生成计划' : '下一步'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}