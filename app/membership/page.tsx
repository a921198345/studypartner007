"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Star } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"

const features = [
  { free: true, vip: true, text: "每日2次AI问答" },
  { free: false, vip: true, text: "无限次AI问答" },
  { free: true, vip: true, text: "2023年法考真题库" },
  { free: false, vip: true, text: "全年份法考真题库" },
  { free: true, vip: true, text: "民法知识导图" },
  { free: false, vip: true, text: "全科目知识导图" },
  { free: true, vip: true, text: "基础学习计划" },
  { free: false, vip: true, text: "AI个性化学习计划" },
  { free: false, vip: true, text: "错题智能分析" },
  { free: false, vip: true, text: "学习进度报告" },
]

export default function MembershipPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isVip = user?.membership_type === 'paid'

  const handlePurchase = async (plan: 'monthly' | 'quarterly') => {
    setLoading(true)
    // 这里应该调用支付API
    alert(`即将跳转到支付页面购买${plan === 'monthly' ? '月度' : '季度'}会员`)
    setLoading(false)
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        
        <main className="flex-1">
          <div className="container mx-auto py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">会员中心</h1>
              <p className="text-xl text-muted-foreground">
                解锁全部功能，让法考学习更高效
              </p>
            </div>

            {isVip && (
              <div className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold">您已是尊贵的会员用户</p>
                      <p className="text-sm text-muted-foreground">
                        会员到期时间：{new Date(user.membership_expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">续费会员</Button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* 月度会员 */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-500">热门</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">月度会员</CardTitle>
                  <CardDescription>适合短期备考的考生</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">¥39.9</span>
                    <span className="text-muted-foreground">/月</span>
                  </div>
                  <ul className="space-y-3">
                    {features.filter(f => f.vip).slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase('monthly')}
                    disabled={loading || isVip}
                  >
                    {isVip ? '当前套餐' : '立即开通'}
                  </Button>
                </CardFooter>
              </Card>

              {/* 季度会员 */}
              <Card className="relative overflow-hidden border-primary">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500">推荐</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    季度会员
                    <Star className="h-5 w-5 ml-2 text-yellow-500" />
                  </CardTitle>
                  <CardDescription>最受欢迎的选择，性价比最高</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">¥99</span>
                    <span className="text-muted-foreground">/3个月</span>
                    <Badge variant="secondary" className="ml-2">省20%</Badge>
                  </div>
                  <ul className="space-y-3">
                    {features.filter(f => f.vip).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase('quarterly')}
                    disabled={loading || isVip}
                  >
                    {isVip ? '续费优惠' : '立即开通'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* 功能对比 */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">功能对比</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">功能</th>
                        <th className="text-center p-4">免费用户</th>
                        <th className="text-center p-4 bg-primary/5">会员用户</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-4">{feature.text}</td>
                          <td className="text-center p-4">
                            {feature.free ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-center p-4 bg-primary/5">
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  )
}