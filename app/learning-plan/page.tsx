"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, BookOpen, Plus, Edit2, Trash2, Check } from "lucide-react"
import { Footer } from "@/components/footer"
import { useToast } from "@/components/ui/use-toast"
import { useFirstUseAuth } from '@/components/auth/first-use-auth-guard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Note {
  id: string
  content: string
  completed: boolean
  createdAt: string
  planType: "daily" | "weekly" | "overall"
}

export default function LearningPlanPage() {
  const { checkAuthOnAction } = useFirstUseAuth('learning-plan')
  const [notes, setNotes] = useState<Note[]>([])
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "overall">("daily")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const { toast } = useToast()

  // 加载保存的笔记
  useEffect(() => {
    const savedNotes = localStorage.getItem('simple-study-notes')
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes))
      } catch (error) {
        console.error('加载笔记失败:', error)
      }
    }
  }, [])

  // 保存笔记到本地存储
  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes)
    localStorage.setItem('simple-study-notes', JSON.stringify(newNotes))
  }

  // 添加新笔记
  const handleAddNote = () => {
    checkAuthOnAction()
    setEditingNote(null)
    setNoteContent("")
    setShowEditDialog(true)
  }

  // 编辑笔记
  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteContent(note.content)
    setShowEditDialog(true)
  }

  // 保存笔记
  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({
        variant: "destructive",
        title: "内容不能为空",
        description: "请输入笔记内容"
      })
      return
    }

    if (editingNote) {
      // 更新现有笔记
      const updatedNotes = notes.map(note =>
        note.id === editingNote.id
          ? { ...note, content: noteContent.trim() }
          : note
      )
      saveNotes(updatedNotes)
      toast({
        title: "笔记更新成功",
        description: "您的学习笔记已保存"
      })
    } else {
      // 添加新笔记
      const newNote: Note = {
        id: Date.now().toString(),
        content: noteContent.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        planType: activeTab
      }
      saveNotes([...notes, newNote])
      toast({
        title: "笔记添加成功",
        description: "新的学习笔记已创建"
      })
    }
    
    setShowEditDialog(false)
    setEditingNote(null)
    setNoteContent("")
  }

  // 删除笔记
  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId)
    saveNotes(updatedNotes)
    toast({
      title: "笔记删除成功",
      description: "学习笔记已从计划中移除"
    })
  }

  // 切换笔记完成状态
  const handleToggleComplete = (noteId: string) => {
    const updatedNotes = notes.map(note =>
      note.id === noteId ? { ...note, completed: !note.completed } : note
    )
    saveNotes(updatedNotes)
  }

  // 获取当前标签页的笔记
  const getCurrentNotes = () => {
    return notes.filter(note => note.planType === activeTab)
  }

  const currentNotes = getCurrentNotes()

  // 获取标签页主题色
  const getTabTheme = (tab: string) => {
    switch (tab) {
      case 'daily':
        return {
          bg: 'border-green-200 bg-green-50/30',
          icon: 'text-green-600',
          name: '日计划'
        }
      case 'weekly':
        return {
          bg: 'border-purple-200 bg-purple-50/30',
          icon: 'text-purple-600',
          name: '周计划'
        }
      case 'overall':
        return {
          bg: 'border-blue-200 bg-blue-50/30',
          icon: 'text-blue-600',
          name: '总体规划'
        }
      default:
        return {
          bg: 'border-gray-200 bg-gray-50/30',
          icon: 'text-gray-600',
          name: '计划'
        }
    }
  }

  const theme = getTabTheme(activeTab)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* 计划类型选择 */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  日计划
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  周计划
                </TabsTrigger>
                <TabsTrigger value="overall" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  总体规划
                </TabsTrigger>
              </TabsList>


              {/* 计划内容区域 */}
              <TabsContent value="daily" className="space-y-4">
                <Card className={theme.bg}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className={`h-5 w-5 ${theme.icon}`} />
                        {theme.name}
                      </CardTitle>
                      <Button onClick={handleAddNote} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加笔记
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无学习笔记</p>
                        <p className="text-sm">点击上方按钮添加您的第一条笔记</p>
                      </div>
                    ) : (
                      currentNotes.map((note) => (
                        <Card key={note.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={note.completed}
                                  onChange={() => handleToggleComplete(note.id)}
                                  className="mt-1 rounded"
                                />
                                <div className="flex-1">
                                  <p className={`whitespace-pre-wrap ${note.completed ? 'line-through text-gray-500' : ''}`}>
                                    {note.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    创建于 {new Date(note.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNote(note)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weekly" className="space-y-4">
                <Card className={theme.bg}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${theme.icon}`} />
                        {theme.name}
                      </CardTitle>
                      <Button onClick={handleAddNote} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加笔记
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无学习笔记</p>
                        <p className="text-sm">点击上方按钮添加您的第一条笔记</p>
                      </div>
                    ) : (
                      currentNotes.map((note) => (
                        <Card key={note.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={note.completed}
                                  onChange={() => handleToggleComplete(note.id)}
                                  className="mt-1 rounded"
                                />
                                <div className="flex-1">
                                  <p className={`whitespace-pre-wrap ${note.completed ? 'line-through text-gray-500' : ''}`}>
                                    {note.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    创建于 {new Date(note.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNote(note)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="overall" className="space-y-4">
                <Card className={theme.bg}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className={`h-5 w-5 ${theme.icon}`} />
                        {theme.name}
                      </CardTitle>
                      <Button onClick={handleAddNote} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        添加笔记
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无学习笔记</p>
                        <p className="text-sm">点击上方按钮添加您的第一条笔记</p>
                      </div>
                    ) : (
                      currentNotes.map((note) => (
                        <Card key={note.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={note.completed}
                                  onChange={() => handleToggleComplete(note.id)}
                                  className="mt-1 rounded"
                                />
                                <div className="flex-1">
                                  <p className={`whitespace-pre-wrap ${note.completed ? 'line-through text-gray-500' : ''}`}>
                                    {note.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    创建于 {new Date(note.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNote(note)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* 编辑笔记对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "编辑学习笔记" : "添加学习笔记"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">笔记内容</label>
              <Textarea
                placeholder="在这里输入您的学习笔记..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={8}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveNote}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}