"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Code,
  Minus,
} from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder || '开始编写您的笔记...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  if (!editor) {
    return null
  }

  // 工具栏按钮组件
  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false, 
    children 
  }: { 
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode 
  }) => (
    <Button
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
      type="button"
    >
      {children}
    </Button>
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="border-b bg-gray-50 p-2">
        <div className="flex items-center flex-wrap gap-1">
          {/* 文本样式 */}
          <ToggleGroup type="multiple" className="justify-start">
            <ToggleGroupItem
              value="bold"
              aria-label="加粗"
              data-active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="italic"
              aria-label="斜体"
              data-active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="underline"
              aria-label="下划线"
              data-active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="code"
              aria-label="代码"
              data-active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="w-px h-6 bg-gray-300" />

          {/* 标题 */}
          <Select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              'p'
            }
            onValueChange={(value) => {
              switch (value) {
                case 'p':
                  editor.chain().focus().setParagraph().run()
                  break
                case 'h1':
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                  break
                case 'h2':
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                  break
                case 'h3':
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                  break
              }
            }}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">正文</SelectItem>
              <SelectItem value="h1">标题 1</SelectItem>
              <SelectItem value="h2">标题 2</SelectItem>
              <SelectItem value="h3">标题 3</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-gray-300" />

          {/* 列表 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300" />

          {/* 引用和分隔线 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300" />

          {/* 撤销/重做 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>

          {/* 颜色选择器 */}
          <div className="w-px h-6 bg-gray-300 ml-1" />
          <div className="flex items-center space-x-1 ml-1">
            <span className="text-xs text-gray-500">文字颜色:</span>
            <input
              type="color"
              value={editor.getAttributes('textStyle').color || '#000000'}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="w-8 h-8 border rounded cursor-pointer"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="h-8 px-2 text-xs"
              type="button"
            >
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑器内容 */}
      <EditorContent editor={editor} />

      {/* 样式 */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9CA3AF;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #E5E7EB;
          padding-left: 1rem;
          margin-left: 0;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: #6B7280;
        }
        
        .ProseMirror code {
          background-color: #F3F4F6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .ProseMirror pre {
          background-color: #F3F4F6;
          padding: 0.75rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #E5E7EB;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        
        [data-active="true"] {
          background-color: rgb(59 130 246 / 0.1);
          color: rgb(59 130 246);
        }
      `}</style>
    </div>
  )
}