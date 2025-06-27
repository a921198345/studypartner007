"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Alert, AlertDescription } from "../ui/alert"
import { 
  Target,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
  BookOpen
} from "lucide-react"
import { StudyPlanFormData } from "./study-plan-wizard-v2"

interface PlanPreviewSimpleProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  generatedPlan: any
  isLoading: boolean
  conflicts?: any[]
  onRegeneratePlan: () => void
  onConfirmPlan: (planData: any) => void
}

export function PlanPreviewSimple({ 
  data, 
  onChange, 
  generatedPlan, 
  isLoading, 
  conflicts = [],
  onRegeneratePlan,
  onConfirmPlan
}: PlanPreviewSimpleProps) {

  // 判断是否正在流式生成
  const isStreaming = isLoading && generatedPlan && (
    generatedPlan.overallStrategy || 
    generatedPlan.dailyPlan || 
    generatedPlan.weeklyPlan
  )
  
  // 如果正在加载但还没有内容，显示加载状态
  if (isLoading && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">正在生成您的专属学习计划...</h3>
          <p className="text-sm text-muted-foreground">
            AI正在根据您的设置生成最优学习方案，请稍候
          </p>
        </div>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    )
  }

  // 如果没有生成计划，显示提示
  if (!generatedPlan) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">准备生成学习计划</h3>
        <p className="text-sm text-muted-foreground">
          点击"生成计划"按钮开始创建您的专属学习方案
        </p>
      </div>
    )
  }

  // 确保生成的计划有内容
  const planData = generatedPlan?.overallStrategy || generatedPlan?.dailyPlan || generatedPlan?.weeklyPlan ? generatedPlan : null
  if (!planData) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">计划生成中...</h3>
        <p className="text-sm text-muted-foreground">
          AI正在为您生成个性化学习计划
        </p>
      </div>
    )
  }

  // 计算基本统计信息
  const getBasicStats = () => {
    const subjects = Object.keys(data.subject_progress).filter(s => 
      data.subject_progress[s]?.status !== 'completed'
    )
    const totalSubjects = subjects.length
    const dailyHours = data.study_schedule.daily_hours
    const weeklyDays = data.study_schedule.weekly_days
    const weeklyHours = dailyHours * weeklyDays

    return {
      totalSubjects,
      dailyHours,
      weeklyDays,
      weeklyHours,
      estimatedWeeks: Math.ceil(totalSubjects * 4) // 每科目预估4周
    }
  }

  const stats = getBasicStats()

  // 处理计划确认
  const handleConfirmPlan = () => {
    // 创建包含AI生成内容的计划数据结构
    const completePlan = {
      ...data,
      generatedContent: planData,
      created_at: new Date().toISOString(),
      stats: stats
    }
    onConfirmPlan(completePlan)
  }

  return (
    <div className="space-y-6">
      {/* 冲突警告 */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">检测到计划冲突：</p>
              <ul className="list-disc list-inside space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index} className="text-sm">{conflict.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}


      {/* AI生成的学习计划内容 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            AI学习计划详情
          </CardTitle>
          <CardDescription>
            根据您的设置生成的个性化学习方案
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 总体规划思路 */}
            {planData.overallStrategy && (
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  总体规划思路
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className={`study-plan-content ${isStreaming ? 'streaming-text' : ''}`}>
                    {planData.overallStrategy.split('\n').map((line, index) => {
                      const trimmedLine = line.trim()
                      if (!trimmedLine) return <br key={index} />
                      
                      // 处理markdown标题（移除# ## ### #### 符号）
                      if (trimmedLine.startsWith('####')) {
                        const cleanTitle = trimmedLine.replace(/^####\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h4 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h4>
                      }
                      if (trimmedLine.startsWith('###')) {
                        const cleanTitle = trimmedLine.replace(/^###\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h3 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h3>
                      }
                      if (trimmedLine.startsWith('##')) {
                        const cleanTitle = trimmedLine.replace(/^##\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h2 key={index} className="font-semibold text-base mt-4 mb-2 text-gray-900">{cleanTitle}</h2>
                      }
                      if (trimmedLine.startsWith('#')) {
                        const cleanTitle = trimmedLine.replace(/^#\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h1 key={index} className="font-bold text-lg mt-4 mb-3 text-gray-900">{cleanTitle}</h1>
                      }
                      
                      // 列表项处理
                      if (/^[-•*]\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-disc text-gray-700">{trimmedLine.replace(/^[-•*]\s/, '')}</li>
                      }
                      
                      // 带编号的列表
                      if (/^\d+\.\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-decimal text-gray-700">{trimmedLine.replace(/^\d+\.\s/, '')}</li>
                      }
                      
                      // 普通段落
                      return <p key={index} className="mb-2 text-gray-700">{trimmedLine}</p>
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 今日学习计划 */}
            {planData.dailyPlan && (
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  本日计划
                </h4>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className={`study-plan-content ${isStreaming ? 'streaming-text' : ''}`}>
                    {planData.dailyPlan.split('\n').map((line, index) => {
                      const trimmedLine = line.trim()
                      if (!trimmedLine) return <br key={index} />
                      
                      // 处理markdown标题（移除# ## ### #### 符号）
                      if (trimmedLine.startsWith('####')) {
                        const cleanTitle = trimmedLine.replace(/^####\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h4 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h4>
                      }
                      if (trimmedLine.startsWith('###')) {
                        const cleanTitle = trimmedLine.replace(/^###\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h3 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h3>
                      }
                      if (trimmedLine.startsWith('##')) {
                        const cleanTitle = trimmedLine.replace(/^##\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h2 key={index} className="font-semibold text-base mt-4 mb-2 text-gray-900">{cleanTitle}</h2>
                      }
                      if (trimmedLine.startsWith('#')) {
                        const cleanTitle = trimmedLine.replace(/^#\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h1 key={index} className="font-bold text-lg mt-4 mb-3 text-gray-900">{cleanTitle}</h1>
                      }
                      
                      // 列表项处理
                      if (/^[-•*]\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-disc text-gray-700">{trimmedLine.replace(/^[-•*]\s/, '')}</li>
                      }
                      
                      // 带编号的列表
                      if (/^\d+\.\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-decimal text-gray-700">{trimmedLine.replace(/^\d+\.\s/, '')}</li>
                      }
                      
                      // 普通段落
                      return <p key={index} className="mb-2 text-gray-700">{trimmedLine}</p>
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 本周学习计划 */}
            {planData.weeklyPlan && (
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  本周计划
                </h4>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className={`study-plan-content ${isStreaming ? 'streaming-text' : ''}`}>
                    {planData.weeklyPlan.split('\n').map((line, index) => {
                      const trimmedLine = line.trim()
                      if (!trimmedLine) return <br key={index} />
                      
                      // 处理markdown标题（移除# ## ### #### 符号）
                      if (trimmedLine.startsWith('####')) {
                        const cleanTitle = trimmedLine.replace(/^####\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h4 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h4>
                      }
                      if (trimmedLine.startsWith('###')) {
                        const cleanTitle = trimmedLine.replace(/^###\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h3 key={index} className="font-semibold text-sm mt-3 mb-2 text-gray-800">{cleanTitle}</h3>
                      }
                      if (trimmedLine.startsWith('##')) {
                        const cleanTitle = trimmedLine.replace(/^##\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h2 key={index} className="font-semibold text-base mt-4 mb-2 text-gray-900">{cleanTitle}</h2>
                      }
                      if (trimmedLine.startsWith('#')) {
                        const cleanTitle = trimmedLine.replace(/^#\s*[\*]*\s*/, '').replace(/[\*]*$/, '').trim()
                        return <h1 key={index} className="font-bold text-lg mt-4 mb-3 text-gray-900">{cleanTitle}</h1>
                      }
                      
                      // 列表项处理
                      if (/^[-•*]\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-disc text-gray-700">{trimmedLine.replace(/^[-•*]\s/, '')}</li>
                      }
                      
                      // 带编号的列表
                      if (/^\d+\.\s/.test(trimmedLine)) {
                        return <li key={index} className="ml-4 mb-1 list-decimal text-gray-700">{trimmedLine.replace(/^\d+\.\s/, '')}</li>
                      }
                      
                      // 普通段落
                      return <p key={index} className="mb-2 text-gray-700">{trimmedLine}</p>
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 学习建议 */}
      {data.custom_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">个性化建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <p><strong>您的学习需求：</strong></p>
              <p className="mt-2">{data.custom_notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4 justify-center">
        <Button
          variant="outline"
          onClick={onRegeneratePlan}
          disabled={isLoading}
        >
          重新生成
        </Button>
        <Button
          onClick={handleConfirmPlan}
          disabled={isLoading || isStreaming}
          className="bg-green-600 hover:bg-green-700"
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            '确认计划'
          )}
        </Button>
      </div>
    </div>
  )
}