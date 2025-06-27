"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Separator } from "../../ui/separator"
import { Progress } from "../../ui/progress"
import { 
  Clock, 
  BookOpen, 
  PenTool, 
  RotateCcw,
  Coffee,
  Target,
  CheckCircle,
  Play,
  Timer,
  Brain,
  Lightbulb,
  FileText
} from "lucide-react"
import ReactMarkdown from "react-markdown"

interface DailyPlanDisplayProps {
  content: string
  schedule: any
}

export function DailyPlanDisplay({ content, schedule }: DailyPlanDisplayProps) {
  // 解析日计划内容
  const parseDailyContent = (content: string) => {
    const sections = {
      preparation: "",
      coreStudy: "",
      practice: "",
      summary: ""
    }

    const lines = content.split('\n')
    let currentSection = ""
    let currentContent: string[] = []

    for (const line of lines) {
      if (line.includes('学前准备') || line.includes('准备阶段')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'preparation'
        currentContent = []
      } else if (line.includes('核心学习') || line.includes('主要学习') || line.includes('教材') || line.includes('视频')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'coreStudy'
        currentContent = []
      } else if (line.includes('练习') || line.includes('即学即练') || line.includes('巩固')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'practice'
        currentContent = []
      } else if (line.includes('总结') || line.includes('学习总结') || line.includes('复习')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'summary'
        currentContent = []
      } else if (currentSection && line.trim()) {
        currentContent.push(line)
      }
    }

    // 添加最后一个部分
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }

    return sections
  }

  const dailySections = parseDailyContent(content)

  // 时间分配计算
  const calculateTimeAllocation = () => {
    const totalHours = schedule?.daily_hours || 3
    const totalMinutes = totalHours * 60
    
    // 标准时间分配比例
    const allocation = {
      preparation: Math.round(totalMinutes * 0.05), // 5%
      coreStudy: Math.round(totalMinutes * 0.70),   // 70%
      practice: Math.round(totalMinutes * 0.20),    // 20%
      summary: Math.round(totalMinutes * 0.05)      // 5%
    }
    
    return allocation
  }

  const timeAllocation = calculateTimeAllocation()

  // 格式化时间显示
  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
    }
    return `${minutes}分钟`
  }

  // 时间段配置
  const timeSlots = [
    {
      id: 'preparation',
      title: '学前准备',
      icon: Target,
      color: 'bg-blue-100 text-blue-800',
      time: timeAllocation.preparation,
      content: dailySections.preparation
    },
    {
      id: 'coreStudy', 
      title: '核心学习',
      icon: BookOpen,
      color: 'bg-green-100 text-green-800',
      time: timeAllocation.coreStudy,
      content: dailySections.coreStudy
    },
    {
      id: 'practice',
      title: '练习巩固',
      icon: PenTool,
      color: 'bg-orange-100 text-orange-800', 
      time: timeAllocation.practice,
      content: dailySections.practice
    },
    {
      id: 'summary',
      title: '学习总结',
      icon: RotateCcw,
      color: 'bg-purple-100 text-purple-800',
      time: timeAllocation.summary,
      content: dailySections.summary
    }
  ]

  // 计算完成进度（模拟）
  const getProgressForSlot = (slotId: string) => {
    // 这里可以根据实际学习进度来计算
    return 0 // 新计划默认为0%
  }

  return (
    <div className="space-y-6">
      {/* 今日学习概览 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-600" />
            今日学习概览
          </CardTitle>
          <CardDescription>
            总计 {schedule?.daily_hours || 3} 小时的个性化学习安排
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="text-center">
                <div className={`w-12 h-12 rounded-full ${slot.color} flex items-center justify-center mx-auto mb-2`}>
                  <slot.icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium">{slot.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(slot.time)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 详细时间安排 */}
      <div className="space-y-4">
        {timeSlots.map((slot, index) => {
          const IconComponent = slot.icon
          const progress = getProgressForSlot(slot.id)
          
          return (
            <Card key={slot.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${slot.color} flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <div>{slot.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {formatTime(slot.time)} • 步骤 {index + 1}
                      </div>
                    </div>
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={slot.color}>
                      {progress}% 完成
                    </Badge>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {progress === 100 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Play className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 进度条 */}
                <Progress value={progress} className="h-2" />
              </CardHeader>
              
              <CardContent>
                {slot.content ? (
                  <div className="study-plan-content">
                    <ReactMarkdown 
                      className="study-plan-content"
                      components={{
                        p: ({children}) => <p className="mb-3 leading-7 text-sm">{children}</p>,
                        li: ({children}) => <li className="mb-2 leading-6 text-sm list-disc ml-4">{children}</li>,
                        ul: ({children}) => <ul className="space-y-1 mb-4">{children}</ul>,
                        ol: ({children}) => <ol className="space-y-1 mb-4">{children}</ol>,
                        h1: ({children}) => <h1 className="text-lg font-bold mb-3 mt-4 text-gray-900">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-semibold mb-2 mt-3 text-gray-900">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-medium mb-2 mt-2 text-gray-800">{children}</h3>,
                        strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      }}
                    >
                      {slot.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    此时间段的详细安排将在计划确认后显示
                  </div>
                )}
                
                {/* 功能建议 */}
                {slot.id === 'preparation' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">推荐功能</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="bg-white">知识导图预习</Badge>
                      <Badge variant="outline" className="bg-white">设定学习目标</Badge>
                    </div>
                  </div>
                )}
                
                {slot.id === 'coreStudy' && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">学习建议</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="bg-white">配套视频</Badge>
                      <Badge variant="outline" className="bg-white">教材同步</Badge>
                      <Badge variant="outline" className="bg-white">AI答疑</Badge>
                    </div>
                  </div>
                )}
                
                {slot.id === 'practice' && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <PenTool className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">练习推荐</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="bg-white">章节练习</Badge>
                      <Badge variant="outline" className="bg-white">历年真题</Badge>
                      <Badge variant="outline" className="bg-white">错题收藏</Badge>
                    </div>
                  </div>
                )}
                
                {slot.id === 'summary' && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">总结工具</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className="bg-white">学习笔记</Badge>
                      <Badge variant="outline" className="bg-white">知识关联</Badge>
                      <Badge variant="outline" className="bg-white">明日预习</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 学习提醒和建议 */}
      <Card className="border-yellow-200 bg-yellow-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coffee className="h-5 w-5 text-yellow-600" />
            学习提醒
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Timer className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">休息提醒：</span>
                <span className="text-muted-foreground">
                  每 {schedule?.break_frequency || 25} 分钟休息一次，保持学习效率
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">最佳时间：</span>
                <span className="text-muted-foreground">
                  {schedule?.preferred_times && schedule.preferred_times.length > 0 
                    ? `建议在 ${schedule.preferred_times.join('、')} 时间段学习`
                    : '在您精力最充沛的时间学习效果最好'
                  }
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Brain className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">学习技巧：</span>
                <span className="text-muted-foreground">
                  遇到难点时可以使用AI问答功能，获得针对性解答
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 如果没有结构化内容，显示原始内容 */}
      {!dailySections.preparation && !dailySections.coreStudy && !dailySections.practice && !dailySections.summary && content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              今日学习计划
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="study-plan-content">
              <ReactMarkdown 
                className="study-plan-content"
                components={{
                  p: ({children}) => <p className="mb-3 leading-7 text-sm">{children}</p>,
                  li: ({children}) => <li className="mb-2 leading-6 text-sm list-disc ml-4">{children}</li>,
                  ul: ({children}) => <ul className="space-y-1 mb-4">{children}</ul>,
                  ol: ({children}) => <ol className="space-y-1 mb-4">{children}</ol>,
                  h1: ({children}) => <h1 className="text-lg font-bold mb-3 mt-4 text-gray-900">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-semibold mb-2 mt-3 text-gray-900">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-medium mb-2 mt-2 text-gray-800">{children}</h3>,
                  strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}