"use client"

import React from "react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Star, Brain, ArrowLeft, ArrowRight, Lock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"

interface QuestionDetailProps {
  question: {
    id: number
    subject?: string
    year?: number
    type: "single" | "multiple" | "judgment"
    content: string
    options: Array<{
      key?: string
      text?: string
      value?: string
      label?: string
      content?: string
    }> | string[] | any
    answer: string[]
    analysis: string
    question_code?: string
  }
  onPrevious?: () => void
  onNext?: () => void
  totalQuestions?: number
  currentIndex?: number
  isMember?: boolean
  selectedAnswer: string | string[]
  submittedAnswer: string | string[] | null
  onSelectAnswer: (answer: string | string[]) => void
  answerResult?: any
  disabled?: boolean
  hideSubmitButton?: boolean
}

export function QuestionDetail({
  question,
  onPrevious,
  onNext,
  totalQuestions = 1,
  currentIndex = 0,
  isMember = false,
  selectedAnswer,
  submittedAnswer,
  onSelectAnswer,
  answerResult,
  disabled = false,
  hideSubmitButton = false,
}: QuestionDetailProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const isCorrect =
    isSubmitted &&
    Array.isArray(selectedAnswer) &&
    Array.isArray(question.answer) &&
    selectedAnswer.length === question.answer.length &&
    selectedAnswer.every((option) => question.answer.includes(option))

  const handleOptionSelect = (key: string) => {
    if (isSubmitted) return

    if (question.type === "single" || question.type === "judgment") {
      onSelectAnswer(key)
    } else {
      // 多选题
      if (Array.isArray(selectedAnswer) && selectedAnswer.includes(key)) {
        onSelectAnswer(selectedAnswer.filter((o) => o !== key))
      } else if (Array.isArray(selectedAnswer)) {
        onSelectAnswer([...selectedAnswer, key])
      } else {
        // 如果selectedAnswer不是数组，初始化为数组
        onSelectAnswer([key])
      }
    }
  }

  const handleSubmit = () => {
    if (selectedAnswer.length === 0) {
      alert("请选择答案")
      return
    }

    setIsSubmitted(true)
  }

  const handleReset = () => {
    onSelectAnswer([])
    setIsSubmitted(false)
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  // 检查是否可以访问该题目 - 所有题目都对免费用户开放
  const canAccess = true  // 修改为始终可访问

  // 确定选项是否已选中（单选）
  const isSingleSelected = (key: string) => {
    return selectedAnswer === key
  }

  // 确定选项是否已选中（多选）
  const isMultiSelected = (key: string) => {
    return Array.isArray(selectedAnswer) && selectedAnswer.includes(key)
  }

  // 修改正确答案的确定方法
  const isCorrectOption = (key: string) => {
    if (!submittedAnswer) return false;
    
    // 尝试从所有可能的来源获取正确答案
    const correctAnswerArray = answerResult?.correct_answer 
      ? (Array.isArray(answerResult.correct_answer) 
          ? answerResult.correct_answer 
          : typeof answerResult.correct_answer === 'string'
            ? answerResult.correct_answer.split('') 
            : [String(answerResult.correct_answer)])
      : (Array.isArray(question.answer) && question.answer.length > 0) 
          ? question.answer 
          : ['A']; // 最后的兜底值
    
    return correctAnswerArray.includes(key);
  }

  // 修改错误答案的确定方法
  const isWrongOption = (key: string) => {
    if (!submittedAnswer) return false;
    
    const isSubmitted = Array.isArray(submittedAnswer) 
      ? submittedAnswer.includes(key) 
      : submittedAnswer === key;
    
    // 使用上面同样的逻辑获取正确答案
    const correctAnswerArray = answerResult?.correct_answer 
      ? (Array.isArray(answerResult.correct_answer) 
          ? answerResult.correct_answer 
          : typeof answerResult.correct_answer === 'string'
            ? answerResult.correct_answer.split('') 
            : [String(answerResult.correct_answer)])
      : (Array.isArray(question.answer) && question.answer.length > 0) 
          ? question.answer 
          : ['A']; // 最后的兜底值
    
    return isSubmitted && !correctAnswerArray.includes(key);
  }

  // 获取选项样式
  const getOptionStyle = (key: string) => {
    if (submittedAnswer) {
      if (isCorrectOption(key)) {
        return "bg-green-50 border-green-500 border-2"
      }
      if (isWrongOption(key)) {
        return "bg-red-50 border-red-500 border-2"
      }
    }
    return ""
  }

  // 确保我们有有效的选项列表
  const processOptions = () => {
    if (!question.options) {
      // 如果没有选项，创建默认的ABCD选项
      return ['A', 'B', 'C', 'D'].map((key, index) => ({
        key,
        text: `选项${key}`
      }));
    }
    
    if (Array.isArray(question.options)) {
      if (question.options.length === 0) {
        // 如果是空数组，创建默认的ABCD选项
        return ['A', 'B', 'C', 'D'].map((key, index) => ({
          key,
          text: `选项${key}`
        }));
      }
      
      // 处理不同格式的选项数组
      return question.options.map((opt, index) => {
        if (typeof opt === 'string') {
          // 如果选项是字符串，使用默认键
          return { key: String.fromCharCode(65 + index), text: opt };
        } else if (typeof opt === 'object' && opt !== null) {
          // 如果选项是对象，尝试提取键和文本
          return {
            key: opt.key || opt.value || String.fromCharCode(65 + index),
            text: opt.text || opt.label || opt.content || `选项${String.fromCharCode(65 + index)}`
          };
        } else {
          // 其他情况，使用默认值
          return { key: String.fromCharCode(65 + index), text: `选项${String.fromCharCode(65 + index)}` };
        }
      });
    }
    
    // 如果不是数组，尝试解析
    try {
      if (typeof question.options === 'string') {
        const parsed = JSON.parse(question.options);
        if (Array.isArray(parsed)) {
          return processOptions(parsed);
        }
      }
    } catch (e) {
      console.error("解析选项失败:", e);
    }
    
    // 兜底默认选项
    return ['A', 'B', 'C', 'D'].map((key, index) => ({
      key,
      text: `选项${key}`
    }));
  };

  // 获取正确答案的显示数组
  const getDisplayCorrectAnswers = () => {
    // 优先使用answerResult中的correct_answer
    if (answerResult?.correct_answer) {
      if (Array.isArray(answerResult.correct_answer)) {
        return answerResult.correct_answer;
      } else if (typeof answerResult.correct_answer === 'string') {
        return answerResult.correct_answer.split('');
      } else {
        return [String(answerResult.correct_answer)];
      }
    }
    
    // 如果没有answerResult，尝试使用question.answer
    if (Array.isArray(question.answer) && question.answer.length > 0) {
      return question.answer;
    }
    
    // 最后兜底：没有答案数据
    console.warn(`题目 #${question.id} 没有可用的正确答案，返回空数组`);
    return [];
  };
  
  // 获取解析文本
  const getExplanationText = () => {
    // 优先使用answerResult中的explanation
    if (answerResult?.explanation && answerResult.explanation !== "暂无解析") {
      return answerResult.explanation;
    }
    
    // 其次使用question中的analysis
    if (question?.analysis && question.analysis !== "暂无解析" && question.analysis.trim() !== '') {
      return question.analysis;
    }
    
    // 最后兜底
    return "暂无解析";
  };

  if (!canAccess) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center p-6">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">会员专享内容</h3>
          <p className="text-gray-500 mb-6">免费用户仅可访问2022年、2023年和2024年的法考真题库</p>
          <Button>升级会员</Button>
        </div>
      </div>
    )
  }

  const options = processOptions();

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-lg font-medium flex items-center">
          {question.question_code ? 
            `题号: ${question.question_code}` : 
            `题号: ${question.id}`}
          
          {/* 添加题目类型标签 */}
          <Badge 
            className="ml-3" 
            variant={question.type === "multiple" ? "outline" : "default"}
          >
            {question.type === "single" && "单选题"}
            {question.type === "multiple" && "多选题"}
            {question.type === "judgment" && "判断题"}
          </Badge>
        </h2>
      </div>
      
      <div className="text-base font-medium mb-6">{question.content}</div>

      <div className="space-y-2 mb-6">
        {options.map((option, index) => {
          // 获取选项的键和文本
          const optionKey = option.key || String.fromCharCode(65 + index);
          const optionText = option.text || `选项${optionKey}`;
          
          return (
            <div
              key={index}
              className={`
                p-3 rounded-lg border transition-all
                ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
                ${!submittedAnswer && question.type === "single" 
                  ? (selectedAnswer === optionKey ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300")
                  : !submittedAnswer && (Array.isArray(selectedAnswer) && selectedAnswer.includes(optionKey) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300")}
                ${submittedAnswer ? getOptionStyle(optionKey) : ""}
              `}
              onClick={() => !disabled && handleOptionSelect(optionKey)}
            >
              <div className="flex items-center">
                <div className="mr-2 min-w-[24px] h-6 w-6 flex items-center justify-center rounded-full border">
                  {optionKey}
                </div>
                <div>{optionText}</div>
                
                {/* 显示答案状态指示器 */}
                {submittedAnswer && (
                  <div className="ml-auto">
                    {isCorrectOption(optionKey) && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-500"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    {isWrongOption(optionKey) && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-red-500"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>

      {!hideSubmitButton && !submittedAnswer && (
        <Button
          className="mt-4"
          onClick={onSelectAnswer ? undefined : handleSubmit}
          disabled={
            disabled || 
            (question.type === "single" && !selectedAnswer) || 
            (question.type === "multiple" && (!Array.isArray(selectedAnswer) || selectedAnswer.length === 0))
          }
        >
          提交答案
        </Button>
      )}

      {/* 答案和解析区域 - 增强版 */}
      {question && submittedAnswer && answerResult && (
        <div className="space-y-4 mt-8 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">答案解析</h3>
            <div className="flex items-center">
              {answerResult.is_correct ? (
                <div className="flex items-center text-green-500">
                  <CheckCircle className="h-5 w-5 mr-1" />
                  <span>回答正确</span>
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <XCircle className="h-5 w-5 mr-1" />
                  <span>回答错误</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">正确答案：</span>
              {Array.isArray(answerResult.correct_answer) 
                ? answerResult.correct_answer.join(', ') 
                : (typeof answerResult.correct_answer === 'string' 
                   ? answerResult.correct_answer 
                   : answerResult.correct_answer !== undefined 
                     ? String(answerResult.correct_answer) 
                     : "未提供正确答案")}
            </div>
            <div className="text-sm">
              <span className="font-medium">你的答案：</span>
              {Array.isArray(submittedAnswer) 
                ? submittedAnswer.join(', ') 
                : submittedAnswer}
            </div>
            <div className="mt-4">
              <div className="font-medium text-sm mb-2">解析：</div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{answerResult.explanation || "暂无解析"}</p>
            </div>
          </div>
        </div>
      )}

      </div>
  )
}


