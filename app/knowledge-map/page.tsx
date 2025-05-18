"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ZoomIn, ZoomOut, Lock, Brain } from "lucide-react"
import { Footer } from "@/components/footer"

export default function KnowledgeMapPage() {
  const [selectedSubject, setSelectedSubject] = useState("民法")

  const subjects = [
    { id: "civil", name: "民法", free: true },
    { id: "criminal", name: "刑法", free: false },
    { id: "civilProcedure", name: "民事诉讼法", free: false },
    { id: "criminalProcedure", name: "刑事诉讼法", free: false },
    { id: "commercial", name: "商法与经济法", free: false },
    { id: "theory", name: "理论法学", free: false },
    { id: "administrative", name: "行政法与行政诉讼法", free: false },
    { id: "international", name: "三国法", free: false },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">法考知识导图</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="搜索知识点..." className="w-[200px] pl-8 custom-input" />
              </div>
              <Button variant="outline" size="icon">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="map" className="space-y-4">
            <TabsList>
              <TabsTrigger value="map" className="custom-tab">
                知识导图
              </TabsTrigger>
              <TabsTrigger value="subjects" className="custom-tab">
                学科选择
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="space-y-4">
              <div className="bg-white rounded-lg p-4 card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-[#E9B949]" />
                    {selectedSubject}知识导图
                  </h2>
                  <Badge className="badge-outline">共 156 个知识点</Badge>
                </div>

                <div className="bg-gray-50 rounded-lg border p-4 min-h-[600px] relative grid-background">
                  {/* 这里是知识导图的可视化部分，使用react-d3-tree实现 */}
                  {/* 为了原型展示，这里使用静态图片 */}
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-4xl">
                      <img src="/placeholder.svg?height=600&width=1000" alt="民法知识导图" className="w-full h-auto" />

                      {/* 模拟知识点节点 */}
                      <div className="absolute left-[50%] top-[20%] transform -translate-x-1/2 knowledge-node active">
                        <CardContent className="p-2 text-sm font-medium">民法总则</CardContent>
                      </div>

                      <div className="absolute left-[30%] top-[40%] transform -translate-x-1/2 knowledge-node">
                        <CardContent className="p-2 text-sm">民事法律行为</CardContent>
                      </div>

                      <div className="absolute left-[70%] top-[40%] transform -translate-x-1/2 knowledge-node">
                        <CardContent className="p-2 text-sm">民事责任</CardContent>
                      </div>

                      <div className="absolute left-[20%] top-[60%] transform -translate-x-1/2 knowledge-node active">
                        <CardContent className="p-2 text-sm">有效要件</CardContent>
                      </div>

                      <div className="absolute left-[40%] top-[60%] transform -translate-x-1/2 knowledge-node">
                        <CardContent className="p-2 text-sm">无效与可撤销</CardContent>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 card-shadow">
                <h3 className="text-lg font-medium mb-3">当前知识点详情</h3>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">民事法律行为的有效要件</h4>
                    <p className="text-sm text-gray-700 mb-4">
                      根据《民法典》第一百四十三条，具备以下条件的民事法律行为有效： 一是行为人具有相应的民事行为能力；
                      二是意思表示真实； 三是不违反法律、行政法规的强制性规定，不违背公序良俗。
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        查看相关真题
                      </Button>
                      <Button size="sm" className="primary-button">
                        AI详解
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subjects">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className={`cursor-pointer transition-all feature-card ${
                      selectedSubject === subject.name ? "border-[#E9B949]" : ""
                    }`}
                    onClick={() => setSelectedSubject(subject.name)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full bg-[#E9B949]/10 flex items-center justify-center mb-3">
                        <Brain className="h-8 w-8 text-[#E9B949]" />
                      </div>
                      <h3 className="font-semibold mb-1">{subject.name}</h3>
                      {!subject.free && (
                        <Badge className="mt-2 badge-outline">
                          <Lock className="h-3 w-3 mr-1" />
                          会员专享
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
