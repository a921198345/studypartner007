"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap,
  Award,
  Brain,
  BarChart3,
  Sparkles
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface WeeklyPlanDisplayProps {
  content: string
  schedule: any
}

export function WeeklyPlanDisplay({ content, schedule }: WeeklyPlanDisplayProps) {
  // 解析周计划内容
  const parseWeeklyContent = (content: string) => {
    const weekData = {
      overview: "",
      goals: [] as string[],
      subjects: [] as { name: string; hours: number; topics: string[] }[],
      milestones: [] as string[],
      dailyPlans: [] as { day: string; focus: string; tasks: string[] }[]
    }

    const lines = content.split('\n')
    let currentSection = ""
    let currentSubject: any = null
    let currentDay: any = null

    for (const line of lines) {
      const trimmed = line.trim()
      
      // 识别总体概览
      if (trimmed.includes('本周') && trimmed.includes('概览')) {
        currentSection = 'overview'
        continue
      }
      
      // 识别学习目标
      if (trimmed.includes('学习目标') || trimmed.includes('本周目标')) {
        currentSection = 'goals'
        continue
      }
      
      // 识别科目分配
      if (trimmed.includes('科目分配') || trimmed.includes('学习科目')) {
        currentSection = 'subjects'
        continue
      }
      
      // 识别里程碑
      if (trimmed.includes('里程碑') || trimmed.includes('关键节点')) {
        currentSection = 'milestones'
        continue
      }
      
      // 识别每日计划
      if (trimmed.includes('每日安排') || trimmed.includes('日程安排') || /^(周[一二三四五六日]|星期[一二三四五六日])/.test(trimmed)) {
        currentSection = 'daily'
        // 检查是否是新的一天
        const dayMatch = trimmed.match(/(周[一二三四五六日]|星期[一二三四五六日])/)
        if (dayMatch) {
          if (currentDay) {
            weekData.dailyPlans.push(currentDay)
          }
          currentDay = {
            day: dayMatch[1],
            focus: "",
            tasks: []
          }
        }
        continue
      }

      // 根据当前部分处理内容
      if (currentSection === 'overview' && trimmed) {
        weekData.overview += (weekData.overview ? '\n' : '') + trimmed
      } else if (currentSection === 'goals' && trimmed) {
        if (trimmed.match(/^[-•·*\d.]/)) {
          weekData.goals.push(trimmed.replace(/^[-•·*\d.]\s*/, ''))
        }
      } else if (currentSection === 'subjects' && trimmed) {
        // 解析科目信息
        const subjectMatch = trimmed.match(/^(.+?)[:：]/)
        if (subjectMatch) {
          if (currentSubject) {
            weekData.subjects.push(currentSubject)
          }
          currentSubject = {
            name: subjectMatch[1],
            hours: 0,
            topics: []
          }
          // 提取时间
          const hoursMatch = trimmed.match(/(\d+)\s*小时/)
          if (hoursMatch) {
            currentSubject.hours = parseInt(hoursMatch[1])
          }
        } else if (currentSubject && trimmed.match(/^[-•·*\d.]/)) {
          currentSubject.topics.push(trimmed.replace(/^[-•·*\d.]\s*/, ''))
        }
      } else if (currentSection === 'milestones' && trimmed) {
        if (trimmed.match(/^[-•·*\d.]/)) {
          weekData.milestones.push(trimmed.replace(/^[-•·*\d.]\s*/, ''))
        }
      } else if (currentSection === 'daily' && currentDay && trimmed) {
        if (!currentDay.focus && !trimmed.match(/^[-•·*\d.]/)) {
          currentDay.focus = trimmed
        } else if (trimmed.match(/^[-•·*\d.]/)) {
          currentDay.tasks.push(trimmed.replace(/^[-•·*\d.]\s*/, ''))
        }
      }
    }

    // 添加最后的数据
    if (currentSubject) {
      weekData.subjects.push(currentSubject)
    }
    if (currentDay) {
      weekData.dailyPlans.push(currentDay)
    }

    return weekData
  }

  const weekData = parseWeeklyContent(content)

  // 计算周学习总时长
  const totalWeeklyHours = schedule?.daily_hours * (7 - (schedule?.rest_days || 1))
  
  // 计算各科目占比
  const subjectDistribution = weekData.subjects.length > 0 
    ? weekData.subjects 
    : [
        { name: "民法", hours: Math.round(totalWeeklyHours * 0.3), topics: [] },
        { name: "刑法", hours: Math.round(totalWeeklyHours * 0.3), topics: [] },
        { name: "行政法", hours: Math.round(totalWeeklyHours * 0.2), topics: [] },
        { name: "其他", hours: Math.round(totalWeeklyHours * 0.2), topics: [] }
      ]

  // 星期对应的样式
  const dayStyles = {
    '周一': 'bg-red-100 text-red-800 border-red-200',
    '周二': 'bg-orange-100 text-orange-800 border-orange-200',
    '周三': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '周四': 'bg-green-100 text-green-800 border-green-200',
    '周五': 'bg-blue-100 text-blue-800 border-blue-200',
    '周六': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    '周日': 'bg-purple-100 text-purple-800 border-purple-200',
    '星期一': 'bg-red-100 text-red-800 border-red-200',
    '星期二': 'bg-orange-100 text-orange-800 border-orange-200',
    '星期三': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '星期四': 'bg-green-100 text-green-800 border-green-200',
    '星期五': 'bg-blue-100 text-blue-800 border-blue-200',
    '星期六': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    '星期日': 'bg-purple-100 text-purple-800 border-purple-200'
  }

  return (
    <div className="space-y-6">
      {/* 周计划概览卡片 */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            本周学习计划概览
          </CardTitle>
          <CardDescription>
            总计 {totalWeeklyHours} 小时的系统化学习安排
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weekData.overview ? (
            <div className="study-plan-content mb-4">
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
                {weekData.overview}
              </ReactMarkdown>
            </div>
          ) : null}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalWeeklyHours}</div>
              <div className="text-sm text-muted-foreground">学习小时</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{subjectDistribution.length}</div>
              <div className="text-sm text-muted-foreground">学习科目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{7 - (schedule?.rest_days || 1)}</div>
              <div className="text-sm text-muted-foreground">学习天数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{weekData.milestones.length || 3}</div>
              <div className="text-sm text-muted-foreground">关键里程碑</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习目标 */}
      {weekData.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              本周学习目标
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weekData.goals.map((goal, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm">{goal}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 科目时间分配 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            科目时间分配
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectDistribution.map((subject, index) => {
            const percentage = Math.round((subject.hours / totalWeeklyHours) * 100)
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{subject.hours}小时</span>
                    <Badge variant="outline">{percentage}%</Badge>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                {subject.topics.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {subject.topics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        {topic}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 每日学习安排 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            每日学习安排
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {(weekData.dailyPlans.length > 0 ? weekData.dailyPlans : [
                { day: "周一", focus: "民法基础", tasks: ["物权法总则", "所有权制度"] },
                { day: "周二", focus: "刑法总论", tasks: ["犯罪构成", "刑罚制度"] },
                { day: "周三", focus: "行政法基础", tasks: ["行政主体", "行政行为"] },
                { day: "周四", focus: "综合复习", tasks: ["本周重点回顾", "错题集整理"] },
                { day: "周五", focus: "模拟测试", tasks: ["阶段性测验", "弱点分析"] },
                { day: "周六", focus: "深度学习", tasks: ["难点突破", "案例分析"] },
                { day: "周日", focus: "休息调整", tasks: ["轻松复习", "下周预习"] }
              ]).map((day, index) => {
                const isRestDay = day.day.includes('周日') || day.day.includes('星期日')
                
                return (
                  <Card key={index} className={cn(
                    "border",
                    dayStyles[day.day] || 'bg-gray-100 text-gray-800 border-gray-200'
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {day.day}
                        </CardTitle>
                        {isRestDay ? (
                          <Badge variant="secondary" className="bg-white">
                            <Zap className="h-3 w-3 mr-1" />
                            休息日
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-white">
                            {schedule?.daily_hours || 3}小时
                          </Badge>
                        )}
                      </div>
                      {day.focus && (
                        <CardDescription className="text-sm font-medium mt-1">
                          重点：{day.focus}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {day.tasks.length > 0 ? (
                        <div className="space-y-2">
                          {day.tasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-gray-500" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          待安排具体学习任务
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 关键里程碑 */}
      {(weekData.milestones.length > 0 || true) && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              本周关键里程碑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(weekData.milestones.length > 0 ? weekData.milestones : [
                "完成民法物权编基础学习",
                "掌握刑法犯罪构成理论",
                "通过本周阶段测试（目标80分以上）"
              ]).map((milestone, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <span className="text-sm">{milestone}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学习建议 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600" />
            个性化学习建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">重点关注：</span>
                <span className="text-muted-foreground">
                  根据您的进度，本周应重点突破
                  {subjectDistribution[0]?.name || '民法'}的核心知识点
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">学习技巧：</span>
                <span className="text-muted-foreground">
                  建议使用"知识导图"功能梳理本周学习内容的逻辑关系
                </span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">激励机制：</span>
                <span className="text-muted-foreground">
                  完成本周目标后，可解锁下一阶段的高阶学习内容
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 如果没有结构化内容，显示原始内容 */}
      {!weekData.overview && !weekData.goals.length && !weekData.dailyPlans.length && content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              本周学习计划
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