"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Edit, Trash2, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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
import { Skeleton } from "@/components/ui/skeleton"

interface Note {
  note_id: number
  title: string
  preview: string
  category: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface NoteListProps {
  searchQuery: string
  selectedCategory: string
  onEditNote: (noteId: number) => void
  refreshTrigger?: number
}

export function NoteList({ searchQuery, selectedCategory, onEditNote, refreshTrigger }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  // 获取笔记列表
  const fetchNotes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      })
      
      if (selectedCategory && selectedCategory !== "全部") {
        params.append("category", selectedCategory)
      }
      
      if (searchQuery) {
        params.append("keyword", searchQuery)
      }

      const response = await fetch(`/api/notes?${params}`)
      const data = await response.json()

      if (data.success) {
        setNotes(data.data.notes)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        toast({
          variant: "destructive",
          title: "获取笔记失败",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "获取笔记失败",
        description: "网络错误，请稍后重试",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [currentPage, selectedCategory, searchQuery, refreshTrigger])

  // 删除笔记
  const handleDelete = async (noteId: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "删除成功",
          description: "笔记已移至回收站，30天内可恢复",
        })
        fetchNotes()
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: data.message,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "网络错误，请稍后重试",
      })
    }
    setDeleteNoteId(null)
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/4 mb-3" />
              <Skeleton className="h-16 w-full mb-3" />
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <Card className="border-dashed border-2 p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-medium text-lg mb-2">暂无笔记</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "没有找到相关笔记" : '点击"新建笔记"开始创建您的第一条笔记'}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.note_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-lg">{note.title}</h3>
                <div className="flex items-center space-x-2">
                  {note.is_pinned && (
                    <Badge variant="secondary">置顶</Badge>
                  )}
                  <Badge variant="outline">{note.category}</Badge>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-500 mb-3">
                <Calendar className="h-3 w-3 mr-1" />
                <span>创建于 {formatDate(note.created_at)}</span>
                {note.updated_at !== note.created_at && (
                  <>
                    <span className="mx-2">•</span>
                    <span>更新于 {formatDate(note.updated_at)}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-3 mb-3">{note.preview}</p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditNote(note.note_id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setDeleteNoteId(note.note_id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            上一页
          </Button>
          <span className="flex items-center px-3 text-sm">
            第 {currentPage} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      <AlertDialog open={deleteNoteId !== null} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              笔记将被移至回收站，30天内可以恢复。是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && handleDelete(deleteNoteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}