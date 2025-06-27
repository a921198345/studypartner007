"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Plus, MessageSquare, Trash2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"

interface MinimalSidebarProps {
  currentConversationId?: string | null
  conversations?: any[]
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation?: (id: string) => void
  collapsed?: boolean
  onCollapse?: () => void
}

export function MinimalSidebar({
  currentConversationId,
  conversations = [],
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  collapsed = false,
  onCollapse
}: MinimalSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (conversationToDelete && onDeleteConversation) {
      onDeleteConversation(conversationToDelete)
    }
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  const getConversationTitle = (conversation: any) => {
    const messages = conversation.messages || []
    const firstUserMessage = messages.find((m: any) => m.role === 'user')
    const title = conversation.title || firstUserMessage?.content || '新对话'
    // 移除换行符和多余空格
    return title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`
    } else if (diffInHours < 48) {
      return "昨天"
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    }
  }

  if (collapsed) {
    return (
      <div className="w-full h-full bg-[#202123] text-white flex flex-col items-center py-4 relative">
        {/* 展开按钮 */}
        <button
          onClick={() => onCollapse?.()}
          className="absolute -right-3 top-6 z-10 p-1.5 bg-[#202123] rounded-full shadow-md border border-gray-600 hover:shadow-lg transition-all duration-200"
        >
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        </button>
        
        <Button
          onClick={onNewConversation}
          size="icon"
          variant="ghost"
          className="mb-4 hover:bg-gray-700 transition-all duration-200"
        >
          <Plus className="h-5 w-5 text-white" />
        </Button>
        
        <ScrollArea className="flex-1 w-full">
          <div className="space-y-2 px-2">
            {conversations.slice(0, 10).map((conv) => (
              <Button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                size="icon"
                variant="ghost"
                className={`w-full transition-all duration-200 ${
                  currentConversationId === conv.id 
                    ? 'bg-gray-700 text-white' 
                    : 'hover:bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#202123] text-white flex flex-col relative">
      {/* 折叠按钮 */}
      <button
        onClick={() => onCollapse?.()}
        className="absolute -right-3 top-6 z-10 p-1.5 bg-[#202123] rounded-full shadow-md border border-gray-600 hover:shadow-lg transition-all duration-200"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-gray-300" />
      </button>
      
      {/* 新建对话按钮 */}
      <div className="p-3">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 bg-transparent border border-gray-600 hover:bg-gray-700 text-white transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">新对话</span>
        </Button>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-4">
          {/* 今天 */}
          {conversations.filter(c => {
            const date = new Date(c.updatedAt || c.createdAt)
            const now = new Date()
            return date.toDateString() === now.toDateString()
          }).length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-2">今天</h3>
              {conversations.filter(c => {
                const date = new Date(c.updatedAt || c.createdAt)
                const now = new Date()
                return date.toDateString() === now.toDateString()
              }).map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={currentConversationId === conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  onDelete={() => handleDeleteClick(conversation.id)}
                  onHover={setHoveredId}
                  hoveredId={hoveredId}
                  title={getConversationTitle(conversation)}
                />
              ))}
            </div>
          )}

          {/* 昨天 */}
          {conversations.filter(c => {
            const date = new Date(c.updatedAt || c.createdAt)
            const now = new Date()
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            return date.toDateString() === yesterday.toDateString()
          }).length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-2">昨天</h3>
              {conversations.filter(c => {
                const date = new Date(c.updatedAt || c.createdAt)
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(yesterday.getDate() - 1)
                return date.toDateString() === yesterday.toDateString()
              }).map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={currentConversationId === conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  onDelete={() => handleDeleteClick(conversation.id)}
                  onHover={setHoveredId}
                  hoveredId={hoveredId}
                  title={getConversationTitle(conversation)}
                />
              ))}
            </div>
          )}

          {/* 更早 */}
          {conversations.filter(c => {
            const date = new Date(c.updatedAt || c.createdAt)
            const now = new Date()
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            return date < yesterday
          }).length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2 px-2">更早</h3>
              {conversations.filter(c => {
                const date = new Date(c.updatedAt || c.createdAt)
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(yesterday.getDate() - 1)
                return date < yesterday
              }).map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={currentConversationId === conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  onDelete={() => handleDeleteClick(conversation.id)}
                  onHover={setHoveredId}
                  hoveredId={hoveredId}
                  title={getConversationTitle(conversation)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个对话吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ConversationItemProps {
  conversation: any
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onHover: (id: string | null) => void
  hoveredId: string | null
  title: string
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onHover,
  hoveredId,
  title
}: ConversationItemProps) {
  const isHovered = hoveredId === conversation.id

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'bg-gray-700 text-white' 
          : 'hover:bg-gray-700 text-gray-300 hover:text-white'
      }`}
      onClick={onSelect}
      onMouseEnter={() => onHover(conversation.id)}
      onMouseLeave={() => onHover(null)}
    >
      <MessageSquare className={`h-4 w-4 flex-shrink-0 transition-colors ${
        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
      }`} />
      <div className={`flex-1 min-w-0 pr-8`}>
        <span className={`block text-sm truncate transition-colors`} title={title}>{title}</span>
      </div>
      
      {/* 删除按钮 */}
      <button
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 ${
          isHovered || isActive
            ? 'opacity-100 visible'
            : 'opacity-0 invisible'
        } hover:bg-gray-600`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDelete()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-gray-200 transition-colors" />
      </button>
    </div>
  )
}