"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

interface SimpleSidebarProps {
  currentConversationId?: string | null
  conversations?: any[]
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation?: (id: string) => void
  collapsed?: boolean
  onCollapse?: () => void
}

export function SimpleSidebar({
  currentConversationId,
  conversations = [],
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  collapsed = false,
  onCollapse
}: SimpleSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // 获取对话标题
  const getTitle = (conversation: any) => {
    const messages = conversation.messages || []
    const firstUserMessage = messages.find((m: any) => m.role === 'user')
    return conversation.title || firstUserMessage?.content || '新对话'
  }

  // 折叠状态
  if (collapsed) {
    return (
      <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={() => onCollapse?.()}
          className="p-1.5 hover:bg-gray-200 rounded-md mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        
        <Button
          onClick={onNewConversation}
          size="icon"
          variant="ghost"
          className="mb-4"
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        <ScrollArea className="flex-1 w-full">
          <div className="space-y-1 px-2">
            {conversations.map((conv) => (
              <Button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                size="icon"
                variant="ghost"
                className={currentConversationId === conv.id ? 'bg-gray-200' : ''}
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
    <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* 顶部操作区 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">对话历史</h2>
          <button
            onClick={() => onCollapse?.()}
            className="p-1 hover:bg-gray-200 rounded-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <Button
          onClick={onNewConversation}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.map((conversation) => {
            const title = getTitle(conversation)
            const isActive = currentConversationId === conversation.id
            const isHovered = hoveredId === conversation.id

            return (
              <div
                key={conversation.id}
                className={`
                  relative flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-pointer
                  ${isActive ? 'bg-blue-100' : 'hover:bg-gray-100'}
                `}
                onClick={() => onSelectConversation(conversation.id)}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-gray-500" />
                
                {/* 标题容器 - 关键是这里 */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm truncate" title={title}>
                    {title}
                  </p>
                </div>
                
                {/* 删除按钮 - 简单的显示/隐藏 */}
                {(isHovered || isActive) && onDeleteConversation && (
                  <button
                    className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteConversation(conversation.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}