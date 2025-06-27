"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { BookOpen, Brain, Lock } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface RelatedResourcesProps {
  subject: string
  isMember?: boolean
}

export function RelatedResources({ subject, isMember = false }: RelatedResourcesProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 模拟相关知识点数据
  const knowledgePoints = [
    { id: "km_101", name: "民事法律行为", path: "民法/民法总则/民事法律行为" },
    { id: "km_102", name: "民事法律行为的有效要件", path: "民法/民法总则/民事法律行为/有效要件" },
  ]

  // 模拟相关真题数据
  const relatedQuestions = [
    { id: 101, year: 2023, type: "单选题", title: "关于民事法律行为有效要件的说法，正确的是：" },
    { id: 203, year: 2022, type: "多选题", title: "下列关于民事法律行为效力的表述中，正确的有：" },
  ]

  // 检查是否可以访问资源
  const canAccessKnowledgeMap = isMember || subject === "民法"
  const canAccessQuestions = isMember || (subject === "民法" && !isExpanded)

  return (
    <div className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-90"}`}>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center">
              <Brain className="h-4 w-4 mr-2 text-primary" />
              相关学习资源
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "收起" : "展开"}
            </Button>
          </CardTitle>
        </CardHeader>

        {isExpanded && (
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium flex items-center mb-2">
                  <Brain className="h-3 w-3 mr-1 text-primary" />
                  相关知识点
                </h4>
                <div className="space-y-1.5">
                  {knowledgePoints.map((point) => (
                    <div key={point.id} className="flex justify-between items-center">
                      <span className="text-xs">{point.path}</span>
                      {canAccessKnowledgeMap ? (
                        <Link href={`/knowledge-map?point=${point.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            查看
                          </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          会员专享
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium flex items-center mb-2">
                  <BookOpen className="h-3 w-3 mr-1 text-primary" />
                  相关真题
                </h4>
                <div className="space-y-1.5">
                  {relatedQuestions.map((question) => (
                    <div key={question.id} className="flex justify-between items-center">
                      <div className="flex items-center text-xs">
                        <Badge variant="outline" className="mr-1 text-[10px]">
                          {question.year}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {question.type}
                        </Badge>
                        <span className="ml-1 truncate max-w-[150px]">{question.title}</span>
                      </div>
                      {canAccessQuestions ? (
                        <Link href={`/question-bank/${question.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            做题
                          </Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          会员专享
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
