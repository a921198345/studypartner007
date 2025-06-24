"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, ArrowLeft, GripVertical } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

interface StudyPlanQuestionnaireProps {
  onComplete: (planData: any) => void
  onCancel?: () => void
}

export function StudyPlanQuestionnaire({ onComplete, onCancel }: StudyPlanQuestionnaireProps) {
  // 科目列表
  const [subjects, setSubjects] = useState([
    { id: "民法", name: "民法", selected: true },
    { id: "刑法", name: "刑法", selected: true },
    { id: "行政法", name: "行政法", selected: true },
    { id: "民事诉讼法", name: "民事诉讼法", selected: true },
    { id: "刑事诉讼法", name: "刑事诉讼法", selected: true },
    { id: "商经知", name: "商经知", selected: true },
    { id: "三国法", name: "三国法", selected: true },
    { id: "理论法", name: "理论法", selected: true },
  ])

  // 章节进度 - 简化版本，后续可扩展
  const [chapterProgress, setChapterProgress] = useState({
    "民法": 0,
    "刑法": 0,
    "行政法": 0,
    "民事诉讼法": 0,
    "刑事诉讼法": 0,
    "商经知": 0,
    "三国法": 0,
    "理论法": 0,
  })

  // 学习偏好设置
  const [dailyHours, setDailyHours] = useState("2h")
  const [weeklyDays, setWeeklyDays] = useState("5")
  const [preferSlots, setPreferSlots] = useState<string[]>([])
  const [dailyLoad, setDailyLoad] = useState("适中")
  const [media, setMedia] = useState("教材")
  const [reviewWay, setReviewWay] = useState("AI问答")
  const [notes, setNotes] = useState("")

  // 处理科目选择
  const handleSubjectToggle = (subjectId: string) => {
    setSubjects(prev => prev.map(subject => 
      subject.id === subjectId 
        ? { ...subject, selected: !subject.selected }
        : subject
    ))
  }

  // 处理拖拽排序
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(subjects)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSubjects(items)
  }

  // 处理学习时段选择
  const handleTimeSlotToggle = (slot: string) => {
    setPreferSlots(prev => 
      prev.includes(slot) 
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    )
  }

  // 处理章节进度变化
  const handleChapterProgressChange = (subject: string, progress: number) => {
    setChapterProgress(prev => ({
      ...prev,
      [subject]: progress
    }))
  }

  // 提交问卷
  const handleSubmit = () => {
    const selectedSubjects = subjects.filter(s => s.selected)
    
    if (selectedSubjects.length === 0) {
      alert("请至少选择一个学习科目")
      return
    }

    const questionnaireData = {
      subjectsOrder: selectedSubjects.map(s => s.id),
      chapterProgress,
      dailyHours,
      weeklyDays: parseInt(weeklyDays),
      preferSlots,
      dailyLoad,
      media,
      reviewWay,
      notes,
      timestamp: new Date().toISOString()
    }

    onComplete(questionnaireData)
  }

  return (
    <div className="space-y-8">
      {/* 科目顺序 */}
      <Card>
        <CardHeader>
          <CardTitle>学习科目顺序</CardTitle>
          <CardDescription>选择并排序您要学习的科目（可拖拽调整顺序）</CardDescription>
        </CardHeader>
        <CardContent>
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
                          className="flex items-center p-3 bg-gray-50 rounded-md"
                        >
                          <div {...provided.dragHandleProps} className="mr-3">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </div>
                          <Checkbox
                            checked={subject.selected}
                            onCheckedChange={() => handleSubjectToggle(subject.id)}
                            className="mr-3"
                          />
                          <span className={`flex-1 ${!subject.selected ? 'text-gray-400' : ''}`}>
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
        </CardContent>
      </Card>

      {/* 当前进度 */}
      <Card>
        <CardHeader>
          <CardTitle>当前学习进度</CardTitle>
          <CardDescription>请标记每个科目的学习进度（0-100%）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.filter(s => s.selected).map(subject => (
            <div key={subject.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{subject.name}</Label>
                <span className="text-sm font-medium">{chapterProgress[subject.id]}%</span>
              </div>
              <Slider
                value={[chapterProgress[subject.id]]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => handleChapterProgressChange(subject.id, value[0])}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 学习时间设置 */}
      <Card>
        <CardHeader>
          <CardTitle>学习时间安排</CardTitle>
          <CardDescription>请选择您的学习时间安排</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">每日学习时长</Label>
            <RadioGroup value={dailyHours} onValueChange={setDailyHours} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1h" id="1h" />
                <Label htmlFor="1h">1小时</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2h" id="2h" />
                <Label htmlFor="2h">2小时</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3h" id="3h" />
                <Label htmlFor="3h">3小时</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4h" id="4h" />
                <Label htmlFor="4h">4小时</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5h+" id="5h+" />
                <Label htmlFor="5h+">5小时以上</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">每周学习天数</Label>
            <RadioGroup value={weeklyDays} onValueChange={setWeeklyDays} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="3days" />
                <Label htmlFor="3days">3天</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="4days" />
                <Label htmlFor="4days">4天</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="5days" />
                <Label htmlFor="5days">5天</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="6" id="6days" />
                <Label htmlFor="6days">6天</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="7days" />
                <Label htmlFor="7days">7天</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">学习时段（可多选）</Label>
            <div className="mt-2 space-y-2">
              {["早晨", "上午", "下午", "晚上"].map(slot => (
                <div key={slot} className="flex items-center space-x-2">
                  <Checkbox
                    checked={preferSlots.includes(slot)}
                    onCheckedChange={() => handleTimeSlotToggle(slot)}
                  />
                  <Label>{slot}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习偏好 */}
      <Card>
        <CardHeader>
          <CardTitle>学习偏好设置</CardTitle>
          <CardDescription>选择您的学习偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">任务强度</Label>
            <RadioGroup value={dailyLoad} onValueChange={setDailyLoad} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="轻松" id="easy" />
                <Label htmlFor="easy">轻松</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="适中" id="medium" />
                <Label htmlFor="medium">适中</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="高强度" id="high" />
                <Label htmlFor="high">高强度</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">学习媒介</Label>
            <RadioGroup value={media} onValueChange={setMedia} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="视频" id="video" />
                <Label htmlFor="video">视频</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="教材" id="textbook" />
                <Label htmlFor="textbook">教材</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="刷题" id="practice" />
                <Label htmlFor="practice">刷题</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">复盘方式</Label>
            <RadioGroup value={reviewWay} onValueChange={setReviewWay} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="AI问答" id="ai" />
                <Label htmlFor="ai">AI问答</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="纸笔笔记" id="notes" />
                <Label htmlFor="notes">纸笔笔记</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="任意" id="any" />
                <Label htmlFor="any">任意</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">自定义说明（选填）</Label>
            <Textarea
              placeholder="请输入特殊需求或时间冲突等..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit}>
          生成学习计划 <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}