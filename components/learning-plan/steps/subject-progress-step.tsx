"use client"

import { useState } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Label } from "../../ui/label"
import { Badge } from "../../ui/badge"
import { CheckCircle2, Circle, PlayCircle, BookOpen, Clock } from "lucide-react"
import { ChapterProgressSlider } from "./chapter-progress-slider"
import { StudyPlanFormData, SUBJECTS } from "../study-plan-wizard-v2"

interface SubjectProgressStepProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

export function SubjectProgressStep({ data, onChange, userPreferences }: SubjectProgressStepProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  // 更新科目状态
  const updateSubjectStatus = (subject: string, status: 'completed' | 'in_progress' | 'not_started') => {
    const newProgress = {
      ...data.subject_progress,
      [subject]: {
        ...data.subject_progress[subject],
        status,
        progress: status === 'completed' ? 100 : 
                 status === 'not_started' ? 0 : 
                 data.subject_progress[subject]?.progress || 0
      }
    }
    
    onChange({ subject_progress: newProgress })
    
    // 如果选择了"进行中"，自动打开详细进度设置
    if (status === 'in_progress') {
      setSelectedSubject(subject)
    } else {
      setSelectedSubject(null)
    }
  }

  // 更新科目具体进度
  const updateSubjectProgress = (subject: string, progress: number, chapters?: string[], completedSections?: string[]) => {
    const newProgress = {
      ...data.subject_progress,
      [subject]: {
        ...data.subject_progress[subject],
        progress,
        chapters: chapters || data.subject_progress[subject]?.chapters,
        completedSections: completedSections || data.subject_progress[subject]?.completedSections
      }
    }
    
    onChange({ subject_progress: newProgress })
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-5 w-5 text-blue-600" />
      case 'not_started':
        return <Circle className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'in_progress':
        return '进行中'
      case 'not_started':
        return '未开始'
      default:
        return '未设置'
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'not_started':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  // 计算整体进度统计
  const getProgressStats = () => {
    const subjects = Object.keys(data.subject_progress)
    const totalSubjects = subjects.length
    const completedSubjects = subjects.filter(s => data.subject_progress[s]?.status === 'completed').length
    const inProgressSubjects = subjects.filter(s => data.subject_progress[s]?.status === 'in_progress').length
    const averageProgress = totalSubjects > 0 
      ? subjects.reduce((sum, s) => sum + (data.subject_progress[s]?.progress || 0), 0) / totalSubjects 
      : 0

    return {
      totalSubjects,
      completedSubjects,
      inProgressSubjects,
      averageProgress: Math.round(averageProgress)
    }
  }

  const stats = getProgressStats()

  return (
    <div className="space-y-6">
      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 mb-2">如何设置学习进度？</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>已完成</strong>：该科目已学完，无需再安排学习时间</li>
              <li>• <strong>进行中</strong>：正在学习中，点击可设置具体进度百分比</li>
              <li>• <strong>未开始</strong>：尚未开始学习，将从头开始安排</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 进度统计卡片 */}
      {stats.totalSubjects > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              当前学习进度统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSubjects}</div>
                <div className="text-sm text-muted-foreground">已选科目</div>
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
                <div className="text-2xl font-bold text-blue-600">{stats.averageProgress}%</div>
                <div className="text-sm text-muted-foreground">平均进度</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 科目进度选择 */}
      <div className="grid gap-4">
        {SUBJECTS.map((subject) => {
          const subjectData = data.subject_progress[subject]
          const status = subjectData?.status || 'not_started'
          const progress = subjectData?.progress || 0

          return (
            <Card 
              key={subject} 
              className={`transition-all duration-200 ${
                selectedSubject === subject ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <CardTitle className="text-base">{subject}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary" className={getStatusColor(status)}>
                          {getStatusText(status)}
                        </Badge>
                        {status === 'in_progress' && (
                          <span className="text-sm text-blue-600 font-medium">
                            {progress}% 完成
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {/* 快速设置按钮 */}
                  <div className="flex gap-1">
                    <Button
                      variant={status === 'not_started' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSubjectStatus(subject, 'not_started')}
                    >
                      未开始
                    </Button>
                    <Button
                      variant={status === 'in_progress' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSubjectStatus(subject, 'in_progress')}
                    >
                      进行中
                    </Button>
                    <Button
                      variant={status === 'completed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSubjectStatus(subject, 'completed')}
                    >
                      已完成
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* 详细进度设置 */}
              {status === 'in_progress' && selectedSubject === subject && (
                <CardContent className="pt-0 border-t bg-blue-50/50">
                  <ChapterProgressSlider
                    subject={subject}
                    progress={progress}
                    chapters={subjectData?.chapters}
                    completedSections={subjectData?.completedSections}
                    onChange={(newProgress, chapters, completedSections) => 
                      updateSubjectProgress(subject, newProgress, chapters, completedSections)
                    }
                  />
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground">
        {stats.totalSubjects === 0 ? (
          <p>请选择至少一个科目的学习状态以继续</p>
        ) : (
          <p>已设置 {stats.totalSubjects} 个科目，可以继续下一步</p>
        )}
      </div>
    </div>
  )
}