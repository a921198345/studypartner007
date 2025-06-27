"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Textarea } from "../../ui/textarea"
import { Label } from "../../ui/label"
import { PenTool } from "lucide-react"
import { StudyPlanFormData } from "../study-plan-wizard-v2"

interface CustomNotesStepSimpleProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

export function CustomNotesStepSimple({ data, onChange, userPreferences }: CustomNotesStepSimpleProps) {
  const [localNotes, setLocalNotes] = useState(data.custom_notes)

  // 更新数据到父组件
  useEffect(() => {
    onChange({
      custom_notes: localNotes,
      special_requirements: "", // 清空特殊要求
      // 保持原有的空数组，避免破坏现有逻辑
      weak_subjects: data.weak_subjects || [],
      learning_goals: data.learning_goals || [],
      preferences: data.preferences || {
        difficulty_preference: 'gradual',
        learning_style: 'video_text',
        review_frequency: 'weekly'
      }
    })
  }, [localNotes])

  return (
    <div className="space-y-6">
      {/* 自定义说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="h-5 w-5 text-blue-600" />
            学习需求说明
          </CardTitle>
          <CardDescription>
            描述您的学习需求和特殊情况，帮助生成更适合的学习计划
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="请描述您的学习需求，比如：
            
• 薄弱的科目和知识点
• 学习时间安排的特殊情况  
• 学习方式偏好
• 身体原因限制或特定时间无法学习等特殊要求

您提供的信息越详细，生成的学习计划就越符合您的需求。"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>详细描述有助于生成个性化的学习计划</span>
            <span>{localNotes.length}/500</span>
          </div>
        </CardContent>
      </Card>


      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
        <p>所有个性化设置都将影响AI生成的学习计划，让计划更贴合您的实际需求</p>
      </div>
    </div>
  )
}