"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, BookOpen, Clock } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

// 按文档定义的8个科目
const SUBJECTS = [
  "民法", "刑法", "行政法", "刑事诉讼法", 
  "民事诉讼法", "商经法", "理论法", "三国法"
]

// 简化的数据结构，严格按文档要求
interface FormData {
  subjectProgress: Record<string, {
    status: '已完成' | '未开始' | '进行中'
    progress: number
  }>
  subjectOrder: string[]
  orderMethod: 'ai' | 'manual'
  dailyHours: number
  weeklyDays: number
  customNotes: string
}

interface Props {
  onComplete: (data: any) => void
  onCancel?: () => void
}

export function StudyPlanWizardSimple({ onComplete, onCancel }: Props) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    subjectProgress: {},
    subjectOrder: [],
    orderMethod: 'ai',
    dailyHours: 3,
    weeklyDays: 5,
    customNotes: ''
  })

  // 加载用户历史偏好
  useEffect(() => {
    const savedPreferences = localStorage.getItem('study-plan-preferences')
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences)
        setFormData(prev => ({
          ...prev,
          dailyHours: prefs.dailyHours || 3,
          weeklyDays: prefs.weeklyDays || 5,
          orderMethod: prefs.orderMethod || 'ai'
        }))
      } catch (error) {
        console.warn('加载偏好失败:', error)
      }
    }
  }, [])

  // 步骤1：选择学习进度
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">选择各科目当前学习状态</h3>
        <p className="text-sm text-muted-foreground mb-4">
          请如实选择您对各科目的掌握情况
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBJECTS.map((subject) => {
          const progress = formData.subjectProgress[subject]
          const status = progress?.status || '未开始'
          
          return (
            <Card key={subject} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">{subject}</span>
              </div>
              
              <RadioGroup
                value={status}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    subjectProgress: {
                      ...prev.subjectProgress,
                      [subject]: {
                        status: value as any,
                        progress: value === '已完成' ? 100 : 
                                value === '未开始' ? 0 : 50
                      }
                    }
                  }))
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="已完成" id={`${subject}-completed`} />
                  <Label htmlFor={`${subject}-completed`}>已完成</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="未开始" id={`${subject}-not-started`} />
                  <Label htmlFor={`${subject}-not-started`}>未开始</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="进行中" id={`${subject}-in-progress`} />
                  <Label htmlFor={`${subject}-in-progress`}>进行中</Label>
                </div>
              </RadioGroup>

              {/* 步骤1.1：具体进度选择（仅对"进行中"科目） */}
              {status === '进行中' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium">具体学习进度</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>刚开始</span>
                      <span>过半</span>
                      <span>接近完成</span>
                    </div>
                    <div className="flex gap-2">
                      {[25, 50, 75].map((percent) => (
                        <Button
                          key={percent}
                          variant={progress?.progress === percent ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              subjectProgress: {
                                ...prev.subjectProgress,
                                [subject]: {
                                  ...prev.subjectProgress[subject],
                                  progress: percent
                                }
                              }
                            }))
                          }}
                        >
                          {percent}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )

  // 步骤2：科目学习顺序
  const renderStep2 = () => {
    // 获取未完成的科目
    const unfinishedSubjects = SUBJECTS.filter(subject => 
      formData.subjectProgress[subject]?.status !== '已完成'
    )

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">设置科目学习顺序</h3>
          <p className="text-sm text-muted-foreground mb-4">
            为未完成的科目安排学习优先级
          </p>
        </div>

        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">选择排序方式</Label>
              <RadioGroup
                value={formData.orderMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, orderMethod: value as any }))}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ai" id="ai-order" />
                  <Label htmlFor="ai-order">AI智能排序（推荐）</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual-order" />
                  <Label htmlFor="manual-order">手动排序</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.orderMethod === 'ai' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 AI将根据您的学习进度、科目重要程度、难易程度和关联性来智能排序
                </p>
              </div>
            )}

            {formData.orderMethod === 'manual' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">拖拽调整顺序（简化版）</Label>
                <div className="space-y-2">
                  {unfinishedSubjects.map((subject, index) => (
                    <div key={subject} className="p-2 border rounded flex items-center justify-between">
                      <span>{index + 1}. {subject}</span>
                      <div className="space-x-1">
                        {index > 0 && (
                          <Button size="sm" variant="outline" onClick={() => {
                            const newOrder = [...unfinishedSubjects]
                            const temp = newOrder[index]
                            newOrder[index] = newOrder[index - 1]
                            newOrder[index - 1] = temp
                            setFormData(prev => ({ ...prev, subjectOrder: newOrder }))
                          }}>↑</Button>
                        )}
                        {index < unfinishedSubjects.length - 1 && (
                          <Button size="sm" variant="outline" onClick={() => {
                            const newOrder = [...unfinishedSubjects]
                            const temp = newOrder[index]
                            newOrder[index] = newOrder[index + 1]
                            newOrder[index + 1] = temp
                            setFormData(prev => ({ ...prev, subjectOrder: newOrder }))
                          }}>↓</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // 步骤3：学习时间设置
  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">设置学习时间</h3>
        <p className="text-sm text-muted-foreground mb-4">
          根据您的实际情况选择合适的学习时间安排
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="space-y-4">
            <Label className="text-sm font-medium">每日学习时长</Label>
            <RadioGroup
              value={formData.dailyHours.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, dailyHours: parseInt(value) }))}
            >
              {[1, 2, 3, 4, 5].map((hours) => (
                <div key={hours} className="flex items-center space-x-2">
                  <RadioGroupItem value={hours.toString()} id={`hours-${hours}`} />
                  <Label htmlFor={`hours-${hours}`}>
                    {hours < 5 ? `${hours}小时` : '5小时以上'}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-4">
            <Label className="text-sm font-medium">每周学习天数</Label>
            <RadioGroup
              value={formData.weeklyDays.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, weeklyDays: parseInt(value) }))}
            >
              {[3, 4, 5, 6, 7].map((days) => (
                <div key={days} className="flex items-center space-x-2">
                  <RadioGroupItem value={days.toString()} id={`days-${days}`} />
                  <Label htmlFor={`days-${days}`}>{days}天</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </Card>
      </div>
    </div>
  )

  // 步骤4：自定义说明
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">自定义说明（可选）</h3>
        <p className="text-sm text-muted-foreground mb-4">
          请告诉我们您的特殊需求，以便制定更合适的学习计划
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p>💡 您可以描述：</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• 我的薄弱环节是...</li>
                <li>• 我希望重点加强...</li>
                <li>• 我的时间安排特殊情况...</li>
                <li>• 其他特殊要求...</li>
              </ul>
            </div>
          </div>
          
          <Textarea
            placeholder="请在这里输入您的特殊需求和建议..."
            value={formData.customNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, customNotes: e.target.value }))}
            rows={4}
          />
        </div>
      </Card>
    </div>
  )

  // 步骤5：生成计划
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <h3 className="text-lg font-medium mb-2">正在生成您的个性化学习计划...</h3>
        <p className="text-sm text-muted-foreground">
          AI正在根据您的设置制定专属学习计划，请稍候
        </p>
      </div>
    </div>
  )

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === 4) {
      // 开始生成计划
      setCurrentStep(5)
      setIsLoading(true)
      
      try {
        // 保存用户偏好
        const preferences = {
          dailyHours: formData.dailyHours,
          weeklyDays: formData.weeklyDays,
          orderMethod: formData.orderMethod
        }
        localStorage.setItem('study-plan-preferences', JSON.stringify(preferences))

        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 3000))

        // 生成计划数据
        const planData = {
          subjectProgress: formData.subjectProgress,
          subjectOrder: formData.subjectOrder,
          orderMethod: formData.orderMethod,
          dailyHours: formData.dailyHours,
          weeklyDays: formData.weeklyDays,
          customNotes: formData.customNotes,
          // 模拟AI生成的计划
          plan: {
            title: "AI智能学习计划",
            description: "根据您的学习进度和时间安排定制的个性化计划",
            subjects: Object.keys(formData.subjectProgress).filter(s => 
              formData.subjectProgress[s].status !== '已完成'
            ),
            totalWeeks: 12,
            dailyPlan: "详细的每日学习安排...",
            weeklyPlan: "系统的每周学习计划...",
            overallStrategy: "总体学习策略和方法..."
          }
        }

        onComplete(planData)
        
      } catch (error) {
        console.error('生成计划失败:', error)
        toast({
          variant: "destructive",
          title: "生成计划失败",
          description: "请检查网络连接后重试"
        })
        setCurrentStep(4) // 回到上一步
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return Object.keys(formData.subjectProgress).length > 0
      case 2:
        return true // 科目顺序可以使用默认值
      case 3:
        return formData.dailyHours > 0 && formData.weeklyDays > 0
      case 4:
        return true // 自定义说明是可选的
      default:
        return true
    }
  }

  const stepTitles = [
    "选择学习进度",
    "设置科目顺序", 
    "安排学习时间",
    "自定义说明",
    "生成计划"
  ]

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return renderStep1()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 进度指示器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>制定个性化学习计划</CardTitle>
              <CardDescription>
                步骤 {currentStep} / 5: {stepTitles[currentStep - 1]}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round((currentStep / 5) * 100)}% 完成
            </div>
          </div>
          <Progress value={(currentStep / 5) * 100} className="mt-4" />
        </CardHeader>
      </Card>

      {/* 当前步骤内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {stepTitles[currentStep - 1]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && currentStep < 5 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              上一步
            </Button>
          )}
          {onCancel && currentStep === 1 && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
        </div>

        <div>
          {currentStep < 5 && (
            <Button 
              onClick={handleNext}
              disabled={!validateCurrentStep() || isLoading}
            >
              {currentStep === 4 ? '生成计划' : '下一步'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}