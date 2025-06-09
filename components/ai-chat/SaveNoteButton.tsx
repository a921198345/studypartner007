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

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/notes/save-from-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          answer,
          chatId,
          category,
          title: title || question.substring(0, 50),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "保存成功",
          description: "AI回答已保存为笔记",
        })
        setOpen(false)
        setTitle("")
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
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
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