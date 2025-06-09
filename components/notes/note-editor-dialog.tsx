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
import { SimpleEditor } from "./simple-editor"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

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

  const loadNote = async () => {
    if (!noteId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/notes/${noteId}`)
      const data = await response.json()

      if (data.success) {
        setTitle(data.data.title || "")
        setContent(data.data.content || "")
        setCategory(data.data.category || "未分类")
      } else {
        toast({
          variant: "destructive",
          title: "加载失败",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "加载失败",
        description: "网络错误，请稍后重试",
      })
    } finally {
      setLoading(false)
    }
  }

  // 保存笔记
  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "笔记内容不能为空",
      })
      return
    }

    setSaving(true)
    try {
      const url = noteId ? `/api/notes/${noteId}` : "/api/notes"
      const method = noteId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim() || "无标题笔记",
          content,
          category,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: noteId ? "更新成功" : "创建成功",
          description: noteId ? "笔记已更新" : "笔记已创建",
        })
        onOpenChange(false)
        onSave()
      } else {
        toast({
          variant: "destructive",
          title: "保存失败",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "网络错误，请稍后重试",
      })
    } finally {
      setSaving(false)
    }
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
              <SimpleEditor
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