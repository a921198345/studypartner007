"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Slider } from "../../ui/slider"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { ScrollArea } from "../../ui/scroll-area"
import { Separator } from "../../ui/separator"
import { BookOpen, ChevronDown, ChevronRight, Target } from "lucide-react"
import { CivilLawProgressUltimate } from "./civil-law-progress-ultimate"

// 各科目章节配置
const SUBJECT_CHAPTERS: Record<string, string[]> = {
  "民法": [
    "第一编 总则",
    "第二编 物权",
    "第三编 合同",
    "第四编 人格权",
    "第五编 婚姻家庭",
    "第六编 继承",
    "第七编 侵权责任"
  ],
  "刑法": [
    "刑法总论", "危害公共安全罪", "破坏社会主义市场经济秩序罪", "侵犯公民人身权利罪", 
    "侵犯财产罪", "妨害社会管理秩序罪", "危害国家安全罪", "军人违反职责罪"
  ],
  "行政法": [
    "行政法基本原理", "行政主体", "行政行为", "行政程序", "行政复议", "行政诉讼", "行政赔偿"
  ],
  "刑事诉讼法": [
    "刑事诉讼法概述", "刑事诉讼基本原则", "管辖", "回避", "辩护与代理", "证据", 
    "强制措施", "附带民事诉讼", "期间、送达", "立案", "侦查", "起诉", "审判", "执行"
  ],
  "民事诉讼法": [
    "民事诉讼法概述", "基本原则与基本制度", "主管与管辖", "当事人", "民事证据", 
    "期间与送达", "法院调解", "财产保全和先予执行", "第一审程序", "第二审程序", 
    "审判监督程序", "督促程序", "公示催告程序", "执行程序"
  ],
  "商经法": [
    "商法概述", "公司法", "合伙企业法", "个人独资企业法", "外商投资法", "企业破产法", 
    "票据法", "保险法", "证券法", "反垄断法", "消费者权益保护法", "产品质量法"
  ],
  "理论法": [
    "法理学", "宪法学", "法制史", "司法制度与法律职业道德"
  ],
  "三国法": [
    "国际公法", "国际私法", "国际经济法"
  ]
}

interface ChapterProgressSliderProps {
  subject: string
  progress: number
  chapters?: string[]
  completedSections?: string[]
  onChange: (progress: number, chapters?: string[], completedSections?: string[]) => void
}

export function ChapterProgressSlider({ 
  subject, 
  progress, 
  chapters = [], 
  completedSections = [],
  onChange 
}: ChapterProgressSliderProps) {
  const [currentProgress, setCurrentProgress] = useState(progress)
  const [showChapterDetails, setShowChapterDetails] = useState(true) // 默认显示章节详情
  const [completedChapters, setCompletedChapters] = useState<string[]>(chapters)
  
  const subjectChapters = useMemo(() => SUBJECT_CHAPTERS[subject] || [], [subject])
  
  // 使用 useEffect 但避免无限循环
  useEffect(() => {
    setCurrentProgress(progress)
  }, [progress])

  useEffect(() => {
    if (JSON.stringify(chapters) !== JSON.stringify(completedChapters)) {
      setCompletedChapters(chapters)
    }
  }, [chapters])

  // 根据滑块进度计算已完成章节
  const updateProgressFromSlider = useCallback((newProgress: number[]) => {
    const progressValue = newProgress[0]
    setCurrentProgress(progressValue)
    
    // 根据进度百分比计算应该完成的章节数
    const totalChapters = subjectChapters.length
    const shouldCompleteChapters = Math.floor((progressValue / 100) * totalChapters)
    const newCompletedChapters = subjectChapters.slice(0, shouldCompleteChapters)
    
    setCompletedChapters(newCompletedChapters)
    onChange(progressValue, newCompletedChapters)
  }, [subjectChapters])

  // 切换章节完成状态（灵活模式，不强制顺序）
  const toggleChapterCompletion = useCallback((chapterName: string) => {
    const isCompleted = completedChapters.includes(chapterName)
    let newCompletedChapters: string[]
    
    if (isCompleted) {
      // 取消完成：仅移除该章节
      newCompletedChapters = completedChapters.filter(c => c !== chapterName)
    } else {
      // 标记完成：仅添加该章节
      newCompletedChapters = [...completedChapters, chapterName]
    }
    
    // 计算新的进度百分比
    const newProgress = Math.round((newCompletedChapters.length / subjectChapters.length) * 100)
    
    setCompletedChapters(newCompletedChapters)
    setCurrentProgress(newProgress)
    onChange(newProgress, newCompletedChapters)
  }, [completedChapters, subjectChapters])

  // 快速设置进度
  const quickSetProgress = useCallback((targetProgress: number) => {
    const totalChapters = subjectChapters.length
    const shouldCompleteChapters = Math.floor((targetProgress / 100) * totalChapters)
    const newCompletedChapters = subjectChapters.slice(0, shouldCompleteChapters)
    
    setCurrentProgress(targetProgress)
    setCompletedChapters(newCompletedChapters)
    onChange(targetProgress, newCompletedChapters)
  }, [subjectChapters])

  // 如果是民法，使用详细的章节组件
  if (subject === "民法") {
    return (
      <CivilLawProgressUltimate
        progress={currentProgress}
        completedTopics={completedSections}
        onChange={(newProgress, newCompletedTopics) => {
          onChange(newProgress, [], newCompletedTopics)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 进度标题和快速设置 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium">具体进度设置</span>
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
          step={5}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium text-blue-600">
            当前: {currentProgress}% ({completedChapters.length}/{subjectChapters.length} 章节)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 章节详情切换 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowChapterDetails(!showChapterDetails)}
        className="w-full justify-center text-muted-foreground hover:text-foreground"
      >
        {showChapterDetails ? (
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
      {showChapterDetails && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {subject} - 章节进度详情
            </CardTitle>
            <CardDescription className="text-xs">
              勾选框或点击章节名称可以切换完成状态，支持灵活选择不同教材顺序
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {subjectChapters.map((chapter, index) => {
                  const isCompleted = completedChapters.includes(chapter)
                  
                  return (
                    <div key={chapter}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleChapterCompletion(chapter)}
                        className={`w-full justify-start text-left p-2 h-auto ${
                          isCompleted ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {/* 可选框 */}
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleChapterCompletion(chapter)
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                            isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1">
                            <div className={`text-sm ${
                              isCompleted ? 'line-through' : ''
                            }`}>
                              {chapter}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isCompleted ? '已完成' : '未开始'}
                            </div>
                          </div>
                          
                          {isCompleted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Button>
                      {index < subjectChapters.length - 1 && (
                        <Separator className="my-1" />
                      )}
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
        {currentProgress === 0 && "尚未开始学习，可以灵活选择想要学习的章节"}
        {currentProgress > 0 && currentProgress < 100 && 
          `已完成 ${completedChapters.length} 个章节 (${currentProgress}%)，可继续选择其他章节学习`}
        {currentProgress === 100 && "🎉 该科目已全部完成！"}
        <div className="mt-1 text-xs text-blue-600">
          💡 提示：可以灵活选择章节，适应不同教材的编排顺序
        </div>
      </div>
    </div>
  )
}