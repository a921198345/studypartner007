"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Target, BookOpen, CheckCircle } from "lucide-react"

interface MonthlyPlanViewProps {
  month: number // 0-11
  year: number
  goal: string
}

export function MonthlyPlanView({ month, year, goal }: MonthlyPlanViewProps) {
  // 格式化月份
  const formatMonth = (month: number, year: number) => {
    return `${year}年${month + 1}月`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-primary mr-2" />
          <h3 className="font-medium text-lg">{formatMonth(month, year)}</h3>
        </div>
        <Badge variant="outline">
          <Target className="mr-1 h-3 w-3" />
          目标: {goal}
        </Badge>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">月度学习计划概览</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 text-primary mr-2" />
                <h5 className="font-medium">民法</h5>
              </div>
              <Progress value={35} className="h-2 mb-2" />
              <div className="text-xs text-gray-500 flex justify-between">
                <span>计划: 40小时</span>
                <span>进度: 35%</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 text-primary mr-2" />
                <h5 className="font-medium">刑法</h5>
              </div>
              <Progress value={20} className="h-2 mb-2" />
              <div className="text-xs text-gray-500 flex justify-between">
                <span>计划: 30小时</span>
                <span>进度: 20%</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 text-primary mr-2" />
                <h5 className="font-medium">民事诉讼法</h5>
              </div>
              <Progress value={10} className="h-2 mb-2" />
              <div className="text-xs text-gray-500 flex justify-between">
                <span>计划: 20小时</span>
                <span>进度: 10%</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 text-primary mr-2" />
                <h5 className="font-medium">刑事诉讼法</h5>
              </div>
              <Progress value={5} className="h-2 mb-2" />
              <div className="text-xs text-gray-500 flex justify-between">
                <span>计划: 20小时</span>
                <span>进度: 5%</span>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">月度学习目标</h4>
          <Card className="p-4">
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <span>完成民法总则全部章节的学习</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <span>掌握刑法总论的基本原理和概念</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <span>完成至少200道真题练习</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                <span>建立民法和刑法的知识体系框架</span>
              </li>
            </ul>
          </Card>
        </div>

        <div>
          <h4 className="font-medium mb-2">学习热力图</h4>
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded ${
                    i % 7 === 0 || i % 7 === 6
                      ? "bg-gray-100"
                      : i < 15
                        ? "bg-primary"
                        : i < 22
                          ? "bg-primary/70"
                          : i < 28
                            ? "bg-primary/40"
                            : "bg-primary/20"
                  } flex items-center justify-center text-xs ${i < 22 ? "text-white" : "text-gray-700"}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary/20 mr-1 rounded"></div>
                <span>较少</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary/40 mr-1 rounded"></div>
                <span>适中</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary/70 mr-1 rounded"></div>
                <span>较多</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary mr-1 rounded"></div>
                <span>充分</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
