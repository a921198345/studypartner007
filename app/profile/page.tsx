"use client"

import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Settings, BookOpen, Star, Calendar, FileText, Lock } from "lucide-react"
import { Footer } from "@/components/footer"
import { UserInfoCard } from "@/components/profile/user-info-card"

export default function ProfilePage() {
  const user = {
    id: "user123",
    name: "小法同学",
    phone: "15612348888",
    avatar: "/placeholder.svg?height=96&width=96",
    membershipStatus: "free_user" as const,
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
              <UserInfoCard user={user} onUpgrade={() => console.log("Upgrade clicked")} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">学习统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>总学习时长</span>
                      <span className="font-medium">42小时</span>
                    </div>
                    <Progress value={42} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>总做题数</span>
                      <span className="font-medium">156题</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>正确率</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-lg font-semibold text-primary">14天</div>
                      <div className="text-xs text-gray-500">连续学习</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="text-lg font-semibold text-primary">3.5h</div>
                      <div className="text-xs text-gray-500">今日学习</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                          <p className="text-sm text-gray-500">免费用户</p>
                        </div>
                        <Badge variant="outline">
                          <Lock className="h-3 w-3 mr-1" />
                          功能受限
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
                            <Button className="w-full">立即开通</Button>
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
                            <Button className="w-full">立即开通</Button>
                          </CardFooter>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>学习计划</CardTitle>
                      <CardDescription>查看您的学习进度和计划</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium">距离法考</h3>
                          <p className="text-sm text-gray-500">2025年9月</p>
                        </div>
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          还有120天
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">学科进度</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>民法</span>
                              <span className="font-medium">45%</span>
                            </div>
                            <Progress value={45} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>刑法</span>
                              <span className="font-medium">30%</span>
                            </div>
                            <Progress value={30} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>民事诉讼法</span>
                              <span className="font-medium">20%</span>
                            </div>
                            <Progress value={20} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>刑事诉讼法</span>
                              <span className="font-medium">15%</span>
                            </div>
                            <Progress value={15} className="h-2" />
                          </div>
                        </div>
                      </div>

                      <Button className="w-full">
                        <Lock className="h-4 w-4 mr-2" />
                        查看完整学习计划（会员功能）
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Star className="h-5 w-5 mr-2 text-yellow-400" />
                          我的收藏
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">民法</Badge>
                              <Badge variant="secondary">单选题</Badge>
                            </div>
                            <p className="text-sm line-clamp-2">
                              根据《民法典》规定，下列关于民事法律行为有效要件的说法，正确的是：
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">民事诉讼法</Badge>
                              <Badge variant="secondary">单选题</Badge>
                            </div>
                            <p className="text-sm line-clamp-2">关于民事诉讼中的管辖权，下列说法正确的是：</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          查看全部收藏
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-primary" />
                          我的笔记
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">民事法律行为的有效要件</h4>
                              <Badge variant="outline">民法</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">2025-05-10 更新</p>
                            <p className="text-sm line-clamp-2">
                              民事法律行为应当具备下列条件：1. 行为人具有相应的民事行为能力；2. 意思表示真实；3.
                              不违反法律、行政法规的强制性规定，不违背公序良俗。
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">刑法中的正当防卫</h4>
                              <Badge variant="outline">刑法</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">2025-05-09 更新</p>
                            <p className="text-sm line-clamp-2">
                              正当防卫的构成要件：1. 有不法侵害存在 2. 防卫行为针对不法侵害人 3.
                              防卫行为没有明显超过必要限度
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          查看全部笔记
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
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
