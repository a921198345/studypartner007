"use client"

import { useState } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Label } from "../../ui/label"
import { Badge } from "../../ui/badge"
import { CheckCircle2, Circle, PlayCircle, BookOpen } from "lucide-react"
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
                 data.subject_progress[subject]?.progress || 30
      }
    }
    
    onChange({ subject_progress: newProgress })
    
    // 如果是进行中状态，选中该科目显示详细设置
    if (status === 'in_progress') {
      setSelectedSubject(subject)
    } else {
      setSelectedSubject(null)
    }
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
        return 'bg-green-50 border-green-200 text-green-700'
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'not_started':
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">选择您要学习的科目</h3>
        <p className="text-sm text-muted-foreground mb-4">
          请选择各科目的当前学习状态，这将帮助AI为您制定更合适的学习计划
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBJECTS.map((subject) => {
          const progress = data.subject_progress[subject]
          const status = progress?.status || 'not_started'
          
          return (
            <Card key={subject} className={`cursor-pointer transition-all hover:shadow-md ${getStatusColor(status)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <CardTitle className="text-base">{subject}</CardTitle>
                  </div>
                  {getStatusIcon(status)}
                </div>
                <CardDescription>
                  当前状态：{getStatusText(status)}
                  {progress?.progress > 0 && (
                    <span className="ml-2">({progress.progress}%)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup
                  value={status}
                  onValueChange={(value) => updateSubjectStatus(subject, value as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_started" id={`${subject}-not_started`} />
                    <Label htmlFor={`${subject}-not_started`} className="text-sm">
                      未开始学习
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_progress" id={`${subject}-in_progress`} />
                    <Label htmlFor={`${subject}-in_progress`} className="text-sm">
                      正在学习中
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="completed" id={`${subject}-completed`} />
                    <Label htmlFor={`${subject}-completed`} className="text-sm">
                      已经掌握
                    </Label>
                  </div>
                </RadioGroup>
                
                {/* 简化的进度设置 */}
                {status === 'in_progress' && (
                  <div className="mt-4 p-3 bg-white rounded-lg border">
                    <Label className="text-sm font-medium">学习进度</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        {[25, 50, 75].map((percent) => (
                          <Button
                            key={percent}
                            variant={progress?.progress === percent ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newProgress = {
                                ...data.subject_progress,
                                [subject]: {
                                  ...progress,
                                  progress: percent
                                }
                              }
                              onChange({ subject_progress: newProgress })
                            }}
                          >
                            {percent}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 选择的科目统计 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h4 className="font-medium text-blue-900 mb-2">选择统计</h4>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <span className="font-medium text-green-600">
                  {Object.values(data.subject_progress).filter(p => p?.status === 'completed').length}
                </span>
                <span className="text-green-600 ml-1">已完成</span>
              </div>
              <div>
                <span className="font-medium text-blue-600">
                  {Object.values(data.subject_progress).filter(p => p?.status === 'in_progress').length}
                </span>
                <span className="text-blue-600 ml-1">学习中</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {Object.values(data.subject_progress).filter(p => p?.status === 'not_started').length}
                </span>
                <span className="text-gray-600 ml-1">未开始</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}