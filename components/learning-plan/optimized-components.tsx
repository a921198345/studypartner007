/**
 * 学习计划组件性能优化
 * 使用React.memo、useMemo、useCallback等优化技术
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Target, BookOpen, TrendingUp } from "lucide-react"

// ================================
// 1. 优化的学习统计组件
// ================================

interface LearningStatsProps {
  totalHours: number
  completedTasks: number
  totalTasks: number
  streak: number
  questionsAnswered: number
  notesCreated: number
}

const OptimizedLearningStats = memo<LearningStatsProps>(({
  totalHours,
  completedTasks,
  totalTasks,
  streak,
  questionsAnswered,
  notesCreated
}) => {
  // 使用useMemo缓存计算结果
  const completionRate = useMemo(() => {
    if (totalTasks === 0) return 0
    return Math.round((completedTasks / totalTasks) * 100)
  }, [completedTasks, totalTasks])

  const averageHoursPerDay = useMemo(() => {
    if (streak === 0) return 0
    return Math.round((totalHours / streak) * 10) / 10
  }, [totalHours, streak])

  const stats = useMemo(() => [
    {
      icon: <Clock className="h-4 w-4" />,
      label: "总学习时长",
      value: `${totalHours}小时`,
      color: "text-blue-600"
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "完成率",
      value: `${completionRate}%`,
      color: "text-green-600"
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "连续学习",
      value: `${streak}天`,
      color: "text-purple-600"
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "练习题目",
      value: `${questionsAnswered}题`,
      color: "text-orange-600"
    }
  ], [totalHours, completionRate, streak, questionsAnswered])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          学习统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`flex items-center justify-center mb-2 ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>完成进度</span>
            <span>{completedTasks}/{totalTasks}</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>
        
        {averageHoursPerDay > 0 && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            平均每日学习 {averageHoursPerDay} 小时
          </div>
        )}
      </CardContent>
    </Card>
  )
})

OptimizedLearningStats.displayName = 'OptimizedLearningStats'

// ================================
// 2. 优化的任务列表组件
// ================================

interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  estimatedTime: number
  subject: string
}

interface TaskListProps {
  tasks: Task[]
  onTaskToggle: (taskId: string) => void
  onTaskEdit: (taskId: string) => void
}

const TaskItem = memo<{
  task: Task
  onToggle: (taskId: string) => void
  onEdit: (taskId: string) => void
}>(({ task, onToggle, onEdit }) => {
  const handleToggle = useCallback(() => {
    onToggle(task.id)
  }, [task.id, onToggle])

  const handleEdit = useCallback(() => {
    onEdit(task.id)
  }, [task.id, onEdit])

  const priorityColor = useMemo(() => {
    switch (task.priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [task.priority])

  return (
    <div className={`p-3 border rounded-lg transition-colors ${
      task.completed ? 'bg-gray-50 opacity-75' : 'bg-white hover:bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggle}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <div className="flex-1">
            <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={priorityColor}>
                {task.priority}
              </Badge>
              <span className="text-sm text-gray-500">{task.subject}</span>
              <span className="text-sm text-gray-500">{task.estimatedTime}分钟</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          编辑
        </Button>
      </div>
    </div>
  )
})

TaskItem.displayName = 'TaskItem'

const OptimizedTaskList = memo<TaskListProps>(({ tasks, onTaskToggle, onTaskEdit }) => {
  // 使用useMemo缓存分组和排序后的任务
  const groupedTasks = useMemo(() => {
    const pending = tasks.filter(task => !task.completed)
    const completed = tasks.filter(task => task.completed)
    
    // 按优先级排序待完成任务
    const sortedPending = pending.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    return { pending: sortedPending, completed }
  }, [tasks])

  const taskStats = useMemo(() => ({
    total: tasks.length,
    completed: groupedTasks.completed.length,
    pending: groupedTasks.pending.length,
    completionRate: tasks.length > 0 ? Math.round((groupedTasks.completed.length / tasks.length) * 100) : 0
  }), [tasks.length, groupedTasks.completed.length, groupedTasks.pending.length])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            今日任务
          </div>
          <Badge variant="outline">
            {taskStats.completed}/{taskStats.total}
          </Badge>
        </CardTitle>
        <Progress value={taskStats.completionRate} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedTasks.pending.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-700 mb-2">
              待完成 ({groupedTasks.pending.length})
            </h5>
            <div className="space-y-2">
              {groupedTasks.pending.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onTaskToggle}
                  onEdit={onTaskEdit}
                />
              ))}
            </div>
          </div>
        )}
        
        {groupedTasks.completed.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-700 mb-2">
              已完成 ({groupedTasks.completed.length})
            </h5>
            <div className="space-y-2">
              {groupedTasks.completed.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onTaskToggle}
                  onEdit={onTaskEdit}
                />
              ))}
            </div>
          </div>
        )}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>今日暂无学习任务</p>
            <p className="text-sm">制定学习计划开始高效学习吧！</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

OptimizedTaskList.displayName = 'OptimizedTaskList'

// ================================
// 3. 优化的进度图表组件
// ================================

interface ProgressData {
  date: string
  hours: number
  tasks: number
  subject: string
}

interface ProgressChartProps {
  data: ProgressData[]
  timeRange: '7d' | '30d' | '90d'
  onTimeRangeChange: (range: '7d' | '30d' | '90d') => void
}

const OptimizedProgressChart = memo<ProgressChartProps>(({ 
  data, 
  timeRange, 
  onTimeRangeChange 
}) => {
  // 缓存处理后的图表数据
  const chartData = useMemo(() => {
    // 根据时间范围过滤数据
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return data
      .filter(item => new Date(item.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data, timeRange])

  // 缓存统计数据
  const stats = useMemo(() => {
    const totalHours = chartData.reduce((sum, item) => sum + item.hours, 0)
    const totalTasks = chartData.reduce((sum, item) => sum + item.tasks, 0)
    const avgHours = chartData.length > 0 ? totalHours / chartData.length : 0
    const avgTasks = chartData.length > 0 ? totalTasks / chartData.length : 0
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalTasks,
      avgHours: Math.round(avgHours * 10) / 10,
      avgTasks: Math.round(avgTasks * 10) / 10
    }
  }, [chartData])

  const handleTimeRangeChange = useCallback((range: '7d' | '30d' | '90d') => {
    onTimeRangeChange(range)
  }, [onTimeRangeChange])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            学习进度
          </CardTitle>
          <div className="flex space-x-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(range)}
              >
                {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalHours}h</div>
            <div className="text-sm text-gray-600">总学习时长</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalTasks}</div>
            <div className="text-sm text-gray-600">完成任务</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgHours}h</div>
            <div className="text-sm text-gray-600">日均时长</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgTasks}</div>
            <div className="text-sm text-gray-600">日均任务</div>
          </div>
        </div>
        
        {/* 简化的进度条显示 */}
        <div className="space-y-3">
          {chartData.slice(-10).map((item, index) => (
            <div key={item.date} className="flex items-center space-x-3">
              <div className="text-sm font-medium w-20">
                {new Date(item.date).toLocaleDateString('zh-CN', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.subject}</span>
                  <span>{item.hours}h / {item.tasks}任务</span>
                </div>
                <Progress value={Math.min((item.hours / 8) * 100, 100)} className="h-2" />
              </div>
            </div>
          ))}
        </div>
        
        {chartData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无学习数据</p>
            <p className="text-sm">开始学习后这里将显示您的进度趋势</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

OptimizedProgressChart.displayName = 'OptimizedProgressChart'

// ================================
// 4. 虚拟化长列表组件
// ================================

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
}

function VirtualizedList<T>({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem,
  overscan = 5 
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  
  // 计算可见项目的范围
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(start + visibleCount + overscan, items.length)
    const actualStart = Math.max(0, start - overscan)
    
    return {
      startIndex: actualStart,
      endIndex: end,
      visibleItems: items.slice(actualStart, end)
    }
  }, [scrollTop, itemHeight, containerHeight, items, overscan])
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight
  
  return (
    <div 
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================================
// 导出优化组件
// ================================

export {
  OptimizedLearningStats,
  OptimizedTaskList,
  OptimizedProgressChart,
  VirtualizedList
}

// 使用示例和最佳实践注释
export const PerformanceOptimizationGuide = {
  memo: "使用React.memo包装组件，避免不必要的重渲染",
  useMemo: "缓存昂贵的计算结果，如排序、过滤、统计等",
  useCallback: "缓存事件处理函数，特别是传递给子组件的函数",
  virtualization: "对于长列表使用虚拟化技术，只渲染可见项目",
  codesplitting: "使用动态导入分割代码，减少初始包大小",
  lazyLoading: "懒加载非关键组件和数据"
}