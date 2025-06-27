"use client"

import { useState, useEffect } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Label } from "../../ui/label"
import { Badge } from "../../ui/badge"
import { Alert, AlertDescription } from "../../ui/alert"
import { Separator } from "../../ui/separator"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  GripVertical, 
  Wand2, 
  User, 
  ArrowUpDown, 
  TrendingUp, 
  Brain,
  CheckCircle2,
  PlayCircle,
  Circle,
  Info,
  Zap
} from "lucide-react"
import { StudyPlanFormData } from "../study-plan-wizard-v2"

interface SubjectOrderStepProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

// 科目重要程度权重配置
const SUBJECT_WEIGHTS = {
  "民法": 0.25,
  "刑法": 0.25, 
  "行政法": 0.15,
  "刑事诉讼法": 0.10,
  "民事诉讼法": 0.10,
  "商经法": 0.05,
  "理论法": 0.05,
  "三国法": 0.05
}

// 科目难度等级
const SUBJECT_DIFFICULTY = {
  "民法": 4,
  "刑法": 4,
  "行政法": 3,
  "刑事诉讼法": 3,
  "民事诉讼法": 3,
  "商经法": 2,
  "理论法": 2,
  "三国法": 2
}

// 可排序项目组件
function SortableSubjectItem({ 
  item, 
  index, 
  getStatusIcon, 
  getSubjectInfo 
}: {
  item: any;
  index: number;
  getStatusIcon: (subject: string) => React.ReactNode;
  getSubjectInfo: (subject: string) => any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.subject })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const subjectInfo = getSubjectInfo(item.subject)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${
        isDragging ? 'shadow-lg z-10' : 'hover:shadow-sm'
      } cursor-move`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* 拖拽手柄 */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </div>
          
          {/* 优先级标识 */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
            {index + 1}
          </div>
          
          {/* 科目信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {getStatusIcon(item.subject)}
              <span className="font-medium">{item.subject}</span>
              <Badge variant="outline" className="text-xs">
                {subjectInfo.statusText}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>重要程度: {Math.round(subjectInfo.weight * 100)}%</span>
              <span>难度: {subjectInfo.difficulty}/5</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SubjectOrderStep({ data, onChange, userPreferences }: SubjectOrderStepProps) {
  const [localOrderMethod, setLocalOrderMethod] = useState<'ai' | 'manual'>(data.order_method)
  const [subjectOrder, setSubjectOrder] = useState(data.subject_order)
  const [aiRecommendation, setAiRecommendation] = useState<any>(null)

  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 获取需要排序的科目（排除已完成的）
  const getActiveSubjects = () => {
    // 引入所有法考科目
    const allSubjects = [
      "民法", "刑法", "行政法", "刑事诉讼法", 
      "民事诉讼法", "商经法", "理论法", "三国法"
    ]
    
    return allSubjects
      .map(subject => {
        const subjectData = data.subject_progress[subject]
        // 如果用户没有设置状态，默认为"未开始"
        const status = subjectData?.status || 'not_started'
        const progress = subjectData?.progress || 0
        
        return {
          subject,
          status,
          progress
        }
      })
      .filter(({ status }) => status !== 'completed')
  }

  const activeSubjects = getActiveSubjects()

  // 科学学习顺序
  const calculateAIOrder = () => {
    // 固定的科学学习顺序
    const scientificOrder = ["刑法", "民法", "刑事诉讼法", "民事诉讼法", "行政法", "商经法", "三国法", "理论法"]
    
    // 按照科学顺序对活跃科目进行排序
    const orderedSubjects = activeSubjects
      .map(({ subject, status, progress }) => ({
        subject,
        score: 100 - scientificOrder.indexOf(subject), // 顺序越靠前分数越高
        progress,
        status,
        weight: SUBJECT_WEIGHTS[subject] || 0.05,
        difficulty: SUBJECT_DIFFICULTY[subject] || 2,
        isWeakSubject: userPreferences?.weak_subjects?.includes(subject) || false
      }))
      .sort((a, b) => {
        const aIndex = scientificOrder.indexOf(a.subject)
        const bIndex = scientificOrder.indexOf(b.subject)
        return aIndex - bIndex // 按照科学顺序排序
      })

    return orderedSubjects
  }

  // 应用AI排序
  const applyAIOrder = () => {
    const aiOrder = calculateAIOrder()
    const newOrder = aiOrder.map((item, index) => ({
      subject: item.subject,
      priority: index + 1,
      ai_score: item.score
    }))
    
    setSubjectOrder(newOrder)
    setAiRecommendation(aiOrder)
    
    onChange({
      subject_order: newOrder,
      order_method: 'ai'
    })
  }

  // 处理排序方式切换
  const handleOrderMethodChange = (method: 'ai' | 'manual') => {
    setLocalOrderMethod(method)
    
    if (method === 'ai') {
      applyAIOrder()
    } else {
      // 手动排序：如果没有现有排序，使用默认顺序
      if (subjectOrder.length === 0) {
        const defaultOrder = activeSubjects.map((item, index) => ({
          subject: item.subject,
          priority: index + 1
        }))
        setSubjectOrder(defaultOrder)
        onChange({
          subject_order: defaultOrder,
          order_method: 'manual'
        })
      } else {
        onChange({ order_method: 'manual' })
      }
    }
  }

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || localOrderMethod !== 'manual') return

    if (active.id !== over.id) {
      const oldIndex = subjectOrder.findIndex((item) => item.subject === active.id)
      const newIndex = subjectOrder.findIndex((item) => item.subject === over.id)

      const newOrder = arrayMove(subjectOrder, oldIndex, newIndex).map((item, index) => ({
        ...item,
        priority: index + 1
      }))

      setSubjectOrder(newOrder)
      onChange({ subject_order: newOrder })
    }
  }

  // 初始化排序
  useEffect(() => {
    if (activeSubjects.length > 0 && subjectOrder.length === 0) {
      if (localOrderMethod === 'ai') {
        applyAIOrder()
      } else {
        const defaultOrder = activeSubjects.map((item, index) => ({
          subject: item.subject,
          priority: index + 1
        }))
        setSubjectOrder(defaultOrder)
        onChange({ subject_order: defaultOrder })
      }
    }
  }, [activeSubjects.length])

  // 获取科目状态图标
  const getStatusIcon = (subject: string) => {
    const subjectData = data.subject_progress[subject]
    const status = subjectData?.status || 'not_started'
    
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />
      case 'not_started':
        return <Circle className="h-4 w-4 text-gray-400" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  // 获取科目进度信息
  const getSubjectInfo = (subject: string) => {
    const subjectData = data.subject_progress[subject]
    const progress = subjectData?.progress || 0
    const status = subjectData?.status || 'not_started'
    
    return {
      progress,
      status,
      statusText: status === 'completed' ? '已完成' : 
                 status === 'in_progress' ? `${progress}%` : '未开始',
      weight: SUBJECT_WEIGHTS[subject] || 0.05,
      difficulty: SUBJECT_DIFFICULTY[subject] || 2
    }
  }

  if (activeSubjects.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          没有需要安排学习的科目。请返回上一步选择至少一个"未开始"或"进行中"的科目。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* 排序方式选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">选择排序方式</CardTitle>
          <CardDescription>
            系统将根据您选择的方式安排科目学习顺序
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={localOrderMethod} 
            onValueChange={handleOrderMethodChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* 科学学习顺序 */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="ai" id="ai-order" className="mt-1" />
              <Label htmlFor="ai-order" className="flex-1 cursor-pointer">
                <Card className={`transition-all duration-200 ${
                  localOrderMethod === 'ai' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wand2 className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">科学学习顺序</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        推荐
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      根据法考学习的科学规律安排顺序：刑法→民法→刑诉法→民诉法→行政法→商经法→三国法→理论法
                    </p>
                  </CardContent>
                </Card>
              </Label>
            </div>

            {/* 手动排序 */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="manual" id="manual-order" className="mt-1" />
              <Label htmlFor="manual-order" className="flex-1 cursor-pointer">
                <Card className={`transition-all duration-200 ${
                  localOrderMethod === 'manual' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-green-600" />
                      <span className="font-medium">手动排序</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      完全自定义科目学习顺序，拖拽调整优先级，满足个性化需求
                    </p>
                    <div className="text-xs space-y-1 text-green-700">
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3" />
                        <span>拖拽调整顺序</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>完全自主控制</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>即时生效</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 科学排序分析 */}
      {localOrderMethod === 'ai' && aiRecommendation && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              科学排序说明
            </CardTitle>
            <CardDescription>
              基于法考学习规律的科学排序建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p className="text-blue-800">
                <strong>排序原理：</strong>
                刑法作为基础法理优先学习，民法紧随其后巩固基础，诉讼法配合实体法学习，
                行政法承上启下，最后学习商经法、三国法和理论法。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 科目排序列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>科目学习顺序</span>
            <Badge variant="outline">
              {subjectOrder.length} 个科目
            </Badge>
          </CardTitle>
          <CardDescription>
            {localOrderMethod === 'manual' ? 
              '拖拽科目卡片调整学习顺序' : 
              'AI已根据多个因素自动排序'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localOrderMethod === 'manual' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subjectOrder.map(item => item.subject)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {subjectOrder.map((orderItem, index) => (
                    <SortableSubjectItem
                      key={orderItem.subject}
                      item={orderItem}
                      index={index}
                      getStatusIcon={getStatusIcon}
                      getSubjectInfo={getSubjectInfo}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {subjectOrder.map((orderItem, index) => {
                const subjectInfo = getSubjectInfo(orderItem.subject)
                const aiData = aiRecommendation?.find(item => item.subject === orderItem.subject)
                
                return (
                  <Card key={orderItem.subject} className="hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* 优先级标识 */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                          {index + 1}
                        </div>
                        
                        {/* 科目信息 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            {getStatusIcon(orderItem.subject)}
                            <span className="font-medium">{orderItem.subject}</span>
                            <Badge variant="outline" className="text-xs">
                              {subjectInfo.statusText}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>重要程度: {Math.round(subjectInfo.weight * 100)}%</span>
                            <span>难度: {subjectInfo.difficulty}/5</span>
                            {aiData && (
                              <span className="text-blue-600">科学排序</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 趋势指示器 */}
                        {localOrderMethod === 'ai' && (
                          <div className="text-right">
                            <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
                            <div className="text-xs text-green-600 font-medium">
                              科学推荐
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground">
        {localOrderMethod === 'ai' ? (
          <p>AI已根据科学算法为您安排最优学习顺序</p>
        ) : (
          <p>拖拽科目卡片调整顺序，越靠前的科目将优先安排学习时间</p>
        )}
      </div>
    </div>
  )
}