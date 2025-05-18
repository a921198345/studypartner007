"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { useRouter } from "next/navigation"
import { PhoneVerification } from "@/components/ui/phone-verification"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const handleVerificationSuccess = (phoneNumber: string) => {
    setVerifiedPhone(phoneNumber)
    setIsPhoneVerified(true)
    setVerificationError(null)
  }

  const handleVerificationError = (error: string) => {
    setVerificationError(error)
    setIsPhoneVerified(false)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert("请输入昵称")
      return
    }
    
    if (!isPhoneVerified || !verifiedPhone) {
      alert("请先完成手机验证")
      return
    }
    
    // 这里可以添加实际的注册逻辑，如调用API创建用户
    console.log("注册信息:", {
      name,
      phone: verifiedPhone,
      verified: isPhoneVerified
    })
    
    // 注册成功后跳转
    router.push("/learning-plan")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-12 grid-background">
        <Card className="w-full max-w-md mx-auto bg-white card-shadow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">注册账号</CardTitle>
            <CardDescription className="text-center">创建您的学习搭子账号，开始法考备考之旅</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">昵称</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="custom-input"
                  />
                </div>
                
                {/* 集成手机验证组件 */}
                <div className="grid gap-2">
                  <PhoneVerification 
                    onVerificationSuccess={handleVerificationSuccess}
                    onVerificationError={handleVerificationError}
                  />
                </div>
                
                {/* 显示验证状态 */}
                {isPhoneVerified && (
                  <div className="text-green-500 text-sm">
                    手机号 {verifiedPhone} 验证成功!
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full primary-button mt-4"
                  disabled={!isPhoneVerified}
                >
                  注册并开始学习
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center">
              已有账号？
              <Link href="/login" className="text-primary hover:underline ml-1">
                立即登录
              </Link>
            </div>
            <div className="text-sm text-center text-gray-500">
              注册即表示您同意我们的
              <Link href="/terms" className="text-primary hover:underline ml-1">
                用户协议
              </Link>
              和
              <Link href="/privacy" className="text-primary hover:underline ml-1">
                隐私政策
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
