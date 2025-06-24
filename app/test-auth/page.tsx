"use client"

import { useAuth } from '@/hooks/useAuth'
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'

export default function TestAuthPage() {
  const { isAuthenticated, user, loading, logout } = useAuth()
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 bg-gray-50 p-8">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>认证状态测试页面</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">加载状态:</p>
                  <p className={loading ? "text-yellow-600" : "text-green-600"}>
                    {loading ? "加载中..." : "加载完成"}
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold">认证状态:</p>
                  <p className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                    {isAuthenticated ? "已登录" : "未登录"}
                  </p>
                </div>
              </div>

              {user && (
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">用户信息:</p>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">LocalStorage 数据:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">auth_token:</p>
                    <p className="text-xs bg-gray-100 p-2 rounded break-all">
                      {typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '无' : '检查中...'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">user_info:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {typeof window !== 'undefined' ? localStorage.getItem('user_info') || '无' : '检查中...'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => router.push('/login')}
                  variant="outline"
                >
                  去登录页面
                </Button>
                
                {isAuthenticated && (
                  <Button 
                    onClick={logout}
                    variant="destructive"
                  >
                    退出登录
                  </Button>
                )}
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="secondary"
                >
                  刷新页面
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">测试导航:</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => router.push('/ai-chat')}
                    size="sm"
                    variant="outline"
                  >
                    AI聊天
                  </Button>
                  <Button 
                    onClick={() => router.push('/knowledge-map')}
                    size="sm"
                    variant="outline"
                  >
                    知识导图
                  </Button>
                  <Button 
                    onClick={() => router.push('/question-bank')}
                    size="sm"
                    variant="outline"
                  >
                    题库
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}