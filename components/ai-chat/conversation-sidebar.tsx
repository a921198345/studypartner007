"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { PlusCircle, MessageCircle, Trash2, Clock } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
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

interface ConversationSidebarProps {
  currentConversationId?: string | null
  conversations?: any[]
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation?: (id: string) => void
}

export function ConversationSidebar({
  currentConversationId,
  conversations = [],
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
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
  
  // 获取对话的最后一条消息和消息数量
  const getConversationInfo = (conversation: any) => {
    const messages = conversation.messages || []
    const lastMessage = messages[messages.length - 1]
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
    
    return {
      lastMessage: lastUserMessage?.content || lastMessage?.content || '新对话',
      messageCount: messages.length,
      timestamp: conversation.updatedAt || conversation.createdAt
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`
    } else if (diffInHours < 48) {
      return "昨天"
    } else if (diffInHours < 168) { // 7天内
      return format(date, "EEEE", { locale: zhCN })
    } else {
      return format(date, "MM月dd日", { locale: zhCN })
    }
  }

  return (
    <Card className="h-full flex flex-col bg-gray-50/50 border-r">
      <div className="p-4 border-b bg-white">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <PlusCircle className="h-4 w-4" />
          新建对话
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            历史对话
          </h3>
          
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无历史对话</p>
              <p className="text-xs mt-1">开始新的对话吧</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const info = getConversationInfo(conversation)
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-all
                    hover:bg-gray-100 
                    ${currentConversationId === conversation.id 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'hover:border-l-4 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate pr-2">
                        {conversation.title}
                      </h4>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {info.lastMessage}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {info.messageCount}
                        </span>
                        <span>{formatTimestamp(info.timestamp)}</span>
                      </div>
                    </div>
                  
                    {onDeleteConversation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteClick(e, conversation.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除对话</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该对话及其所有消息记录，且无法恢复。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}