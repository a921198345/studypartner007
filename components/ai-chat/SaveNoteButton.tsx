"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BookmarkPlus, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SaveNoteButtonProps {
  question: string
  answer: string
  chatId?: string
  defaultCategory?: string
  preserveHtml?: boolean
}

interface Note {
  note_id: number
  title: string
  content: string
  category: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  is_deleted?: boolean
}

export function SaveNoteButton({ question, answer, chatId, defaultCategory = "AI问答", preserveHtml = false }: SaveNoteButtonProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(defaultCategory)
  const { toast } = useToast()

  // 预定义的学科分类
  const categories = [
    "AI问答",
    "知识点详解",
    "民法",
    "刑法",
    "行政法",
    "诉讼法",
    "商法",
    "经济法",
    "理论法学",
    "其他",
  ]

  // 从本地存储获取笔记
  const getLocalNotes = (): Note[] => {
    if (typeof window === 'undefined') return []
    const notesJson = localStorage.getItem('law-exam-notes')
    return notesJson ? JSON.parse(notesJson) : []
  }

  // 保存笔记到本地存储
  const saveLocalNotes = (notes: Note[]) => {
    localStorage.setItem('law-exam-notes', JSON.stringify(notes))
  }

  // 生成新的笔记ID
  const generateNoteId = (): number => {
    const notes = getLocalNotes()
    if (notes.length === 0) return 1
    const maxId = Math.max(...notes.map(note => note.note_id))
    return maxId + 1
  }

  // 简单的Markdown转HTML转换器
  const markdownToHtml = (markdown: string): string => {
    if (!preserveHtml) {
      // 如果不需要保持HTML格式，直接返回纯文本并去除HTML标签
      return markdown.replace(/<[^>]*>/g, '').replace(/\n/g, '<br>')
    }

    let html = markdown

    try {
      // 转换标题
      html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.1em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; color: #333;">$1</h3>')
      html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3em; font-weight: bold; margin-top: 1.2em; margin-bottom: 0.6em; color: #333;">$1</h2>')
      html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5em; font-weight: bold; margin-top: 1.2em; margin-bottom: 0.6em; color: #333;">$1</h1>')

      // 转换粗体和斜体
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
      html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')

      // 转换行内代码
      html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; font-family: monospace;">$1</code>')

      // 转换列表项（简单处理）
      html = html.replace(/^[\s]*[-*+]\s+(.*)$/gim, '<li style="margin-bottom: 0.3em; list-style-type: disc;">$1</li>')
      
      // 包装连续的列表项
      html = html.replace(/(<li[^>]*>.*?<\/li>)(\n<li[^>]*>.*?<\/li>)*/gs, (match) => {
        return '<ul style="list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.8em;">' + match.replace(/\n/g, '') + '</ul>'
      })

      // 转换数字列表
      html = html.replace(/^[\s]*\d+\.\s+(.*)$/gim, '<li style="margin-bottom: 0.3em; list-style-type: decimal;">$1</li>')
      
      // 包装连续的数字列表项
      html = html.replace(/(<li[^>]*style="[^"]*list-style-type: decimal[^"]*"[^>]*>.*?<\/li>)(\n<li[^>]*style="[^"]*list-style-type: decimal[^"]*"[^>]*>.*?<\/li>)*/gs, (match) => {
        return '<ol style="list-style-type: decimal; padding-left: 1.5em; margin-bottom: 0.8em;">' + match.replace(/\n/g, '') + '</ol>'
      })

      // 转换引用块
      html = html.replace(/^>\s+(.*)$/gim, '<blockquote style="border-left: 4px solid #ddd; padding-left: 1em; margin: 1em 0; color: #666; font-style: italic;">$1</blockquote>')

      // 转换段落（将双换行符转换为段落）
      html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 0.8em; line-height: 1.6;">')
      html = '<p style="margin-bottom: 0.8em; line-height: 1.6;">' + html + '</p>'

      // 转换单个换行符为<br>
      html = html.replace(/(?<!<\/p>)\n(?!<p)/g, '<br>')

      // 清理空段落
      html = html.replace(/<p[^>]*><\/p>/g, '')

      return html
    } catch (error) {
      console.error('Markdown转HTML失败:', error)
      // 转换失败时，返回原始内容并转换换行符
      return markdown.replace(/\n/g, '<br>')
    }
  }

  const handleSave = () => {
    setSaving(true)
    
    setTimeout(() => {
      try {
        const notes = getLocalNotes()
        const now = new Date().toISOString()
        
        // 处理回答内容 - 转换Markdown为HTML
        const processedAnswer = markdownToHtml(answer)
        
        // 构建笔记内容
        const noteContent = `
          <div class="ai-note" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
            <div class="question" style="margin-bottom: 1em;">
              <h3 style="font-size: 1.1em; font-weight: bold; margin-bottom: 0.5em; color: #333;">问题：</h3>
              <p style="margin-bottom: 0.8em; background-color: #f8f9fa; padding: 0.8em; border-radius: 5px; border-left: 4px solid #007acc;">${question}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 1.5em 0;" />
            <div class="answer" style="margin-bottom: 1em;">
              <h3 style="font-size: 1.1em; font-weight: bold; margin-bottom: 0.5em; color: #333;">${category === "知识点详解" ? "知识点详解：" : "AI回答："}</h3>
              <div style="color: #444;">${processedAnswer}</div>
            </div>
            <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 1.5em 0;" />
            <div class="note-meta" style="text-align: right; color: #666; font-size: 0.9em;">
              <small>保存自${category} - ${new Date().toLocaleString('zh-CN')}</small>
            </div>
          </div>
        `
        
        // 创建新笔记
        const newNote: Note = {
          note_id: generateNoteId(),
          title: title || question.substring(0, 50) + (question.length > 50 ? '...' : ''),
          content: noteContent,
          category,
          is_pinned: false,
          created_at: now,
          updated_at: now,
          is_deleted: false,
        }
        
        notes.push(newNote)
        saveLocalNotes(notes)
        
        toast({
          title: "保存成功",
          description: `${category === "知识点详解" ? "知识点详解" : "AI回答"}已保存为笔记`,
        })
        
        setOpen(false)
        setTitle("")
      } catch (error) {
        toast({
          variant: "destructive",
          title: "保存失败",
          description: "保存笔记时出错",
        })
      } finally {
        setSaving(false)
      }
    }, 500)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
      >
        <BookmarkPlus className="h-3 w-3 mr-1" />
        保存为笔记
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为笔记</DialogTitle>
            <DialogDescription>
              将这条AI回答保存到您的学习笔记中
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题（选填）</Label>
              <Input
                id="title"
                placeholder={question.substring(0, 50)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-muted-foreground">
                <strong>问题：</strong> {question}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}