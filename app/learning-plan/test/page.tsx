"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"
import { Footer } from "@/components/footer"

export default function LearningPlanTestPage() {
  const [showMessage, setShowMessage] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="space-y-4">
              <Target className="h-16 w-16 mx-auto text-blue-500" />
              <h2 className="text-2xl font-bold">学习计划测试页面</h2>
              <p className="text-muted-foreground text-lg">
                这是一个简化的测试页面，用于验证基本功能是否正常
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>功能测试</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowMessage(!showMessage)}
                  className="w-full"
                >
                  {showMessage ? '隐藏消息' : '显示消息'}
                </Button>
                
                {showMessage && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700">✅ React状态管理正常工作！</p>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <p>如果您能看到这个页面并且按钮正常工作，说明基本框架没有问题。</p>
                  <p className="mt-2">访问路径：<code>/learning-plan/test</code></p>
                </div>
              </CardContent>
            </Card>

            <div className="space-x-4">
              <Button asChild>
                <a href="/learning-plan">返回学习计划页面</a>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}