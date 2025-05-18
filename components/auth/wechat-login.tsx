"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

interface WechatLoginProps {
  onLoginSuccess?: () => void
  redirectUrl?: string
}

export function WechatLogin({ onLoginSuccess, redirectUrl }: WechatLoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [error, setError] = useState("")
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  // 模拟获取微信二维码
  const fetchWechatQrCode = async () => {
    setIsLoading(true)
    try {
      // 实际项目中应该调用微信授权接口获取二维码
      // const response = await fetch('/api/auth/wechat/qrcode', {...})

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 使用占位图像作为示例
      setQrCodeUrl("/placeholder.svg?height=200&width=200")

      // 开始轮询检查登录状态
      startPolling()
    } catch (err) {
      setError("获取微信二维码失败，请刷新页面重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 模拟轮询检查微信扫码状态
  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        // 实际项目中应该调用检查登录状态的接口
        // const response = await fetch('/api/auth/wechat/check-status', {...})

        // 模拟随机登录成功
        if (Math.random() > 0.9) {
          clearInterval(interval)
          setPollInterval(null)

          if (onLoginSuccess) {
            onLoginSuccess()
          }

          // 如果有重定向URL，则跳转
          if (redirectUrl) {
            window.location.href = redirectUrl
          }
        }
      } catch (err) {
        // 忽略轮询错误
      }
    }, 2000)

    setPollInterval(interval)
  }

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  // 组件加载时获取二维码
  useEffect(() => {
    fetchWechatQrCode()
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto bg-white card-shadow">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">微信登录</CardTitle>
        <CardDescription className="text-center">使用微信扫码登录学习搭子</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading ? (
          <div className="w-48 h-48 bg-gray-100 animate-pulse flex items-center justify-center">
            <span className="text-gray-500">加载中...</span>
          </div>
        ) : qrCodeUrl ? (
          <div className="relative w-48 h-48 border-2 border-green-500 p-2">
            <Image src={qrCodeUrl || "/placeholder.svg"} alt="微信登录二维码" fill className="object-contain" />
          </div>
        ) : (
          <div className="w-48 h-48 bg-red-50 flex items-center justify-center">
            <span className="text-red-500 text-center px-4">{error || "获取二维码失败"}</span>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500 text-center">请使用微信扫描二维码登录</p>

        {error && (
          <Button onClick={fetchWechatQrCode} className="mt-4" disabled={isLoading}>
            刷新二维码
          </Button>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center">
          <Link href="/auth/login" className="text-primary hover:underline">
            使用手机号登录
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
