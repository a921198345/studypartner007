"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Palette,
} from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SimpleEditor({ value, onChange, placeholder }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState("#000000")

  // 执行格式化命令
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  // 插入列表
  const insertList = (ordered: boolean) => {
    const listType = ordered ? "insertOrderedList" : "insertUnorderedList"
    execCommand(listType)
  }

  // 插入引用
  const insertQuote = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const blockquote = document.createElement("blockquote")
      blockquote.style.borderLeft = "4px solid #ddd"
      blockquote.style.paddingLeft = "16px"
      blockquote.style.marginLeft = "0"
      blockquote.style.color = "#666"
      
      if (range.toString()) {
        blockquote.textContent = range.toString()
        range.deleteContents()
        range.insertNode(blockquote)
      } else {
        blockquote.innerHTML = "<br>"
        range.insertNode(blockquote)
      }
      
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  // 设置文字颜色
  const setTextColor = (color: string) => {
    execCommand("foreColor", color)
    setSelectedColor(color)
    setShowColorPicker(false)
  }

  // 预定义颜色
  const colors = [
    "#000000", "#666666", "#999999", "#cccccc",
    "#ff0000", "#ff6600", "#ffcc00", "#33cc00",
    "#0099ff", "#0066cc", "#6633cc", "#cc00cc",
  ]

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="border-b bg-gray-50 p-2">
        <div className="flex items-center space-x-1">
          <ToggleGroup type="multiple" className="justify-start">
            <ToggleGroupItem
              value="bold"
              aria-label="加粗"
              onClick={() => execCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="italic"
              aria-label="斜体"
              onClick={() => execCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="underline"
              aria-label="下划线"
              onClick={() => execCommand("underline")}
            >
              <Underline className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertList(false)}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertList(true)}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={insertQuote}
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Palette className="h-4 w-4" />
                <div
                  className="w-4 h-4 ml-1 border rounded"
                  style={{ backgroundColor: selectedColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-10 h-10 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand("undo")}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execCommand("redo")}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div
        ref={editorRef}
        className="min-h-[300px] p-4 focus:outline-none relative"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #999;
          position: absolute;
          pointer-events: none;
        }
      `}} />
    </div>
  )
}