"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SidebarFixedProps {
  currentConversationId?: string | null
  conversations?: any[]
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation?: (id: string) => void
  collapsed?: boolean
  onCollapse?: () => void
}

export function SidebarFixed({
  currentConversationId,
  conversations = [],
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  collapsed = false,
  onCollapse
}: SidebarFixedProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

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
    return title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // 折叠状态
  if (collapsed) {
    return (
      <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 relative">
        <button
          onClick={() => onCollapse?.()}
          className="absolute -right-3 top-6 z-10 p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200"
        >
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
        </button>
        
        <Button
          onClick={onNewConversation}
          size="icon"
          variant="ghost"
          className="mb-4 hover:bg-white hover:shadow-md transition-all duration-200"
        >
          <Plus className="h-5 w-5 text-blue-600" />
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
                    ? 'bg-blue-100 text-blue-600 shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm text-gray-600'
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

  // 展开状态
  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col relative">
      {/* 折叠按钮 */}
      <button
        onClick={() => onCollapse?.()}
        className="absolute -right-3 top-6 z-10 p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
      </button>
      
      {/* 新建对话按钮 */}
      <div className="p-4">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">新对话</span>
        </Button>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-1">
          {conversations.map((conversation) => {
            const title = getConversationTitle(conversation)
            const isActive = currentConversationId === conversation.id
            const isHovered = hoveredId === conversation.id

            return (
              <div
                key={conversation.id}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`} />
                
                {/* 标题容器 - 关键是这里要正确设置 */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm truncate" title={title}>
                    {title}
                  </p>
                </div>
                
                {/* 删除按钮 - 条件渲染 */}
                {(isHovered || isActive) && onDeleteConversation && (
                  <button
                    className="p-1 hover:bg-gray-200 rounded ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(conversation.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
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