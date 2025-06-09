"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Trash2, AlertCircle } from "lucide-react"
import { Footer } from "@/components/footer"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface Note {
  note_id: number
  title: string
  content: string
  category: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  is_deleted?: boolean
  deleted_at?: string
}

interface TrashNote extends Note {
  days_remaining: number
}

export default function TrashPage() {
  const [notes, setNotes] = useState<TrashNote[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNote, setSelectedNote] = useState<TrashNote | null>(null)
  const [actionType, setActionType] = useState<"restore" | "delete" | null>(null)
  const { toast } = useToast()
  const router = useRouter()

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

  // 获取回收站笔记
  const fetchTrashNotes = () => {
    setLoading(true)
    
    setTimeout(() => {
      const allNotes = getLocalNotes()
      const deletedNotes = allNotes.filter(note => note.is_deleted && note.deleted_at)
      
      // 计算剩余天数并过滤超过30天的笔记
      const now = new Date()
      const trashNotes: TrashNote[] = deletedNotes
        .map(note => {
          const deletedDate = new Date(note.deleted_at!)
          const daysSinceDeleted = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
          const daysRemaining = Math.max(0, 30 - daysSinceDeleted)
          
          return {
            ...note,
            days_remaining: daysRemaining
          }
        })
        .filter(note => note.days_remaining > 0)
        .sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime())
      
      setNotes(trashNotes)
      setLoading(false)
    }, 300)
  }

  useEffect(() => {
    fetchTrashNotes()
  }, [])

  // 恢复笔记
  const handleRestore = (noteId: number) => {
    const allNotes = getLocalNotes()
    const updatedNotes = allNotes.map(note => 
      note.note_id === noteId 
        ? { ...note, is_deleted: false, deleted_at: undefined }
        : note
    )
    
    saveLocalNotes(updatedNotes)
    
    toast({
      title: "恢复成功",
      description: "笔记已恢复到笔记列表",
    })
    
    fetchTrashNotes()
    setSelectedNote(null)
    setActionType(null)
  }

  // 永久删除笔记
  const handlePermanentDelete = (noteId: number) => {
    const allNotes = getLocalNotes()
    const updatedNotes = allNotes.filter(note => note.note_id !== noteId)
    
    saveLocalNotes(updatedNotes)
    
    toast({
      title: "删除成功",
      description: "笔记已永久删除",
    })
    
    fetchTrashNotes()
    setSelectedNote(null)
    setActionType(null)
  }

  // 清空过期笔记
  const handleClearTrash = () => {
    const allNotes = getLocalNotes()
    const now = new Date()
    
    const updatedNotes = allNotes.filter(note => {
      if (!note.is_deleted || !note.deleted_at) return true
      
      const deletedDate = new Date(note.deleted_at)
      const daysSinceDeleted = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return daysSinceDeleted < 30
    })
    
    const removedCount = allNotes.length - updatedNotes.length
    saveLocalNotes(updatedNotes)
    
    toast({
      title: "清理成功",
      description: `已清理 ${removedCount} 条过期笔记`,
    })
    
    fetchTrashNotes()
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/notes")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回笔记列表
              </Button>
              <h1 className="text-3xl font-bold gradient-text">回收站</h1>
            </div>
            <Button
              variant="outline"
              onClick={handleClearTrash}
              disabled={notes.length === 0}
            >
              清空过期笔记
            </Button>
          </div>

          <div className="max-w-4xl mx-auto">
            {loading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : notes.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <Trash2 className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-lg mb-2">回收站为空</h3>
                      <p className="text-sm text-muted-foreground">
                        删除的笔记会在这里保留30天
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        回收站中的笔记将在删除后30天自动清除
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {notes.map((note) => (
                  <Card key={note.note_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-lg">{note.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{note.category}</Badge>
                            <span className="text-xs text-gray-500">
                              删除于 {formatDate(note.deleted_at!)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={note.days_remaining <= 7 ? "destructive" : "secondary"}
                        >
                          剩余 {note.days_remaining} 天
                        </Badge>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNote(note)
                            setActionType("restore")
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          恢复
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setSelectedNote(note)
                            setActionType("delete")
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          永久删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      <AlertDialog
        open={selectedNote !== null && actionType !== null}
        onOpenChange={() => {
          setSelectedNote(null)
          setActionType(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "restore" ? "确认恢复" : "确认永久删除"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "restore"
                ? "确定要恢复这条笔记吗？恢复后将重新出现在笔记列表中。"
                : "确定要永久删除这条笔记吗？此操作不可撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedNote && actionType === "restore") {
                  handleRestore(selectedNote.note_id)
                } else if (selectedNote && actionType === "delete") {
                  handlePermanentDelete(selectedNote.note_id)
                }
              }}
              className={actionType === "delete" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}