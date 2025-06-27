"use client"

import { useState, useEffect } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Textarea } from "../../ui/textarea"
import { Badge } from "../../ui/badge"
import { Label } from "../../ui/label"
import { Checkbox } from "../../ui/checkbox"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Separator } from "../../ui/separator"
import { 
  PenTool, 
  Target, 
  AlertTriangle, 
  BookOpen, 
  Lightbulb,
  Plus,
  X,
  Brain,
  Heart,
  Zap
} from "lucide-react"
import { StudyPlanFormData, SUBJECTS } from "../study-plan-wizard-v2"

interface CustomNotesStepProps {
  data: StudyPlanFormData
  onChange: (data: Partial<StudyPlanFormData>) => void
  userPreferences?: any
}

// 预设引导词模板
const GUIDE_TEMPLATES = [
  {
    category: "薄弱环节",
    icon: AlertTriangle,
    color: "bg-orange-100 text-orange-800",
    templates: [
      "我在民法物权部分理解困难，需要重点加强",
      "刑法的罪名认定经常混淆，希望多练习",
      "行政法的程序性规定记不住，需要反复复习",
      "诉讼法的时效问题总是出错，要特别注意"
    ]
  },
  {
    category: "学习偏好", 
    icon: Heart,
    color: "bg-blue-100 text-blue-800",
    templates: [
      "我喜欢通过案例来理解法条，请多安排案例分析",
      "我习惯晚上学习，精力比较集中",
      "我需要大量练习题来巩固知识点",
      "我倾向于视频学习，文字理解有困难"
    ]
  },
  {
    category: "时间安排",
    icon: Zap,
    color: "bg-green-100 text-green-800", 
    templates: [
      "工作日只有晚上有时间，周末可以全天学习",
      "我需要每天固定的学习时间，帮助养成习惯",
      "考试前一个月希望加大学习强度",
      "我容易疲劳，需要频繁休息"
    ]
  },
  {
    category: "学习目标",
    icon: Target,
    color: "bg-purple-100 text-purple-800",
    templates: [
      "我的目标是一次通过，希望计划稳妥一些",
      "时间紧张，希望突出重点，提高效率",
      "我要冲刺高分，请安排更多练习",
      "我是零基础，需要从最基础开始"
    ]
  }
]

// 学习方式选项
const LEARNING_STYLES = [
  { id: "video_text", label: "视频+文字", description: "看视频配合教材学习" },
  { id: "text_only", label: "纯文字", description: "主要通过教材和资料学习" },
  { id: "practice_focused", label: "题目导向", description: "以练习题为主导的学习方式" }
]

// 复习频率选项
const REVIEW_FREQUENCIES = [
  { id: "daily", label: "每日复习", description: "每天都安排复习时间" },
  { id: "weekly", label: "每周复习", description: "每周固定时间复习" },
  { id: "biweekly", label: "双周复习", description: "每两周进行一次系统复习" }
]

export function CustomNotesStep({ data, onChange, userPreferences }: CustomNotesStepProps) {
  const [localNotes, setLocalNotes] = useState(data.custom_notes)
  const [weakSubjects, setWeakSubjects] = useState<string[]>(data.weak_subjects || [])
  const [learningGoals, setLearningGoals] = useState<string[]>(data.learning_goals || [])
  const [specialRequirements, setSpecialRequirements] = useState(data.special_requirements || "")
  const [preferences, setPreferences] = useState(data.preferences)

  // 更新数据到父组件
  useEffect(() => {
    onChange({
      custom_notes: localNotes,
      weak_subjects: weakSubjects,
      learning_goals: learningGoals,
      special_requirements: specialRequirements,
      preferences: preferences
    })
  }, [localNotes, weakSubjects, learningGoals, specialRequirements, preferences])

  // 添加模板文字到自定义说明
  const addTemplate = (template: string) => {
    const newText = localNotes ? `${localNotes}\n\n${template}` : template
    setLocalNotes(newText)
  }

  // 切换薄弱科目
  const toggleWeakSubject = (subject: string) => {
    setWeakSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    )
  }

  // 添加学习目标
  const addLearningGoal = () => {
    const goal = prompt("请输入您的学习目标：")
    if (goal && goal.trim()) {
      setLearningGoals(prev => [...prev, goal.trim()])
    }
  }

  // 删除学习目标
  const removeLearningGoal = (index: number) => {
    setLearningGoals(prev => prev.filter((_, i) => i !== index))
  }

  // 更新偏好设置
  const updatePreference = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <PenTool className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 mb-2">个性化设置说明</p>
            <ul className="space-y-1 text-blue-800">
              <li>• 告诉我们您的学习偏好和特殊需求，我们会据此定制专属计划</li>
              <li>• 标注薄弱科目，系统会自动增加相应的学习时间</li>
              <li>• 所有设置都是可选的，但越详细越能生成适合您的计划</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 薄弱科目选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            薄弱科目标注
          </CardTitle>
          <CardDescription>
            选择您感觉困难或需要重点关注的科目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUBJECTS.map(subject => {
              const isWeak = weakSubjects.includes(subject)
              const subjectData = data.subject_progress[subject]
              const hasData = !!subjectData
              
              return (
                <Button
                  key={subject}
                  variant={isWeak ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWeakSubject(subject)}
                  disabled={!hasData}
                  className={`h-auto p-3 ${isWeak ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium">{subject}</div>
                    {hasData ? (
                      <div className="text-xs opacity-75 mt-1">
                        {subjectData.status === 'completed' ? '已完成' :
                         subjectData.status === 'in_progress' ? `${subjectData.progress}%` : '未开始'}
                      </div>
                    ) : (
                      <div className="text-xs opacity-50 mt-1">未选择</div>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
          {weakSubjects.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>已标注薄弱科目：</strong>
                {weakSubjects.map((subject, index) => (
                  <Badge key={subject} variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                    {subject}
                  </Badge>
                ))}
              </p>
              <p className="text-xs text-orange-700 mt-2">
                系统会为这些科目分配更多学习时间和练习机会
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学习偏好设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            学习偏好设置
          </CardTitle>
          <CardDescription>
            设置您的学习方式和复习偏好
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 学习方式 */}
          <div>
            <Label className="text-base font-medium mb-3 block">学习方式偏好</Label>
            <RadioGroup 
              value={preferences.learning_style}
              onValueChange={(value) => updatePreference('learning_style', value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {LEARNING_STYLES.map(style => (
                <div key={style.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={style.id} id={style.id} className="mt-1" />
                  <Label htmlFor={style.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{style.label}</div>
                    <div className="text-sm text-muted-foreground">{style.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* 复习频率 */}
          <div>
            <Label className="text-base font-medium mb-3 block">复习频率偏好</Label>
            <RadioGroup 
              value={preferences.review_frequency}
              onValueChange={(value) => updatePreference('review_frequency', value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {REVIEW_FREQUENCIES.map(freq => (
                <div key={freq.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={freq.id} id={freq.id} className="mt-1" />
                  <Label htmlFor={freq.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{freq.label}</div>
                    <div className="text-sm text-muted-foreground">{freq.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 学习目标设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            学习目标
          </CardTitle>
          <CardDescription>
            设置您的具体学习目标和期望
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {learningGoals.map((goal, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Target className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="flex-1 text-sm">{goal}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLearningGoal(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={addLearningGoal}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加学习目标
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 引导词模板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            快速模板
          </CardTitle>
          <CardDescription>
            点击下方模板快速添加到自定义说明中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {GUIDE_TEMPLATES.map((category) => {
              const IconComponent = category.icon
              
              return (
                <div key={category.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <IconComponent className="h-4 w-4" />
                    <span className="font-medium text-sm">{category.category}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.templates.map((template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => addTemplate(template)}
                        className="h-auto p-3 text-left justify-start"
                      >
                        <div className="text-xs leading-relaxed">{template}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 自定义说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="h-5 w-5 text-purple-600" />
            详细说明
          </CardTitle>
          <CardDescription>
            详细描述您的学习需求和特殊情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="请详细描述您的学习需求，比如：
            
• 我的薄弱环节是...
• 我希望重点加强...  
• 我的时间安排特殊情况...
• 我的学习习惯是...
• 其他特殊要求...

您提供的信息越详细，生成的学习计划就越符合您的需求。"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            className="min-h-[150px] resize-none"
          />
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>支持详细描述您的学习需求和偏好</span>
            <span>{localNotes.length}/1000</span>
          </div>
        </CardContent>
      </Card>

      {/* 特殊要求 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">特殊要求</CardTitle>
          <CardDescription>
            其他需要特别注意的事项
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="比如：身体原因需要限制学习时长、特定时间不能学习、对某种学习方式过敏等..."
            value={specialRequirements}
            onChange={(e) => setSpecialRequirements(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </CardContent>
      </Card>

      {/* 设置总结 */}
      {(weakSubjects.length > 0 || learningGoals.length > 0 || localNotes || specialRequirements) && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              个性化设置总结
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {weakSubjects.length > 0 && (
              <div>
                <span className="font-medium text-blue-900">薄弱科目：</span>
                <span className="text-blue-800">{weakSubjects.join('、')}</span>
              </div>
            )}
            {learningGoals.length > 0 && (
              <div>
                <span className="font-medium text-blue-900">学习目标：</span>
                <span className="text-blue-800">{learningGoals.length}项</span>
              </div>
            )}
            <div>
              <span className="font-medium text-blue-900">学习方式：</span>
              <span className="text-blue-800">
                {LEARNING_STYLES.find(s => s.id === preferences.learning_style)?.label}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-900">复习频率：</span>
              <span className="text-blue-800">
                {REVIEW_FREQUENCIES.find(f => f.id === preferences.review_frequency)?.label}
              </span>
            </div>
            {localNotes && (
              <div>
                <span className="font-medium text-blue-900">详细说明：</span>
                <span className="text-blue-800">{localNotes.length}字</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 底部提示 */}
      <div className="text-center text-sm text-muted-foreground">
        <p>所有个性化设置都将影响AI生成的学习计划，让计划更贴合您的实际需求</p>
      </div>
    </div>
  )
}