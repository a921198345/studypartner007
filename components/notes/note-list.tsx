"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Calendar, Edit, Trash2, AlertCircle } from "lucide-react"
import { useToast } from "../ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { Skeleton } from "../ui/skeleton"

interface Note {
  note_id: number
  title: string
  content: string
  preview?: string
  category: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  is_deleted?: boolean
  deleted_at?: string
}

interface NoteListProps {
  searchQuery: string
  selectedCategory: string
  onEditNote: (noteId: number) => void
  onViewNote: (noteId: number) => void
  refreshTrigger?: number
}

export function NoteList({ searchQuery, selectedCategory, onEditNote, onViewNote, refreshTrigger }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null)
  const { toast } = useToast()

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

  // 获取并过滤笔记
  const fetchNotes = () => {
    setLoading(true)
    
    setTimeout(() => {
      let allNotes = getLocalNotes()
      
      // 过滤删除的笔记
      allNotes = allNotes.filter(note => !note.is_deleted)
      
      // 按分类过滤
      if (selectedCategory && selectedCategory !== "全部") {
        allNotes = allNotes.filter(note => note.category === selectedCategory)
      }
      
      // 按搜索关键词过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        allNotes = allNotes.filter(note => 
          note.title.toLowerCase().includes(query) || 
          note.content.toLowerCase().includes(query)
        )
      }
      
      // 排序：置顶的在前，然后按创建时间倒序
      allNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      // 为每个笔记生成预览
      const notesWithPreview = allNotes.map(note => ({
        ...note,
        preview: note.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
      }))
      
      setNotes(notesWithPreview)
      setLoading(false)
    }, 300) // 模拟加载延迟
  }

  useEffect(() => {
    fetchNotes()
  }, [selectedCategory, searchQuery, refreshTrigger])

  // 删除笔记
  const handleDelete = (noteId: number) => {
    const allNotes = getLocalNotes()
    const updatedNotes = allNotes.map(note => 
      note.note_id === noteId 
        ? { ...note, is_deleted: true, deleted_at: new Date().toISOString() }
        : note
    )
    
    saveLocalNotes(updatedNotes)
    
    toast({
      title: "删除成功",
      description: "笔记已移至回收站，30天内可恢复",
    })
    
    fetchNotes()
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
          <Card 
            key={note.note_id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewNote(note.note_id)}
          >
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
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditNote(note.note_id)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteNoteId(note.note_id)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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