"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Star, Filter, Lock } from "lucide-react"
import { Footer } from "@/components/footer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const subjects = [
    { id: "all", name: "全部科目" },
    { id: "civil", name: "民法" },
    { id: "criminal", name: "刑法" },
    { id: "civilProcedure", name: "民事诉讼法" },
    { id: "criminalProcedure", name: "刑事诉讼法" },
    { id: "commercial", name: "商法与经济法" },
    { id: "theory", name: "理论法学" },
    { id: "administrative", name: "行政法与行政诉讼法" },
    { id: "international", name: "三国法" },
  ]

  const years = [
    { id: "all", name: "全部年份" },
    { id: "2024", name: "2024年", free: true },
    { id: "2023", name: "2023年", free: true },
    { id: "2022", name: "2022年", free: false },
    { id: "2021", name: "2021年", free: false },
    { id: "2020", name: "2020年", free: false },
    { id: "2019", name: "2019年", free: false },
  ]

  const questions = [
    {
      id: 1,
      year: 2024,
      subject: "民法",
      type: "单选题",
      content: "根据《民法典》规定，下列关于民事法律行为有效要件的说法，正确的是：",
      isFavorite: true,
    },
    {
      id: 2,
      year: 2024,
      subject: "民法",
      type: "多选题",
      content: "根据《民法典》规定，下列关于无效民事法律行为的表述中，正确的有：",
      isFavorite: false,
    },
    {
      id: 3,
      year: 2023,
      subject: "刑法",
      type: "单选题",
      content: "关于正当防卫的成立条件，下列说法错误的是：",
      isFavorite: false,
    },
    {
      id: 4,
      year: 2023,
      subject: "民事诉讼法",
      type: "单选题",
      content: "关于民事诉讼中的管辖权，下列说法正确的是：",
      isFavorite: true,
    },
    {
      id: 5,
      year: 2022,
      subject: "民法",
      type: "判断题",
      content: "限制民事行为能力人实施的纯获利益的民事法律行为有效。",
      isFavorite: false,
    },
    {
      id: 6,
      year: 2022,
      subject: "刑法",
      type: "多选题",
      content: "下列哪些情形属于刑法中的犯罪中止：",
      isFavorite: false,
    },
  ]

  // 创建错题列表（为了保留"我的错题"标签页功能，但不显示错题标签）
  const wrongQuestions = [2, 4, 6] // 假设这些ID是错题

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold gradient-text">法考真题库</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索题目..."
                  className="w-[200px] pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">学科筛选</h3>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="选择学科" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">年份筛选</h3>
                    <div className="space-y-2">
                      {years.map((year) => (
                        <div key={year.id} className="flex items-center">
                          <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded text-primary"
                              defaultChecked={year.id === "2024" || year.id === "2023"}
                            />
                            <span>{year.name}</span>
                          </label>
                          {year.free === false && (
                            <Badge variant="outline" className="ml-auto">
                              <Lock className="h-3 w-3 mr-1" />
                              会员
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">题型筛选</h3>
                    <div className="space-y-2">
                      {["全部题型", "单选题", "多选题", "判断题"].map((type) => (
                        <label key={type} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded text-primary"
                            defaultChecked={type === "全部题型"}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-primary" />
                    学习统计
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>已做题目</span>
                        <span className="font-medium">42/500</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: "8.4%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>正确率</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "78%" }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-red-500">12</div>
                        <div className="text-xs text-gray-500">错题数</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-amber-500">8</div>
                        <div className="text-xs text-gray-500">收藏数</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 border-t">
                  <Button variant="outline" className="w-full">
                    继续上次练习
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="md:col-span-3">
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">全部题目</TabsTrigger>
                  <TabsTrigger value="wrong">我的错题</TabsTrigger>
                  <TabsTrigger value="favorite">我的收藏</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {questions.map((question) => (
                    <Card key={question.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {question.year}
                            </Badge>
                            <Badge variant="secondary" className="mr-2">
                              {question.subject}
                            </Badge>
                            <Badge variant="outline">{question.type}</Badge>
                          </div>
                          <div className="flex items-center space-x-1">
                            {question.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                          </div>
                        </div>
                        <p className="text-sm mb-3">{question.content}</p>
                        <div className="flex items-center justify-end">
                          <Button size="sm">开始答题</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {questions.some((q) => q.year !== 2024 && q.year !== 2023) && (
                    <Card className="border-dashed border-2 p-6 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="font-medium text-lg">会员专享内容</h3>
                        <p className="text-sm text-muted-foreground mb-4">升级为会员，解锁全部历年真题</p>
                        <Button>立即升级</Button>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="wrong">
                  <div className="space-y-4">
                    {questions
                      .filter((q) => wrongQuestions.includes(q.id))
                      .map((question) => (
                        <Card key={question.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {question.year}
                                </Badge>
                                <Badge variant="secondary" className="mr-2">
                                  {question.subject}
                                </Badge>
                                <Badge variant="outline">{question.type}</Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                {question.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                              </div>
                            </div>
                            <p className="text-sm mb-3">{question.content}</p>
                            <div className="flex items-center justify-end">
                              <Button size="sm">重新练习</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="favorite">
                  <div className="space-y-4">
                    {questions
                      .filter((q) => q.isFavorite)
                      .map((question) => (
                        <Card key={question.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {question.year}
                                </Badge>
                                <Badge variant="secondary" className="mr-2">
                                  {question.subject}
                                </Badge>
                                <Badge variant="outline">{question.type}</Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              </div>
                            </div>
                            <p className="text-sm mb-3">{question.content}</p>
                            <div className="flex items-center justify-end">
                              <Button size="sm">开始答题</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
