"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Brain, Star, Clock, CheckCircle, XCircle } from "lucide-react"
import { Footer } from "@/components/footer"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

export default function QuestionPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const question = {
    id: 1,
    year: 2023,
    subject: "民法",
    type: "单选题",
    content: "根据《民法典》规定，下列关于民事法律行为有效要件的说法，正确的是：",
    options: [
      { id: "A", content: "行为人与相对人意思表示一致的民事法律行为一定有效" },
      { id: "B", content: "限制民事行为能力人实施的纯获利益的民事法律行为经法定代理人同意后有效" },
      { id: "C", content: "违反强制性规定的民事法律行为一律无效" },
      {
        id: "D",
        content: "民事法律行为应当具备行为人具有相应的民事行为能力、意思表示真实、不违反法律强制性规定和公序良俗",
      },
    ],
    answer: "D",
    analysis:
      "根据《民法典》第一百四十三条，具备下列条件的民事法律行为有效：（一）行为人具有相应的民事行为能力；（二）意思表示真实；（三）不违反法律、行政法规的强制性规定，不违背公序良俗。\n\nA项错误，即使双方意思表示一致，如果违反法律强制性规定或公序良俗，民事法律行为仍然无效。\n\nB项错误，限制民事行为能力人实施的纯获利益的民事法律行为直接有效，无需经法定代理人同意。\n\nC项错误，根据《民法典》第一百五十三条，违反强制性规定的民事法律行为不一定无效，只有违反强制性规定的效力性规范时才导致无效。\n\nD项正确，完整表述了民事法律行为的有效要件。",
    relatedKnowledgePoints: ["民事法律行为", "民事行为能力", "意思表示", "法律行为效力"],
  }

  const handleSubmit = () => {
    if (!selectedOption) return
    setIsSubmitted(true)
  }

  const isCorrect = selectedOption === question.answer

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex items-center mb-6">
            <Button variant="outline" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
            <h1 className="text-xl font-semibold">真题练习</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{question.year}</Badge>
                      <Badge variant="secondary">{question.subject}</Badge>
                      <Badge>{question.type}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className={isFavorite ? "text-yellow-500" : ""}
                    >
                      <Star className={`h-5 w-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                    </Button>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-medium mb-4">{question.content}</h2>

                    {question.type === "单选题" && (
                      <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption} disabled={isSubmitted}>
                        <div className="space-y-3">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className={`flex items-start space-x-2 p-3 rounded-md ${
                                isSubmitted && option.id === question.answer
                                  ? "bg-green-50 border border-green-200"
                                  : isSubmitted && option.id === selectedOption
                                    ? "bg-red-50 border border-red-200"
                                    : "hover:bg-gray-50"
                              }`}
                            >
                              <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor={`option-${option.id}`} className="text-base font-medium">
                                  {option.id}. {option.content}
                                </Label>
                              </div>
                              {isSubmitted && option.id === question.answer && (
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                              )}
                              {isSubmitted && option.id === selectedOption && option.id !== question.answer && (
                                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {question.type === "多选题" && (
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <div key={option.id} className="flex items-start space-x-2 p-3 rounded-md hover:bg-gray-50">
                            <Checkbox id={`option-${option.id}`} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={`option-${option.id}`} className="text-base font-medium">
                                {option.id}. {option.content}
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isSubmitted ? (
                    <Button onClick={handleSubmit} disabled={!selectedOption}>
                      提交答案
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-md ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
                        <div className="flex items-center mb-2">
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              <h3 className="font-medium text-green-700">回答正确</h3>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-500 mr-2" />
                              <h3 className="font-medium text-red-700">回答错误</h3>
                            </>
                          )}
                        </div>
                        <p className="text-sm">
                          正确答案: <span className="font-medium">{question.answer}</span>
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">解析</h3>
                        <div className="text-sm text-gray-700 whitespace-pre-line">{question.analysis}</div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">相关知识点</h3>
                        <div className="flex flex-wrap gap-2">
                          {question.relatedKnowledgePoints.map((point, index) => (
                            <Badge key={index} variant="outline">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button className="mt-4">
                        <Brain className="h-4 w-4 mr-2" />
                        查看相关知识导图
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    答题进度
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>当前进度</span>
                        <span className="font-medium">12/50</span>
                      </div>
                      <Progress value={24} className="h-2" />
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <Button
                          key={i}
                          variant={i === 11 ? "default" : i < 11 ? "outline" : "ghost"}
                          size="sm"
                          className={`h-8 w-8 p-0 ${i < 11 && i % 3 === 0 ? "bg-green-100" : i < 11 && i % 4 === 0 ? "bg-red-100" : ""}`}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-1"></div>
                        <span>答对</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-1"></div>
                        <span>答错</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-white border border-gray-200 rounded mr-1"></div>
                        <span>未做</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  上一题
                </Button>
                <Button className="flex-1">
                  下一题
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <Button variant="secondary" className="w-full">
                保存进度，下次继续
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
