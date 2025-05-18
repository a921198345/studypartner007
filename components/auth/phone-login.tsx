"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface PhoneLoginProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
}

export function PhoneLogin({ onLoginSuccess, redirectUrl }: PhoneLoginProps) {
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  const handleSendCode = async () => {
    if (!validatePhoneNumber(phone)) {
      setError("请输入正确的手机号")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      // 这里应该是发送验证码的API调用
      // const response = await fetch('/api/auth/sms-code', {...})

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      startCountdown()
    } catch (err) {
      setError("发送验证码失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePhoneNumber(phone)) {
      setError("请输入正确的手机号")
      return
    }

    if (!code || code.length !== 6) {
      setError("请输入6位验证码")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      // 这里应该是登录/注册的API调用
      // const response = await fetch('/api/auth/login', {...})

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (onLoginSuccess) {
        onLoginSuccess()
      }

      // 如果有重定向URL，则跳转
      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } catch (err) {
      setError("登录失败，请检查验证码是否正确")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white card-shadow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">登录/注册</CardTitle>
        <CardDescription className="text-center">使用手机号和验证码登录或注册账号</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="custom-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="custom-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isLoading}
                  className="whitespace-nowrap outline-button"
                >
                  {countdown > 0 ? `${countdown}秒后重发` : "获取验证码"}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full primary-button" disabled={isLoading}>
              {isLoading ? "处理中..." : "登录/注册"}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center">
          <Link href="/auth/wechat" className="text-primary hover:underline">
            使用微信登录
          </Link>
        </div>
        <div className="text-sm text-center text-gray-500">
          登录或注册即表示您同意我们的
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
  )
}
