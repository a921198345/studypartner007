"use client"

import type React from "react"

import Link from "next/link"
import { cn } from "../lib/utils"
import { usePathname } from "next/navigation"
import { BookOpen, Brain, FileText, MessageCircle, User, Calendar } from "lucide-react"
import { Button } from "./ui/button"
import { BookBuddyLogo5 } from "./BookBuddyLogo5"
import { useAuth } from "../hooks/useAuth"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuth()

  const routes = [
    {
      href: "/ai-chat",
      label: "法考问答",
      active: pathname === "/ai-chat",
      icon: <MessageCircle className="mr-2 h-4 w-4" />,
    },
    {
      href: "/knowledge-map",
      label: "知识导图",
      active: pathname === "/knowledge-map",
      icon: <Brain className="mr-2 h-4 w-4" />,
    },
    {
      href: "/question-bank",
      label: "真题库",
      active: pathname === "/question-bank",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
    },
    {
      href: "/notes",
      label: "学习笔记",
      active: pathname === "/notes",
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      href: "/learning-plan",
      label: "学习计划",
      active: pathname === "/learning-plan",
      icon: <Calendar className="mr-2 h-4 w-4" />,
    },
    {
      href: "/profile",
      label: "个人中心",
      active: pathname === "/profile",
      icon: <User className="mr-2 h-4 w-4" />,
    },
  ]

  return (
    <div className="flex w-full items-center justify-between">
      <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
        <BookBuddyLogo5 className="text-primary" size={32} />
        <span>学习搭子</span>
      </Link>
      <nav className={cn("flex items-center justify-end space-x-6", className)} {...props}>
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              route.active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {route.icon}
            <span>{route.label}</span>
          </Link>
        ))}
        {/* 根据登录状态显示不同按钮 */}
        {isAuthenticated ? (
          <div className="ml-6 flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {user?.nickname || user?.phone_number}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                logout()
                window.location.href = '/login'
              }}
            >
              退出登录
            </Button>
          </div>
        ) : (
          <Button asChild className="ml-6 text-white">
            <Link href="/login">登录</Link>
          </Button>
        )}
      </nav>
    </div>
  )
}
