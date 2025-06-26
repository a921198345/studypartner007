"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ArrowRight, ArrowLeft, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

interface PlanWizardProps {
  onComplete: (planData: any) => void
  onCancel?: () => void
}

export function PlanWizard({ onComplete, onCancel }: PlanWizardProps) {
  const [step, setStep] = useState(1)
  const [studyHours, setStudyHours] = useState(2)
  const [weeklyStudyDays, setWeeklyStudyDays] = useState(5)
  const [targetDate, setTargetDate] = useState("")
  const [subjectOrder, setSubjectOrder] = useState("recommended")
  const [currentSubject, setCurrentSubject] = useState("")
  const [currentProgress, setCurrentProgress] = useState(0)
  const [selfSetPlan, setSelfSetPlan] = useState(false)

  // 学科列表 - 使用中文名称作为ID
  const [subjects, setSubjects] = useState([
    { id: "刑法", name: "刑法" },
    { id: "民法", name: "民法" },
    { id: "刑事诉讼法", name: "刑事诉讼法" },
    { id: "民事诉讼法", name: "民事诉讼法" },
    { id: "行政法", name: "行政法" },
    { id: "商经知", name: "商经知" },
    { id: "三国法", name: "三国法" },
    { id: "理论法", name: "理论法" },
  ])

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      // 完成计划创建
      onComplete({
        exam: "法律职业资格考试", // 默认为法律职业资格考试
        studyHours,
        weeklyStudyDays,
        targetDate,
        subjectOrder,
        subjects: subjectOrder === "custom" ? subjects : undefined,
        currentSubject,
        currentProgress,
        selfSetPlan,
      })
    }
  }

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1)
    } else if (onCancel) {
      onCancel()
    }
  }

  // 处理拖拽排序
  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(subjects)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSubjects(items)
  }

  // 计算最小日期（今天）
  const today = new Date()
  const minDate = today.toISOString().split("T")[0]

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">创建个性化学习计划</CardTitle>
        <CardDescription>根据您的时间安排，我们将为您定制最适合的学习计划</CardDescription>
        <div className="mt-4">
          <Progress value={(step / 2) * 100} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>学习时间</span>
            <span>学科设置</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">选择目标考试日期</h3>
              <div className="flex items-center space-x-4">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={minDate}
                  className="w-full"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                选择您计划参加法律职业资格考试的日期，我们将根据剩余时间合理安排学习计划
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">您每天能投入多少时间学习？</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">每天学习时间</span>
                  <span className="font-medium">{studyHours} 小时</span>
                </div>
                <Slider
                  value={[studyHours]}
                  min={1}
                  max={8}
                  step={0.5}
                  onValueChange={(value) => setStudyHours(value[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1小时</span>
                  <span>8小时</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">您每周能学习几天？</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">每周学习天数</span>
                  <span className="font-medium">{weeklyStudyDays} 天</span>
                </div>
                <Slider
                  value={[weeklyStudyDays]}
                  min={1}
                  max={7}
                  step={1}
                  onValueChange={(value) => setWeeklyStudyDays(value[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1天</span>
                  <span>7天</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext}>
                下一步 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">学科学习顺序</h3>
              <RadioGroup value={subjectOrder} onValueChange={setSubjectOrder} className="space-y-3">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="recommended" id="order-recommended" className="mt-1" />
                  <Label
                    htmlFor="order-recommended"
                    className="flex flex-col cursor-pointer p-4 border rounded-md hover:bg-gray-50 flex-1"
                  >
                    <span className="font-medium">推荐顺序</span>
                    <span className="text-sm text-gray-500">系统根据科目关联性和难度递进自动安排最佳学习顺序</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="custom" id="order-custom" className="mt-1" />
                  <Label
                    htmlFor="order-custom"
                    className="flex flex-col cursor-pointer p-4 border rounded-md hover:bg-gray-50 flex-1"
                  >
                    <span className="font-medium">自定义排列</span>
                    <span className="text-sm text-gray-500">根据个人偏好自行设定学科学习顺序</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {subjectOrder === "custom" && (
              <div className="mt-4 p-4 border rounded-md">
                <h4 className="text-sm font-medium mb-3">拖动调整学科顺序（从上到下为学习先后顺序）</h4>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="subjects">
                    {(provided) => (
                      <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {subjects.map((subject, index) => (
                          <Draggable key={subject.id} draggableId={subject.id} index={index}>
                            {(provided) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center p-3 bg-gray-50 rounded-md"
                              >
                                <GripVertical className="h-4 w-4 mr-2 text-gray-400" />
                                <span>
                                  {index + 1}. {subject.name}
                                </span>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-4">当前学习进度</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-subject" className="mb-2 block">
                    选择当前学习科目
                  </Label>
                  <Select value={currentSubject} onValueChange={setCurrentSubject}>
                    <SelectTrigger id="current-subject">
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">尚未开始</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentSubject && currentSubject !== "not_started" && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>当前进度</Label>
                      <span className="text-sm font-medium">{currentProgress}%</span>
                    </div>
                    <Slider
                      value={[currentProgress]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => setCurrentProgress(value[0])}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">计划设置方式</h3>
              <RadioGroup
                value={selfSetPlan ? "self" : "ai"}
                onValueChange={(value) => setSelfSetPlan(value === "self")}
                className="space-y-3"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="ai" id="plan-ai" className="mt-1" />
                  <Label
                    htmlFor="plan-ai"
                    className="flex flex-col cursor-pointer p-4 border rounded-md hover:bg-gray-50 flex-1"
                  >
                    <span className="font-medium">AI制定计划</span>
                    <span className="text-sm text-gray-500">系统根据您的信息自动生成最优学习计划</span>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="self" id="plan-self" className="mt-1" />
                  <Label
                    htmlFor="plan-self"
                    className="flex flex-col cursor-pointer p-4 border rounded-md hover:bg-gray-50 flex-1"
                  >
                    <span className="font-medium">自行设定计划</span>
                    <span className="text-sm text-gray-500">每日自行设定学习任务，系统提供基础模板辅助</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 上一步
              </Button>
              <Button onClick={handleNext}>
                生成学习计划 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
