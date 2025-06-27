"use client"

import { useState } from "react"
import { Slider } from "../../ui/slider"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { ScrollArea } from "../../ui/scroll-area"
import { BookOpen, Target, ChevronDown, ChevronRight } from "lucide-react"

// 简化的民法章节结构
const CIVIL_LAW_CHAPTERS = [
  { id: "part1", title: "第一编 总则", sections: 9 },
  { id: "part2", title: "第二编 物权", sections: 20 },
  { id: "part3", title: "第三编 合同", sections: 9 },
  { id: "part4", title: "第四编 人格权", sections: 3 },
  { id: "part5", title: "第五编 婚姻家庭", sections: 5 },
  { id: "part6", title: "第六编 继承", sections: 4 },
  { id: "part7", title: "第七编 侵权责任", sections: 10 }
]

const TOTAL_SECTIONS = CIVIL_LAW_CHAPTERS.reduce((sum, chapter) => sum + chapter.sections, 0)

interface CivilLawProgressSimpleProps {
  progress: number
  onChange: (progress: number, completedSections: string[]) => void
}

export function CivilLawProgressSimple({ 
  progress, 
  onChange 
}: CivilLawProgressSimpleProps) {
  const [showDetails, setShowDetails] = useState(false)

  // 计算已完成的章节数
  const completedSections = Math.floor((progress / 100) * TOTAL_SECTIONS)
  
  // 处理滑块变化
  const handleSliderChange = (value: number[]) => {
    const newProgress = value[0]
    const newCompletedSections = Math.floor((newProgress / 100) * TOTAL_SECTIONS)
    
    // 生成虚拟的已完成小节ID数组
    const sectionIds = Array.from({ length: newCompletedSections }, (_, i) => `section_${i + 1}`)
    
    onChange(newProgress, sectionIds)
  }

  // 快速设置进度
  const quickSetProgress = (targetProgress: number) => {
    const newCompletedSections = Math.floor((targetProgress / 100) * TOTAL_SECTIONS)
    const sectionIds = Array.from({ length: newCompletedSections }, (_, i) => `section_${i + 1}`)
    onChange(targetProgress, sectionIds)
  }

  // 获取章节完成状态
  const getChapterStatus = (chapter: typeof CIVIL_LAW_CHAPTERS[0], index: number) => {
    const startSection = CIVIL_LAW_CHAPTERS.slice(0, index).reduce((sum, ch) => sum + ch.sections, 0)
    const endSection = startSection + chapter.sections
    
    const completed = Math.max(0, Math.min(chapter.sections, completedSections - startSection))
    const completionRate = Math.round((completed / chapter.sections) * 100)
    
    let status = 'not_started'
    if (completed === chapter.sections) status = 'completed'
    else if (completed > 0) status = 'in_progress'
    
    return { completed, total: chapter.sections, completionRate, status }
  }

  return (
    <div className="space-y-4">
      {/* 进度标题和快速设置 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium">民法学习进度</span>
          <Badge variant="outline" className="text-blue-600">
            {progress}%
          </Badge>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant={progress === 25 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(25)}
          >
            25%
          </Button>
          <Button 
            variant={progress === 50 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(50)}
          >
            50%
          </Button>
          <Button 
            variant={progress === 75 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(75)}
          >
            75%
          </Button>
        </div>
      </div>

      {/* 进度滑块 */}
      <div className="space-y-3">
        <Slider
          value={[progress]}
          onValueChange={handleSliderChange}
          max={100}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium text-blue-600">
            当前: {progress}% ({completedSections}/{TOTAL_SECTIONS} 小节)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 章节详情切换 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full justify-center text-muted-foreground hover:text-foreground"
      >
        {showDetails ? (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            隐藏章节详情
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4 mr-2" />
            查看章节详情
          </>
        )}
      </Button>

      {/* 章节详细列表 */}
      {showDetails && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              民法章节进度详情
            </CardTitle>
            <CardDescription className="text-xs">
              显示各编的学习进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {CIVIL_LAW_CHAPTERS.map((chapter, index) => {
                  const { completed, total, completionRate, status } = getChapterStatus(chapter, index)
                  
                  return (
                    <div key={chapter.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{chapter.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {completed}/{total} 小节 ({completionRate}%)
                          </div>
                        </div>
                        
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
                      </div>
                      
                      {/* 进度条 */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              status === 'completed' ? 'bg-green-500' :
                              status === 'in_progress' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 进度提示 */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded text-center">
        {progress === 0 && "尚未开始学习民法，将从第一编总则开始安排"}
        {progress > 0 && progress < 100 && 
          `已完成 ${completedSections} 个小节，当前进度 ${progress}%`}
        {progress === 100 && "民法已全部完成，无需安排新的学习时间"}
      </div>
    </div>
  )
}