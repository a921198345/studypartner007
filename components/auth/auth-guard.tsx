"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireMembership?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  requireMembership = false,
  fallback
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, loading } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (loading) return

    if (requireAuth && !isAuthenticated) {
      // 保存当前路径，登录后返回
      sessionStorage.setItem('redirectAfterLogin', pathname)
      router.push('/login')
      return
    }

    if (requireMembership && user?.membership_type !== 'paid') {
      // 如果需要会员权限但用户不是会员
      router.push('/membership')
      return
    }

    setIsReady(true)
  }, [loading, isAuthenticated, user, requireAuth, requireMembership, router, pathname])

  // 加载中状态
  if (loading || !isReady) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 如果不需要认证，或已认证，显示内容
  if (!requireAuth || isAuthenticated) {
    return <>{children}</>
  }

  // 否则返回null（实际上不会执行到这里，因为上面已经重定向了）
  return null
}