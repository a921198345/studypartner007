"use client"

import { useState, useEffect, useRef } from "react"
import { Slider } from "../../ui/slider"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { ScrollArea } from "../../ui/scroll-area"
import { Separator } from "../../ui/separator"
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible"
// 使用简化的展开收起逻辑替代 Collapsible 组件
import { BookOpen, ChevronDown, ChevronRight, Target, CheckCircle2, Circle, PlayCircle } from "lucide-react"
import { 
  CIVIL_LAW_CHAPTERS, 
  CIVIL_LAW_PARTS, 
  getTotalCivilLawSections,
  getCompletedSectionsByProgress,
  type Chapter,
  type Section 
} from "../../../lib/constants/civil-law-chapters"

interface CivilLawProgressSliderProps {
  progress: number
  completedSections?: string[]
  onChange: (progress: number, completedSections: string[]) => void
}

export function CivilLawProgressSlider({ 
  progress, 
  completedSections = [], 
  onChange 
}: CivilLawProgressSliderProps) {
  const [currentProgress, setCurrentProgress] = useState(progress)
  const [expandedParts, setExpandedParts] = useState<string[]>([])
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>(completedSections)
  
  const totalSections = getTotalCivilLawSections()
  
  const prevProgressRef = useRef(progress)
  const prevCompletedSectionsRef = useRef(completedSections.join(','))

  useEffect(() => {
    if (prevProgressRef.current !== progress) {
      setCurrentProgress(progress)
      prevProgressRef.current = progress
    }
  }, [progress])

  useEffect(() => {
    const newCompletedSectionsStr = completedSections.join(',')
    if (prevCompletedSectionsRef.current !== newCompletedSectionsStr) {
      setCompletedSectionIds(completedSections)
      prevCompletedSectionsRef.current = newCompletedSectionsStr
    }
  }, [completedSections])

  // 根据滑块进度更新完成的章节
  const updateProgressFromSlider = (newProgress: number[]) => {
    const progressValue = newProgress[0]
    setCurrentProgress(progressValue)
    
    // 根据进度百分比计算应该完成的章节
    const completedSections = getCompletedSectionsByProgress(progressValue)
    const completedIds = completedSections.map(s => s.id)
    
    setCompletedSectionIds(completedIds)
    onChange(progressValue, completedIds)
  }

  // 切换章节完成状态
  const toggleSectionCompletion = (sectionId: string) => {
    const isCompleted = completedSectionIds.includes(sectionId)
    let newCompletedIds: string[]
    
    if (isCompleted) {
      // 取消完成：移除该章节及其后续章节
      const allSections = getAllSectionsInOrder()
      const sectionIndex = allSections.findIndex(s => s.id === sectionId)
      const sectionsToKeep = allSections.slice(0, sectionIndex)
      newCompletedIds = completedSectionIds.filter(id => 
        sectionsToKeep.some(s => s.id === id)
      )
    } else {
      // 标记完成：添加该章节及其前续章节
      const allSections = getAllSectionsInOrder()
      const sectionIndex = allSections.findIndex(s => s.id === sectionId)
      const sectionsToAdd = allSections.slice(0, sectionIndex + 1)
      const newIds = sectionsToAdd.map(s => s.id)
      newCompletedIds = [...new Set([...completedSectionIds, ...newIds])]
    }
    
    // 计算新的进度百分比
    const newProgress = Math.round((newCompletedIds.length / totalSections) * 100)
    
    setCompletedSectionIds(newCompletedIds)
    setCurrentProgress(newProgress)
    onChange(newProgress, newCompletedIds)
  }

  // 获取所有章节的有序列表
  const getAllSectionsInOrder = (): Section[] => {
    const allSections: Section[] = []
    CIVIL_LAW_CHAPTERS.forEach(chapter => {
      if (chapter.sections) {
        allSections.push(...chapter.sections)
      }
    })
    return allSections
  }

  // 快速设置进度
  const quickSetProgress = (targetProgress: number) => {
    const completedSections = getCompletedSectionsByProgress(targetProgress)
    const completedIds = completedSections.map(s => s.id)
    
    setCurrentProgress(targetProgress)
    setCompletedSectionIds(completedIds)
    onChange(targetProgress, completedIds)
  }

  // 切换编的展开状态
  const togglePartExpansion = (partId: string) => {
    setExpandedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    )
  }

  // 获取编的完成状态
  const getPartCompletionStatus = (chapter: Chapter) => {
    if (!chapter.sections) return { completed: 0, total: 0, status: 'not_started' }
    
    const completed = chapter.sections.filter(s => 
      completedSectionIds.includes(s.id)
    ).length
    const total = chapter.sections.length
    
    let status = 'not_started'
    if (completed === total) status = 'completed'
    else if (completed > 0) status = 'in_progress'
    
    return { completed, total, status }
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* 进度标题和快速设置 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium">民法学习进度</span>
          <Badge variant="outline" className="text-blue-600">
            {currentProgress}%
          </Badge>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => quickSetProgress(25)}
            className={currentProgress === 25 ? "bg-blue-100" : ""}
          >
            25%
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => quickSetProgress(50)}
            className={currentProgress === 50 ? "bg-blue-100" : ""}
          >
            50%
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => quickSetProgress(75)}
            className={currentProgress === 75 ? "bg-blue-100" : ""}
          >
            75%
          </Button>
        </div>
      </div>

      {/* 进度滑块 */}
      <div className="space-y-3">
        <Slider
          value={[currentProgress]}
          onValueChange={updateProgressFromSlider}
          max={100}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium text-blue-600">
            当前: {currentProgress}% ({completedSectionIds.length}/{totalSections} 小节)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 详细章节列表 */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            民法详细章节进度
          </CardTitle>
          <CardDescription className="text-xs">
            点击编名称展开详细章节，点击小节可切换完成状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {CIVIL_LAW_CHAPTERS.map((chapter) => {
                const { completed, total, status } = getPartCompletionStatus(chapter)
                const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
                const isExpanded = expandedParts.includes(chapter.id)
                
                return (
                  <div key={chapter.id} className="border rounded-lg">
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                      onClick={() => togglePartExpansion(chapter.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <div className="text-left">
                          <div className="font-medium text-sm">{chapter.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {completed}/{total} 小节 ({completionRate}%)
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                          }
                        >
                          {status === 'completed' ? '已完成' :
                           status === 'in_progress' ? '进行中' : '未开始'}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                    
                    {isExpanded && (
                      <div className="px-3 pb-2">
                        <div className="space-y-1 border-t pt-2">
                          {chapter.sections?.map((section, index) => {
                            const isCompleted = completedSectionIds.includes(section.id)
                            const allSections = getAllSectionsInOrder()
                            const globalIndex = allSections.findIndex(s => s.id === section.id)
                            const isCurrent = !isCompleted && globalIndex === completedSectionIds.length
                            
                            return (
                              <Button
                                key={section.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSectionCompletion(section.id)}
                                className={`w-full justify-start text-left p-2 h-auto ${
                                  isCompleted ? 'bg-green-50 text-green-800 hover:bg-green-100' :
                                  isCurrent ? 'bg-blue-50 text-blue-800 hover:bg-blue-100' :
                                  'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                                    isCompleted ? 'border-green-500 bg-green-500 text-white' :
                                    isCurrent ? 'border-blue-500 bg-blue-500 text-white' :
                                    'border-gray-300 text-gray-500'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-medium ${
                                      isCompleted ? 'line-through' : ''
                                    }`}>
                                      {section.title}
                                    </div>
                                    {section.page && (
                                      <div className="text-xs text-muted-foreground">
                                        第 {section.page} 页
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isCompleted && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                      ✓
                                    </Badge>
                                  )}
                                  {isCurrent && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      当前
                                    </Badge>
                                  )}
                                </div>
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 进度提示 */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded text-center">
        {currentProgress === 0 && "尚未开始学习民法，将从第一编总则开始安排"}
        {currentProgress > 0 && currentProgress < 100 && 
          `已完成 ${completedSectionIds.length} 个小节，当前进度 ${currentProgress}%`}
        {currentProgress === 100 && "民法已全部完成，无需安排新的学习时间"}
      </div>
    </div>
  )
}