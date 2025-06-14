"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
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

interface SidebarSimpleFixedProps {
  currentConversationId?: string | null
  conversations?: any[]
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation?: (id: string) => void
  collapsed?: boolean
  onCollapse?: () => void
}

export function SidebarSimpleFixed({
  currentConversationId,
  conversations = [],
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  collapsed = false,
  onCollapse
}: SidebarSimpleFixedProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

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

  if (collapsed) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col items-center py-3 shadow-sm">
        <button
          onClick={() => onCollapse?.()}
          className="p-2 hover:bg-gray-200 rounded-lg mb-3 transition-colors group"
          title="展开侧边栏"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
        </button>
        
        <Button
          onClick={onNewConversation}
          size="icon"
          variant="ghost"
          className="mb-3 hover:bg-blue-50 relative"
          title="新建对话"
        >
          <Plus className="h-5 w-5 text-blue-600" />
        </Button>
        
        <div className="w-8 h-px bg-gray-300 mb-3" />
        
        <ScrollArea className="flex-1 w-full">
          <div className="space-y-1 px-2">
            {conversations.slice(0, showAll ? undefined : 5).map((conv) => {
              const title = getConversationTitle(conv);
              const isActive = currentConversationId === conv.id;
              return (
                <div key={conv.id} className="relative group">
                  <Button
                    onClick={() => onSelectConversation(conv.id)}
                    size="icon"
                    variant="ghost"
                    className={`w-10 h-10 p-0 ${
                      isActive
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-100' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={title}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  {/* 悜浮提示 */}
                  <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-[200px] truncate">
                      {title}
                    </div>
                  </div>
                </div>
              );
            })}
            {conversations.length > 5 && (
              <Button
                onClick={() => setShowAll(!showAll)}
                size="icon"
                variant="ghost"
                className="w-10 h-10 p-0 mt-2 hover:bg-gray-100"
                title={showAll ? '收起' : `显示更多 (${conversations.length - 5})`}
              >
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${showAll ? 'rotate-180' : ''}`} />
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">法考AI助手</span>
          <button
            onClick={() => onCollapse?.()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="收起侧边栏"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建对话
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {conversations.slice(0, showAll ? undefined : 5).map((conversation) => {
            const title = getConversationTitle(conversation)
            const isActive = currentConversationId === conversation.id
            const isHovered = hoveredId === conversation.id

            return (
              <div
                key={conversation.id}
                className={`relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`} />
                
                <span className={`flex-1 text-sm truncate ${
                  isActive ? 'text-gray-800 font-medium' : 'text-gray-700'
                }`}>
                  {title}
                </span>
                
                {/* 淡化效果 - 只在文字过长时显示 */}
                {title.length > 20 && (
                  <div className="absolute inset-y-0 right-0 w-16 pointer-events-none" 
                       style={{ 
                         background: isActive 
                           ? 'linear-gradient(to left, rgb(239 246 255), rgb(239 246 255 / 0.8), transparent)'
                           : isHovered
                           ? 'linear-gradient(to left, rgb(249 250 251), rgb(249 250 251 / 0.8), transparent)'
                           : 'linear-gradient(to left, rgb(249 250 251), rgb(249 250 251 / 0.8), transparent)'
                       }} 
                  />
                )}
                
                {(isHovered || isActive) && onDeleteConversation && (
                  <button
                    className="absolute right-2 shrink-0 p-1 hover:bg-red-50 rounded transition-colors z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(conversation.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            )
          })}
          {conversations.length > 5 && (
            <Button
              onClick={() => setShowAll(!showAll)}
              size="sm"
              variant="ghost"
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              {showAll ? '收起' : `显示更多 (${conversations.length - 5})`}
            </Button>
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