"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichEditor } from "./rich-editor"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

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

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId?: number | null
  onSave: () => void
}

export function NoteEditorDialog({
  open,
  onOpenChange,
  noteId,
  onSave,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("未分类")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // 预定义的学科分类
  const categories = [
    "未分类",
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

  // 加载笔记详情
  useEffect(() => {
    if (open && noteId) {
      loadNote()
    } else if (open && !noteId) {
      // 新建笔记时重置表单
      setTitle("")
      setContent("")
      setCategory("未分类")
    }
  }, [open, noteId])

  const loadNote = () => {
    if (!noteId) return

    setLoading(true)
    
    setTimeout(() => {
      const notes = getLocalNotes()
      const note = notes.find(n => n.note_id === noteId)
      
      if (note) {
        setTitle(note.title || "")
        setContent(note.content || "")
        setCategory(note.category || "未分类")
      } else {
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "笔记不存在",
        })
      }
      
      setLoading(false)
    }, 300)
  }

  // 保存笔记
  const handleSave = () => {
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "笔记内容不能为空",
      })
      return
    }

    setSaving(true)
    
    setTimeout(() => {
      const notes = getLocalNotes()
      const now = new Date().toISOString()
      
      if (noteId) {
        // 更新现有笔记
        const updatedNotes = notes.map(note => 
          note.note_id === noteId 
            ? {
                ...note,
                title: title.trim() || "无标题笔记",
                content,
                category,
                updated_at: now,
              }
            : note
        )
        saveLocalNotes(updatedNotes)
        
        toast({
          title: "更新成功",
          description: "笔记已更新",
        })
      } else {
        // 创建新笔记
        const newNote: Note = {
          note_id: generateNoteId(),
          title: title.trim() || "无标题笔记",
          content,
          category,
          is_pinned: false,
          created_at: now,
          updated_at: now,
          is_deleted: false,
        }
        
        notes.push(newNote)
        saveLocalNotes(notes)
        
        toast({
          title: "创建成功",
          description: "笔记已创建",
        })
      }
      
      setSaving(false)
      onOpenChange(false)
      onSave()
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{noteId ? "编辑笔记" : "新建笔记"}</DialogTitle>
          <DialogDescription>
            {noteId ? "修改您的学习笔记" : "创建一条新的学习笔记"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  placeholder="输入笔记标题（选填）"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <RichEditor
                value={content}
                onChange={setContent}
                placeholder="开始编写您的笔记..."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}