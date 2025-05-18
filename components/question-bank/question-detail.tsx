"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Brain, ArrowLeft, ArrowRight, Lock } from "lucide-react"
import Link from "next/link"

interface Option {
  key: string
  text: string
}

interface QuestionDetailProps {
  question: {
    id: number
    subject: string
    year: number
    type: "single" | "multiple" | "judgment"
    content: string
    options: Option[]
    answer: string[]
    analysis: string
  }
  onPrevious?: () => void
  onNext?: () => void
  totalQuestions?: number
  currentIndex?: number
  isMember?: boolean
}

export function QuestionDetail({
  question,
  onPrevious,
  onNext,
  totalQuestions = 1,
  currentIndex = 0,
  isMember = false,
}: QuestionDetailProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const isCorrect =
    isSubmitted &&
    selectedOptions.length === question.answer.length &&
    selectedOptions.every((option) => question.answer.includes(option))

  const handleOptionSelect = (key: string) => {
    if (isSubmitted) return

    if (question.type === "single" || question.type === "judgment") {
      setSelectedOptions([key])
    } else {
      // 多选题
      if (selectedOptions.includes(key)) {
        setSelectedOptions(selectedOptions.filter((o) => o !== key))
      } else {
        setSelectedOptions([...selectedOptions, key])
      }
    }
  }

  const handleSubmit = () => {
    if (selectedOptions.length === 0) {
      alert("请选择答案")
      return
    }

    setIsSubmitted(true)
  }

  const handleReset = () => {
    setSelectedOptions([])
    setIsSubmitted(false)
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  // 检查是否可以访问该题目
  const canAccess = isMember || question.year === 2023 || question.year === 2024

  if (!canAccess) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center p-6">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">会员专享内容</h3>
          <p className="text-gray-500 mb-6">免费用户仅可访问2023年和2024年的法考真题库</p>
          <Button>升级会员</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <CardTitle className="text-lg">
            第 {currentIndex + 1}/{totalQuestions} 题
          </CardTitle>
          <div className="flex ml-4">
            <Badge variant="outline" className="mr-2">
              {question.year}
            </Badge>
            <Badge variant="secondary" className="mr-2">
              {question.subject}
            </Badge>
            <Badge variant="outline">
              {question.type === "single" ? "单选题" : question.type === "multiple" ? "多选题" : "判断题"}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleFavorite} className={isFavorite ? "text-yellow-400" : ""}>
          <Star className={`h-5 w-5 ${isFavorite ? "fill-yellow-400" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-base font-medium">{question.content}</div>

        <div className="space-y-2">
          {question.options.map((option) => (
            <div
              key={option.key}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${selectedOptions.includes(option.key) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}
                ${isSubmitted && question.answer.includes(option.key) ? "border-green-500 bg-green-50" : ""}
                ${isSubmitted && selectedOptions.includes(option.key) && !question.answer.includes(option.key) ? "border-red-500 bg-red-50" : ""}
              `}
              onClick={() => handleOptionSelect(option.key)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6">{option.key}.</div>
                <div>{option.text}</div>
              </div>
            </div>
          ))}
        </div>

        {isSubmitted && (
          <div className="mt-4 space-y-4">
            <div
              className={`p-4 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <div className="font-medium mb-2">{isCorrect ? "回答正确！" : "回答错误"}</div>
              <div className="text-sm">正确答案: {question.answer.join(", ")}</div>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 border">
              <div className="font-medium mb-2">解析</div>
              <div className="text-sm whitespace-pre-wrap">{question.analysis}</div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                重新作答
              </Button>
              <Link href={`/knowledge-map?point=related-to-${question.id}`}>
                <Button className="flex items-center">
                  <Brain className="mr-2 h-4 w-4" />
                  查看相关知识导图
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>提交答案</Button>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={onPrevious} disabled={!onPrevious || currentIndex === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            上一题
          </Button>
          <Button variant="outline" onClick={onNext} disabled={!onNext || currentIndex === totalQuestions - 1}>
            下一题
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
