"use client"

import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Settings, BookOpen, Star, Lock } from "lucide-react"
import { Footer } from "@/components/footer"
import { UserInfoCard } from "@/components/profile/user-info-card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [membershipData, setMembershipData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 获取用户会员信息
  useEffect(() => {
    const fetchMembershipStatus = async () => {
      try {
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
          setError('请先登录');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/membership/status', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          const membershipInfo = data.data;
          setUser({
            id: membershipInfo.user.user_id,
            name: membershipInfo.user.nickname || "法考学员",
            phone: membershipInfo.user.phone_number,
            avatar: membershipInfo.user.avatar_url || "/placeholder.svg?height=96&width=96",
            membershipStatus: membershipInfo.membership.type,
            membershipExpiry: membershipInfo.membership.expiresAt ? new Date(membershipInfo.membership.expiresAt) : undefined,
            isActive: membershipInfo.membership.isActive
          });
          setMembershipData(membershipInfo);
        } else {
          setError(data.message || '获取用户信息失败');
        }
      } catch (err) {
        console.error('获取会员状态失败:', err);
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipStatus();
  }, []);

  // 处理升级/续费会员
  const handleUpgrade = (planId = null) => {
    // 如果指定了套餐ID，则直接跳转到对应的支付页面
    if (planId) {
      router.push(`/membership/purchase?plan=${planId}`);
    } else {
      // 否则跳转到套餐选择页面
      router.push('/membership/purchase');
    }
  };

  // 如果正在加载
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p>正在加载用户信息...</p>
          </div>
        </main>
      </div>
    );
  }

  // 如果有错误
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/login'}>去登录</Button>
          </div>
        </main>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold gradient-text">个人中心</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <UserInfoCard user={user} onUpgrade={handleUpgrade} />
            </div>

            <div className="md:col-span-3">
              <Tabs defaultValue="study">
                <TabsList className="mb-4">
                  <TabsTrigger value="study" className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    学习记录
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    设置
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="study" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>会员信息</CardTitle>
                      <CardDescription>查看您的会员状态和权益</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium">当前状态</h3>
                          <p className="text-sm text-gray-500">
                            {user?.membershipStatus === 'paid' && user?.isActive ? '付费会员' : '免费用户'}
                          </p>
                          {user?.membershipExpiry && (
                            <p className="text-xs text-gray-400">
                              到期时间：{user.membershipExpiry.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge variant={user?.membershipStatus === 'paid' && user?.isActive ? 'default' : 'outline'}>
                          {user?.membershipStatus === 'paid' && user?.isActive ? (
                            <>
                              <Star className="h-3 w-3 mr-1" />
                              会员权益
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              功能受限
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">月度会员</CardTitle>
                            <CardDescription>
                              <span className="text-2xl font-bold">¥39.9</span> / 月
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>无限制AI问答</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>所有年份真题库</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>所有学科知识导图</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>个性化学习计划</span>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button 
                              className="w-full" 
                              onClick={() => handleUpgrade('1month')}
                            >
                              {user?.membershipStatus === 'paid' && user?.isActive ? '续费会员' : '立即开通'}
                            </Button>
                          </CardFooter>
                        </Card>

                        <Card className="border-primary">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">季度会员</CardTitle>
                              <Badge>推荐</Badge>
                            </div>
                            <CardDescription>
                              <span className="text-2xl font-bold">¥99</span> / 3个月
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>无限制AI问答</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>所有年份真题库</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>所有学科知识导图</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>个性化学习计划</span>
                            </div>
                            <div className="flex items-start">
                              <div className="rounded-full bg-primary/10 p-1 mr-2">
                                <svg
                                  className="h-3 w-3 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span className="font-medium">每月仅33元，比月度会员更划算</span>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button 
                              className="w-full" 
                              onClick={() => handleUpgrade('3month')}
                            >
                              {user?.membershipStatus === 'paid' && user?.isActive ? '续费会员' : '立即开通'}
                            </Button>
                          </CardFooter>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>应用设置</CardTitle>
                      <CardDescription>管理您的应用偏好设置</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">深色模式</h3>
                          <p className="text-sm text-gray-500">切换应用的显示主题</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">消息通知</h3>
                          <p className="text-sm text-gray-500">接收学习提醒和系统通知</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">学习提醒</h3>
                          <p className="text-sm text-gray-500">每日学习计划提醒</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
