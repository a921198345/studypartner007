"use client"

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

interface DelayedAuthGuardProps {
  children: (props: {
    isAuthenticated: boolean
    checkAuth: () => boolean
    requireAuth: (callback?: () => void) => void
  }) => React.ReactNode
  authMessage?: string
  authTitle?: string
}

export function DelayedAuthGuard({ 
  children,
  authMessage = "此功能需要登录后才能使用",
  authTitle = "需要登录"
}: DelayedAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  const checkAuth = () => {
    return isAuthenticated
  }

  const requireAuth = (callback?: () => void) => {
    if (isAuthenticated) {
      // 已登录，直接执行回调
      if (callback) callback()
      return
    }

    // 未登录，显示登录提示
    setPendingCallback(() => callback)
    setShowAuthDialog(true)
  }

  const handleLogin = () => {
    // 保存当前路径和待执行的回调
    sessionStorage.setItem('redirectAfterLogin', pathname)
    if (pendingCallback) {
      sessionStorage.setItem('pendingAction', 'true')
    }
    router.push('/login')
  }

  const handleCancel = () => {
    setShowAuthDialog(false)
    setPendingCallback(null)
  }

  return (
    <>
      {children({ isAuthenticated, checkAuth, requireAuth })}
      
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{authTitle}</DialogTitle>
            <DialogDescription>
              {authMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              稍后再说
            </Button>
            <Button onClick={handleLogin}>
              立即登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}