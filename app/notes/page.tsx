"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Plus, Calendar, Edit, Trash2, Lock } from "lucide-react"
import { Footer } from "@/components/footer"

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const notes = [
    {
      id: 1,
      title: "民事法律行为的有效要件",
      content:
        "民事法律行为应当具备下列条件：\n1. 行为人具有相应的民事行为能力；\n2. 意思表示真实；\n3. 不违反法律、行政法规的强制性规定，不违背公序良俗。",
      subject: "民法",
      createdAt: "2025-05-10",
      updatedAt: "2025-05-10",
    },
    {
      id: 2,
      title: "刑法中的正当防卫",
      content: "正当防卫的构成要件：\n1. 有不法侵害存在\n2. 防卫行为针对不法侵害人\n3. 防卫行为没有明显超过必要限度",
      subject: "刑法",
      createdAt: "2025-05-09",
      updatedAt: "2025-05-09",
    },
    {
      id: 3,
      title: "民事诉讼管辖权",
      content:
        "民事诉讼管辖权分为：\n1. 级别管辖\n2. 地域管辖\n  - 一般地域管辖\n  - 特殊地域管辖\n  - 专属管辖\n  - 协议管辖",
      subject: "民事诉讼法",
      createdAt: "2025-05-08",
      updatedAt: "2025-05-08",
    },
    {
      id: 4,
      title: "合同的成立与生效",
      content:
        "合同成立的要件：\n1. 主体适格\n2. 意思表示真实\n3. 内容合法\n\n合同生效的要件：\n1. 行为人具有相应的民事行为能力\n2. 意思表示真实\n3. 不违反法律、行政法规的强制性规定，不违背公序良俗",
      subject: "民法",
      createdAt: "2025-05-07",
      updatedAt: "2025-05-07",
    },
  ]

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
            <h1 className="text-3xl font-bold gradient-text">学习笔记</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索笔记..."
                  className="w-[200px] pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建笔记
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">学科筛选</h3>
                    <div className="space-y-2">
                      {[
                        "全部学科",
                        "民法",
                        "刑法",
                        "民事诉讼法",
                        "刑事诉讼法",
                        "商法与经济法",
                        "理论法学",
                        "行政法与行政诉讼法",
                        "三国法",
                      ].map((subject) => (
                        <label key={subject} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded text-primary"
                            defaultChecked={subject === "全部学科"}
                          />
                          <span>{subject}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">时间筛选</h3>
                    <div className="space-y-2">
                      {["全部时间", "最近一周", "最近一个月", "最近三个月"].map((time) => (
                        <label key={time} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded text-primary"
                            defaultChecked={time === "全部时间"}
                          />
                          <span>{time}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    笔记统计
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-primary">{notes.length}</div>
                        <div className="text-xs text-gray-500">笔记总数</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-primary">2</div>
                        <div className="text-xs text-gray-500">民法笔记</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-primary">1</div>
                        <div className="text-xs text-gray-500">刑法笔记</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-primary">1</div>
                        <div className="text-xs text-gray-500">民诉笔记</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 border-t">
                  <Button variant="outline" className="w-full">
                    <Lock className="h-4 w-4 mr-2" />
                    会员功能
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="md:col-span-3">
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">全部笔记</TabsTrigger>
                  <TabsTrigger value="recent">最近编辑</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {notes.map((note) => (
                    <Card key={note.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-lg">{note.title}</h3>
                          <Badge variant="outline">{note.subject}</Badge>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mb-3">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>创建于 {note.createdAt}</span>
                          <span className="mx-2">•</span>
                          <span>更新于 {note.updatedAt}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3 mb-3">{note.content}</p>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="border-dashed border-2 p-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <h3 className="font-medium text-lg">笔记使用情况</h3>
                      <p className="text-sm text-muted-foreground mb-4">您已创建 {notes.length}/5 条笔记</p>
                      {notes.length < 5 ? (
                        <Button>新建笔记</Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">已达到免费用户上限</p>
                          <Button>升级会员无限创建</Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="recent">
                  <div className="space-y-4">
                    {notes.slice(0, 2).map((note) => (
                      <Card key={note.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-lg">{note.title}</h3>
                            <Badge variant="outline">{note.subject}</Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-3">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>创建于 {note.createdAt}</span>
                            <span className="mx-2">•</span>
                            <span>更新于 {note.updatedAt}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3 mb-3">{note.content}</p>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
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
