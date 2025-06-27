"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Separator } from "../../ui/separator"
import { 
  Target, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Brain,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  BarChart3
} from "lucide-react"
import ReactMarkdown from "react-markdown"

interface OverallStrategyDisplayProps {
  content: string
  userData: any
}

export function OverallStrategyDisplay({ content, userData }: OverallStrategyDisplayProps) {
  // 解析Markdown内容为结构化数据
  const parseStrategyContent = (content: string) => {
    const sections = {
      analysis: "",
      goals: "",
      strategy: "",
      features: ""
    }

    const lines = content.split('\n')
    let currentSection = ""
    let currentContent: string[] = []

    for (const line of lines) {
      if (line.includes('当前进度分析') || line.includes('进度分析')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'analysis'
        currentContent = []
      } else if (line.includes('学习目标设定') || line.includes('目标设定')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'goals'
        currentContent = []
      } else if (line.includes('学习策略') || line.includes('策略规划')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'strategy'
        currentContent = []
      } else if (line.includes('功能使用') || line.includes('功能建议')) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        currentSection = 'features'
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

  const strategySections = parseStrategyContent(content)

  // 计算学习统计
  const getStudyStats = () => {
    const subjects = Object.keys(userData.subject_progress || {})
    const completedSubjects = subjects.filter(s => userData.subject_progress[s]?.status === 'completed').length
    const inProgressSubjects = subjects.filter(s => userData.subject_progress[s]?.status === 'in_progress').length
    const notStartedSubjects = subjects.filter(s => userData.subject_progress[s]?.status === 'not_started').length
    
    const totalProgress = subjects.length > 0 
      ? subjects.reduce((sum, s) => sum + (userData.subject_progress[s]?.progress || 0), 0) / subjects.length 
      : 0

    return {
      totalSubjects: subjects.length,
      completedSubjects,
      inProgressSubjects,
      notStartedSubjects,
      averageProgress: Math.round(totalProgress)
    }
  }

  const stats = getStudyStats()

  return (
    <div className="space-y-6">
      {/* 学习状态概览 */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            学习现状总览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSubjects}</div>
              <div className="text-sm text-muted-foreground">总科目数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedSubjects}</div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgressSubjects}</div>
              <div className="text-sm text-muted-foreground">进行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.averageProgress}%</div>
              <div className="text-sm text-muted-foreground">平均进度</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 当前进度分析 */}
      {strategySections.analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              当前进度分析
            </CardTitle>
            <CardDescription>
              基于您的学习状态和进度的深度分析
            </CardDescription>
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
                {strategySections.analysis}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学习目标设定 */}
      {strategySections.goals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              学习目标设定
            </CardTitle>
            <CardDescription>
              根据您的时间和能力制定的具体学习目标
            </CardDescription>
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
                {strategySections.goals}
              </ReactMarkdown>
            </div>
            
            {/* 目标可视化 */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">核心目标指标</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>每日学习</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {userData.study_schedule?.daily_hours || 3}小时
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>每周频次</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {userData.study_schedule?.weekly_days || 5}天
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>重点科目</span>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {userData.weak_subjects?.length || 0}个
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学习策略规划 */}
      {strategySections.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              学习策略规划
            </CardTitle>
            <CardDescription>
              科学的学习方法和时间分配策略
            </CardDescription>
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
                {strategySections.strategy}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 功能使用建议 */}
      {strategySections.features && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              功能使用建议
            </CardTitle>
            <CardDescription>
              如何充分利用网站功能提升学习效率
            </CardDescription>
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
                {strategySections.features}
              </ReactMarkdown>
            </div>
            
            {/* 功能快捷链接 */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-900">推荐功能</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Badge variant="outline" className="bg-white text-gray-700 justify-center py-2">
                  知识导图
                </Badge>
                <Badge variant="outline" className="bg-white text-gray-700 justify-center py-2">
                  AI问答
                </Badge>
                <Badge variant="outline" className="bg-white text-gray-700 justify-center py-2">
                  题库练习
                </Badge>
                <Badge variant="outline" className="bg-white text-gray-700 justify-center py-2">
                  学习笔记
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 个性化设置摘要 */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            个性化配置摘要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                时间安排
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>每日学习时长</span>
                  <span className="font-medium">{userData.study_schedule?.daily_hours || 3}小时</span>
                </div>
                <div className="flex justify-between">
                  <span>每周学习天数</span>
                  <span className="font-medium">{userData.study_schedule?.weekly_days || 5}天</span>
                </div>
                <div className="flex justify-between">
                  <span>偏好时间段</span>
                  <span className="font-medium">
                    {userData.study_schedule?.preferred_times?.length || 0}个
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                学习偏好
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>科目排序</span>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                    {userData.order_method === 'ai' ? 'AI智能' : '手动排序'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>学习方式</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {userData.preferences?.learning_style === 'video_text' ? '视频+文字' :
                     userData.preferences?.learning_style === 'text_only' ? '纯文字' : '题目导向'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>复习频率</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {userData.preferences?.review_frequency === 'daily' ? '每日' :
                     userData.preferences?.review_frequency === 'weekly' ? '每周' : '双周'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 薄弱科目提醒 */}
          {userData.weak_subjects && userData.weak_subjects.length > 0 && (
            <div className="mt-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900">重点关注科目</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {userData.weak_subjects.map((subject: string) => (
                  <Badge key={subject} variant="outline" className="bg-orange-100 text-orange-800">
                    {subject}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-2">
                这些科目已安排额外的学习时间和练习机会
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 如果没有结构化内容，显示原始内容 */}
      {!strategySections.analysis && !strategySections.goals && !strategySections.strategy && content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              总体规划思路
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