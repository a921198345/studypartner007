"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Calendar, Edit, Printer, Share2 } from "lucide-react"
import { useToast } from "../ui/use-toast"
import { Skeleton } from "../ui/skeleton"

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

interface NoteViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: number | null
  onEdit: (noteId: number) => void
}

export function NoteViewerDialog({
  open,
  onOpenChange,
  noteId,
  onEdit,
}: NoteViewerDialogProps) {
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 从本地存储获取笔记
  const getLocalNotes = (): Note[] => {
    if (typeof window === 'undefined') return []
    const notesJson = localStorage.getItem('law-exam-notes')
    return notesJson ? JSON.parse(notesJson) : []
  }

  // 加载笔记详情
  useEffect(() => {
    if (open && noteId) {
      loadNote()
    }
  }, [open, noteId])

  const loadNote = () => {
    if (!noteId) return

    setLoading(true)
    
    setTimeout(() => {
      const notes = getLocalNotes()
      const foundNote = notes.find(n => n.note_id === noteId)
      
      if (foundNote) {
        setNote(foundNote)
      } else {
        toast({
          variant: "destructive",
          title: "加载失败",
          description: "笔记不存在",
        })
        onOpenChange(false)
      }
      
      setLoading(false)
    }, 300)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 打印笔记
  const handlePrint = () => {
    if (!note) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${note.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
            .content { font-size: 16px; }
            h1, h2, h3 { margin-top: 20px; margin-bottom: 10px; }
            ul, ol { padding-left: 30px; }
            blockquote { 
              border-left: 4px solid #ddd; 
              padding-left: 16px; 
              margin-left: 0;
              color: #666;
            }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
            hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${note.title}</h1>
          <div class="meta">
            分类：${note.category} | 
            创建时间：${formatDate(note.created_at)}
            ${note.updated_at !== note.created_at ? ` | 更新时间：${formatDate(note.updated_at)}` : ''}
          </div>
          <div class="content">
            ${note.content}
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.print()
  }

  // 分享笔记
  const handleShare = async () => {
    if (!note) return
    
    const shareText = `${note.title}\n\n${note.content.replace(/<[^>]*>/g, '')}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: shareText,
        })
      } catch (error) {
        // 用户取消分享
      }
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(shareText)
      toast({
        title: "已复制到剪贴板",
        description: "笔记内容已复制，您可以粘贴分享",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : note ? (
          <>
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">{note.title}</DialogTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="outline">{note.category}</Badge>
                    {note.is_pinned && <Badge variant="secondary">置顶</Badge>}
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>创建于 {formatDate(note.created_at)}</span>
                    </div>
                    {note.updated_at !== note.created_at && (
                      <span>更新于 {formatDate(note.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-6">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    打印
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    分享
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    关闭
                  </Button>
                  <Button onClick={() => {
                    onEdit(note.note_id)
                    onOpenChange(false)
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            笔记不存在
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}