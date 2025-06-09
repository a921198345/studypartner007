"use client"

import { useState, useEffect } from "react"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Plus, Lock, Trash } from "lucide-react"
import { Footer } from "@/components/footer"
import { NoteList } from "@/components/notes/note-list"
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("全部")
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
  const [totalNotes, setTotalNotes] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const router = useRouter()

  // 检查登录状态
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/notes/categories")
      const data = await response.json()

      if (data.success) {
        setCategories(data.data.categories)
        setTotalNotes(data.data.total)
      }
    } catch (error) {
      console.error("获取分类失败:", error)
    }
  }

  useEffect(() => {
    if (session) {
      fetchCategories()
    }
  }, [session, refreshTrigger])

  // 打开编辑器
  const openEditor = (noteId?: number) => {
    setEditingNoteId(noteId || null)
    setEditorOpen(true)
  }

  // 保存后刷新
  const handleSave = () => {
    setRefreshTrigger(prev => prev + 1)
    fetchCategories()
  }

  // 过滤显示的分类
  const displayCategories = [
    { category: "全部", count: totalNotes },
    ...categories.filter(cat => cat.count > 0),
  ]

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold gradient-text">学习笔记</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索笔记..."
                  className="w-[200px] pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => openEditor()}>
                <Plus className="h-4 w-4 mr-2" />
                新建笔记
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">学科筛选</h3>
                    <div className="space-y-2">
                      {displayCategories.map((cat) => (
                        <label
                          key={cat.category}
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <span className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="category"
                              className="text-primary"
                              checked={selectedCategory === cat.category}
                              onChange={() => setSelectedCategory(cat.category)}
                            />
                            <span className="text-sm">{cat.category}</span>
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {cat.count}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    笔记统计
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-primary">{totalNotes}</div>
                        <div className="text-xs text-gray-500">笔记总数</div>
                      </div>
                      {categories
                        .filter(cat => cat.count > 0)
                        .slice(0, 3)
                        .map((cat) => (
                          <div key={cat.category} className="bg-gray-50 p-2 rounded text-center">
                            <div className="text-lg font-semibold text-primary">{cat.count}</div>
                            <div className="text-xs text-gray-500">{cat.category}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <Trash className="h-4 w-4 mr-2 text-primary" />
                    回收站
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    已删除的笔记会在回收站保留30天
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/notes/trash")}
                  >
                    查看回收站
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">全部笔记</TabsTrigger>
                  <TabsTrigger value="pinned">置顶笔记</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <NoteList
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    onEditNote={openEditor}
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>

                <TabsContent value="pinned">
                  <Card className="border-dashed border-2 p-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <h3 className="font-medium text-lg">暂无置顶笔记</h3>
                      <p className="text-sm text-muted-foreground">
                        您可以在笔记编辑页面设置置顶
                      </p>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        noteId={editingNoteId}
        onSave={handleSave}
      />
    </div>
  )
}