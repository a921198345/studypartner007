"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bold, Italic, Underline, ImageIcon, Save, ArrowLeft, Loader2 } from "lucide-react"

interface NoteEditorProps {
  initialNote?: {
    id?: string
    title: string
    content: string
    subject?: string
    lastModified?: Date
  }
  onSave: (note: { title: string; content: string; subject?: string }) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function NoteEditor({
  initialNote = { title: "", content: "", subject: "" },
  onSave,
  onCancel,
  isLoading = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialNote.title)
  const [content, setContent] = useState(initialNote.content)
  const [subject, setSubject] = useState(initialNote.subject || "")
  const [isSaving, setIsSaving] = useState(false)
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // 模拟自动保存
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (title || content) {
        // 实际项目中应该调用API进行自动保存
        console.log("Auto saving:", { title, content, subject })
        setLastAutoSave(new Date())
      }
    }, 30000) // 每30秒自动保存一次

    return () => clearInterval(autoSaveInterval)
  }, [title, content, subject])

  // 学科列表
  const subjects = [
    { id: "civil", name: "民法" },
    { id: "criminal", name: "刑法" },
    { id: "civilProcedure", name: "民事诉讼法" },
    { id: "criminalProcedure", name: "刑事诉讼法" },
    { id: "commercial", name: "商法与经济法" },
    { id: "theory", name: "理论法学" },
    { id: "administrative", name: "行政法与行政诉讼法" },
    { id: "international", name: "三国法" },
  ]

  // 处理富文本编辑命令
  const execCommand = (command: string, value = "") => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  // 处理图片上传
  const handleImageUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // 检查文件大小
        if (file.size > 5 * 1024 * 1024) {
          alert("图片大小不能超过5MB")
          return
        }

        const reader = new FileReader()
        reader.onload = () => {
          execCommand("insertImage", reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  // 处理保存
  const handleSave = () => {
    if (!title.trim()) {
      alert("请输入笔记标题")
      return
    }

    setIsSaving(true)

    // 模拟API调用延迟
    setTimeout(() => {
      onSave({ title, content, subject })
      setIsSaving(false)
    }, 1000)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">{initialNote.id ? "编辑笔记" : "新建笔记"}</CardTitle>
          {lastAutoSave && (
            <span className="text-xs text-gray-500">上次自动保存: {lastAutoSave.toLocaleTimeString()}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-title">标题</Label>
          <Input
            id="note-title"
            placeholder="笔记标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-subject">所属学科</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger id="note-subject">
              <SelectValue placeholder="选择学科" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分类</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>内容</Label>
            <div className="flex space-x-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")}>
                <Italic className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("underline")}>
                <Underline className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleImageUpload}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            ref={editorRef}
            className="min-h-[300px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            contentEditable
            dangerouslySetInnerHTML={{ __html: content }}
            onInput={(e) => setContent(e.currentTarget.innerHTML)}
            onBlur={(e) => setContent(e.currentTarget.innerHTML)}
          />
          <div className="text-xs text-gray-500 flex justify-end">
            {content.length > 0 ? `${content.length} 字符` : ""}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <Button onClick={handleSave} disabled={isLoading || isSaving}>
          {isLoading || isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存笔记
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
