"use client"

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

// 需要认证的路由
const protectedRoutes = [
  '/learning-plan',
  '/question-bank',
  '/knowledge-map',
  '/notes',
  '/profile',
  '/ai-chat'
];

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { isAuthenticated, loading, checkAuthStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 页面加载时检查认证状态
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    // 检查当前路由是否需要认证
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );

    // 如果是受保护路由且用户未认证，重定向到登录页
    if (!loading && isProtectedRoute && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  return <>{children}</>;
}