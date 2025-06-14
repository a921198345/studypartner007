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

export function SaveNoteButton({ question, answer, chatId }: SaveNoteButtonProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("AI问答")
  const { toast } = useToast()

  // 预定义的学科分类
  const categories = [
    "AI问答",
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

  const handleSave = () => {
    setSaving(true)
    
    setTimeout(() => {
      try {
        const notes = getLocalNotes()
        const now = new Date().toISOString()
        
        // 构建笔记内容（HTML格式）
        const noteContent = `
          <div class="ai-note">
            <div class="question">
              <h3>问题：</h3>
              <p>${question}</p>
            </div>
            <hr />
            <div class="answer">
              <h3>AI回答：</h3>
              <div>${answer}</div>
            </div>
            <hr />
            <div class="note-meta">
              <small>保存自AI问答 - ${new Date().toLocaleString('zh-CN')}</small>
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
          description: "AI回答已保存为笔记",
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