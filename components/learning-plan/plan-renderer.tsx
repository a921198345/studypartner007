"use client"

import { useState } from "react"
import { Checkbox } from "../ui/checkbox"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Trash2, Plus, Edit2, Save, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Task {
  id: string
  content: string
  completed: boolean
}

interface PlanRendererProps {
  content: string
  planType: 'daily' | 'weekly'
  completedTasks: Record<string, boolean>
  onTaskToggle: (taskId: string) => void
  onTasksChange?: (tasks: Task[]) => void
}

export function PlanRenderer({ content, planType, completedTasks, onTaskToggle, onTasksChange }: PlanRendererProps) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    // 如果内容为空，返回空数组
    if (!content || content.trim() === '') {
      return []
    }
    
    // 优先从本地存储加载已保存的任务
    const tasksKey = `${planType}-tasks`
    const savedTasks = localStorage.getItem(tasksKey)
    
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks)
        // 更新完成状态
        return parsedTasks.map((task: Task) => ({
          ...task,
          completed: completedTasks[task.id] || false
        }))
      } catch (error) {
        console.error('Failed to load saved tasks:', error)
      }
    }
    
    // 如果没有保存的任务，从content中提取任务
    const extractedTasks = extractTasksFromContent(content, planType, completedTasks)
    return extractedTasks
  })
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [newTaskContent, setNewTaskContent] = useState<string>('')
  const [showAddTask, setShowAddTask] = useState<boolean>(false)

  // 从AI生成的内容中提取任务
  function extractTasksFromContent(content: string, planType: string, completedTasks: Record<string, boolean>): Task[] {
    const lines = content.split('\n')
    const tasks: Task[] = []
    let currentTaskIndex = 0
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      // 检查是否是任务项
      const isTask = /^(□|☐|([0-9]+[.)、]|\d+\.)?\s*任务)|^(□|☐)\s*[掌握理解完成学习背诵复习]/.test(trimmedLine)
      
      if (isTask) {
        const taskId = `${planType}-task-${currentTaskIndex}`
        currentTaskIndex++
        
        // 清理任务文本
        const cleanedTask = trimmedLine
          .replace(/^(□|☐)\s*/, '')
          .replace(/^([0-9]+[.)、]|\d+\.)\s*/, '')
          .replace(/^任务\d*[：:]\s*/, '')
          .trim()
        
        tasks.push({
          id: taskId,
          content: cleanedTask,
          completed: completedTasks[taskId] || false
        })
      }
    }
    
    return tasks
  }

  // 处理任务完成状态切换
  const handleTaskToggle = (taskId: string) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
      onTaskToggle(taskId)
      return updatedTasks
    })
  }

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.filter(task => task.id !== taskId)
      onTasksChange?.(updatedTasks)
      return updatedTasks
    })
  }

  // 开始编辑任务
  const startEditTask = (task: Task) => {
    setEditingTask(task.id)
    setEditContent(task.content)
  }

  // 保存编辑的任务
  const saveEditTask = () => {
    if (!editingTask || !editContent.trim()) return
    
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === editingTask ? { ...task, content: editContent.trim() } : task
      )
      onTasksChange?.(updatedTasks)
      return updatedTasks
    })
    
    setEditingTask(null)
    setEditContent('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingTask(null)
    setEditContent('')
  }

  // 添加新任务
  const addNewTask = () => {
    if (!newTaskContent.trim()) return
    
    const newTask: Task = {
      id: `${planType}-task-${Date.now()}`,
      content: newTaskContent.trim(),
      completed: false
    }
    
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, newTask]
      onTasksChange?.(updatedTasks)
      return updatedTasks
    })
    
    setNewTaskContent('')
    setShowAddTask(false)
  }

  // 如果是本周计划且有原始内容，使用表格格式显示
  if (planType === 'weekly' && content && content.trim() !== '') {
    return (
      <div className="space-y-4">
        {/* 直接渲染本周计划的 markdown 内容 */}
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children, ...props }) => (
                <thead className="bg-gray-50" {...props}>
                  {children}
                </thead>
              ),
              tbody: ({ children, ...props }) => (
                <tbody className="bg-white divide-y divide-gray-200" {...props}>
                  {children}
                </tbody>
              ),
              th: ({ children, ...props }) => (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200" {...props}>
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" {...props}>
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  // 本日计划和没有内容的情况，使用任务清单格式
  if (tasks.length === 0 && !showAddTask) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">暂无任务，点击下方按钮添加新任务</p>
        <Button
          variant="dashed"
          onClick={() => setShowAddTask(true)}
          className="border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加任务
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 本日计划：任务列表格式，重点显示时间与任务的融合 */}
      {tasks.map((task) => (
        <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
          task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
        } hover:shadow-sm transition-all`}>
          {/* 复选框 */}
          <Checkbox
            id={task.id}
            checked={task.completed}
            onCheckedChange={() => handleTaskToggle(task.id)}
            className="mt-1 flex-shrink-0"
          />
          
          {/* 任务内容 - 针对本日计划优化显示格式 */}
          <div className="flex-1 min-w-0">
            {editingTask === task.id ? (
              <div className="flex gap-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditTask()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={saveEditTask} className="flex-shrink-0">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-shrink-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className={`block text-sm ${
                task.completed ? 'line-through text-gray-500' : 'text-gray-700'
              }`}>
                {/* 如果是本日计划且任务内容包含时间，特殊格式化显示 */}
                {planType === 'daily' && /\d{1,2}:\d{2}-\d{1,2}:\d{2}/.test(task.content) ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    {/* 提取时间部分 */}
                    <span className="font-medium text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                      {task.content.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/)?.[0]}
                    </span>
                    {/* 任务内容部分 */}
                    <span className="flex-1">
                      {task.content.replace(/\d{1,2}:\d{2}-\d{1,2}:\d{2}\s*/, '')}
                    </span>
                  </div>
                ) : (
                  <label htmlFor={task.id} className="cursor-pointer">
                    {task.content}
                  </label>
                )}
              </div>
            )}
          </div>
          
          {/* 操作按钮 */}
          {editingTask !== task.id && (
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEditTask(task)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteTask(task.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
      
      {/* 添加新任务 */}
      {showAddTask ? (
        <div className="flex gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
          <Input
            placeholder={planType === 'daily' ? "输入任务（如：9:00-10:30 学习民法总则第一章）..." : "输入新任务内容..."}
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNewTask()
              if (e.key === 'Escape') {
                setShowAddTask(false)
                setNewTaskContent('')
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={addNewTask} disabled={!newTaskContent.trim()}>
            <Save className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setShowAddTask(false)
              setNewTaskContent('')
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="dashed"
          onClick={() => setShowAddTask(true)}
          className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加任务
        </Button>
      )}
      
    </div>
  )
}