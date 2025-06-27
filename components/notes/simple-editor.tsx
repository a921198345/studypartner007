"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
} from "lucide-react"

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SimpleEditor({ value, onChange, placeholder }: SimpleEditorProps) {
  const [isRichText, setIsRichText] = useState(false)

  // 暂时使用纯文本编辑器，避免contentEditable的问题
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 工具栏 - 暂时禁用 */}
      <div className="border-b bg-gray-50 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 opacity-50">
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              <Quote className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">富文本功能暂时禁用</span>
        </div>
      </div>

      {/* 使用标准的 Textarea 组件 */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "开始编写您的笔记..."}
        className="min-h-[300px] border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ fontSize: '16px', lineHeight: '1.6' }}
      />
    </div>
  )
}