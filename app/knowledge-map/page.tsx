"use client"

import React from 'react';
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ZoomIn, ZoomOut, Lock, Brain } from "lucide-react"
import { Footer } from "@/components/footer"

// 使用 dynamic import 避免 SSR 相关问题
const MindMapViewer = dynamic(
  () => import('@/components/knowledge-map/MindMapViewer'),
  { ssr: false } // 禁用服务器端渲染
);

export default function KnowledgeMapPage() {
  const searchParams = useSearchParams()
  const urlSubject = searchParams.get('subject') || "civil"
  const urlSearch = searchParams.get('search') || ""
  
  // 解析多个搜索关键词（用逗号分隔）
  const searchKeywords = urlSearch ? urlSearch.split(',').map(k => k.trim()).filter(k => k) : []
  
  // 科目ID到中文名称的映射
  const subjectIdToName: Record<string, string> = {
    'civil': '民法',
    'criminal': '刑法',
    'administrative': '行政法',
    'constitutional': '宪法',
    'civilProcedure': '民事诉讼法',
    'criminalProcedure': '刑事诉讼法',
    'economic': '经济法',
    'international': '国际法',
    'theory': '法理学'
  }
  
  // 获取科目的中文名称
  const getSubjectName = (subjectId: string) => {
    return subjectIdToName[subjectId] || subjectId
  }
  
  const [selectedSubject, setSelectedSubject] = useState(urlSubject)
  const [selectedSubjectName, setSelectedSubjectName] = useState(getSubjectName(urlSubject))
  const [zoomLevel, setZoomLevel] = useState(1.0); // 添加缩放级别状态
  const [searchTerm, setSearchTerm] = useState(urlSearch); // 添加搜索词状态
  const [inputValue, setInputValue] = useState(''); // 从AI聊天跳转时不显示在搜索框
  const [totalNodeCount, setTotalNodeCount] = useState(0); // 添加知识点总数状态
  const [isFromAIChat, setIsFromAIChat] = useState(false); // 标记是否从AI聊天跳转
  
  // 创建引用，用于访问SVG元素或知识导图容器
  const mindMapRef = useRef<HTMLDivElement>(null);
  
  // 监听URL参数变化
  useEffect(() => {
    const subject = searchParams.get('subject')
    const search = searchParams.get('search')
    
    if (subject) {
      setSelectedSubject(subject)
      setSelectedSubjectName(getSubjectName(subject))
    }
    
    if (search) {
      // 如果有搜索参数，说明是从AI聊天跳转来的
      setIsFromAIChat(true)
      setSearchTerm(search)
      // 不设置inputValue，保持搜索框为空
    } else {
      setIsFromAIChat(false)
    }
  }, [searchParams])
  
  // 缩放处理函数
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0)); // 放大但限制最大值
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3)); // 缩小但限制最小值
  };

  // 输入变化处理函数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 搜索处理函数
  const handleSearch = useCallback((e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e as React.KeyboardEvent).key === 'Enter' || e.type === 'click') {
      setSearchTerm(inputValue);
    }
  }, [inputValue]);
  
  // 回调函数，用于从MindMapViewer获取节点总数
  const handleNodeCountUpdate = (count: number) => {
    setTotalNodeCount(count);
  };

  const subjects = [
    { id: "civil", name: "民法", free: true },
    { id: "criminal", name: "刑法", free: false },
    { id: "civilProcedure", name: "民事诉讼法", free: false },
    { id: "criminalProcedure", name: "刑事诉讼法", free: false },
    { id: "economic", name: "经济法", free: false },
    { id: "theory", name: "法理学", free: false },
    { id: "administrative", name: "行政法", free: false },
    { id: "constitutional", name: "宪法", free: false },
    { id: "international", name: "国际法", free: false },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto py-4"> {/* 减少顶部内边距 */}
          <Tabs defaultValue="map" className="mt-0">
            <div className="flex justify-between items-center mb-3"> {/* 修改为两侧对齐 */}
              <TabsList>
                <TabsTrigger value="map" className="custom-tab">
                  知识导图
                </TabsTrigger>
                <TabsTrigger value="subjects" className="custom-tab">
                  学科选择
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="搜索知识点..." 
                    className="w-[200px] pl-8 custom-input" 
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0" 
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <TabsContent value="map">
              <div className="bg-white rounded-lg p-4 card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-[#E9B949]" />
                    {selectedSubjectName}知识导图
                  </h2>
                  <Badge className="badge-outline">共 {totalNodeCount} 个知识点</Badge>
                </div>

                <div 
                  className="bg-gray-50 rounded-lg border p-4 min-h-[700px] relative grid-background" 
                  ref={mindMapRef}
                  style={{ height: "75vh" }} 
                >
                  <MindMapViewer 
                    subject={selectedSubjectName} 
                    customZoom={zoomLevel} 
                    searchTerm={searchTerm} 
                    onNodeCountUpdate={handleNodeCountUpdate}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 card-shadow mt-4">
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
                      selectedSubject === subject.id ? "border-[#E9B949]" : ""
                    }`}
                    onClick={() => {
                      setSelectedSubject(subject.id)
                      setSelectedSubjectName(subject.name)
                    }}
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
