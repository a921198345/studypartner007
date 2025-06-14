"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, RefreshCw, Play, ChevronRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { addClientSessionHeader } from "@/lib/client-session"

interface AnswerSession {
  sessionId: string
  session_id?: string // 数据库字段
  startTime: string
  start_time?: string // 数据库字段
  endTime?: string
  end_time?: string // 数据库字段
  questionsAnswered: number
  questions_answered?: number // 数据库字段
  correctCount: number
  correct_count?: number // 数据库字段
  totalQuestions?: number
  total_questions?: number // 数据库字段
  source?: string
  subject?: string
  year?: string[]
  years?: string | string[] // 数据库可能返回JSON字符串
  questionType?: string
  question_types?: string | string[] // 数据库可能返回JSON字符串
  search_keyword?: string
  lastQuestionId: number
  last_question_id?: number // 数据库字段
  filters: {
    subject?: string
    years?: string[]
    types?: string[]
    search?: string
  }
}

export function AnswerHistoryV2() {
  const [sessions, setSessions] = useState<AnswerSession[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  // 从数据库加载答题会话
  const loadSessionsFromDatabase = async () => {
    try {
      console.log('正在从数据库加载答题会话...')
      const response = await fetch('/api/exams/sessions', {
        headers: addClientSessionHeader()
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('数据库响应:', result)
        
        if (result.success && result.data && result.data.sessions) {
          // 转换数据库字段到前端格式
          const dbSessions = result.data.sessions.map((session: any) => ({
            sessionId: session.session_id || session.sessionId,
            startTime: session.start_time || session.startTime,
            endTime: session.end_time || session.endTime,
            questionsAnswered: session.questions_answered || session.questionsAnswered || 0,
            correctCount: session.correct_count || session.correctCount || 0,
            totalQuestions: session.total_questions || session.totalQuestions || 0,
            source: session.source || 'all',
            subject: session.subject,
            lastQuestionId: session.last_question_id || session.lastQuestionId || 1,
            filters: session.filters || {},
            // 处理年份字段
            year: session.years ? (typeof session.years === 'string' ? JSON.parse(session.years) : session.years) : [],
            // 处理题型字段
            questionType: session.question_types ? (typeof session.question_types === 'string' ? JSON.parse(session.question_types) : session.question_types) : []
          }))
          
          console.log(`从数据库加载到 ${dbSessions.length} 个会话`)
          return dbSessions
        }
      } else {
        console.error('数据库请求失败:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('从数据库加载会话失败:', error)
    }
    return []
  }

  // 从本地存储加载答题会话
  const loadSessionsFromLocal = () => {
    try {
      const sessionsStr = localStorage.getItem('answerSessions')
      if (sessionsStr) {
        const localSessions = JSON.parse(sessionsStr)
        console.log(`从本地存储加载到 ${localSessions.length} 个会话`)
        return localSessions
      }
    } catch (error) {
      console.error('从本地存储加载会话失败:', error)
    }
    return []
  }

  // 合并数据库和本地的会话
  const mergeAndLoadSessions = async () => {
    setLoading(true)
    
    try {
      // 1. 先尝试从数据库加载
      const dbSessions = await loadSessionsFromDatabase()
      
      // 2. 加载本地会话
      const localSessions = loadSessionsFromLocal()
      
      // 3. 检查当前会话
      const currentSessionStr = localStorage.getItem('currentAnswerSession')
      let currentSession = null
      if (currentSessionStr) {
        try {
          currentSession = JSON.parse(currentSessionStr)
          console.log('发现当前活动会话:', currentSession)
        } catch (e) {
          console.error('解析当前会话失败:', e)
        }
      }
      
      // 4. 合并会话（去重）
      const sessionMap = new Map()
      
      // 先添加数据库会话
      dbSessions.forEach(session => {
        sessionMap.set(session.sessionId, session)
      })
      
      // 添加本地会话（如果不存在则添加）
      localSessions.forEach((session: AnswerSession) => {
        if (!sessionMap.has(session.sessionId) && session.questionsAnswered > 0) {
          sessionMap.set(session.sessionId, session)
        }
      })
      
      // 如果有当前活动会话且有答题记录，也添加到列表
      if (currentSession && currentSession.questionsAnswered > 0) {
        sessionMap.set(currentSession.sessionId, {
          ...currentSession,
          endTime: currentSession.endTime || '进行中'
        })
      }
      
      // 转换为数组并排序
      const mergedSessions = Array.from(sessionMap.values())
        .filter(session => session.questionsAnswered > 0)
        .sort((a, b) => {
          const timeA = new Date(a.startTime).getTime()
          const timeB = new Date(b.startTime).getTime()
          return timeB - timeA
        })
      
      console.log(`合并后共 ${mergedSessions.length} 个会话`)
      setSessions(mergedSessions)
      
      // 4. 如果有本地会话未同步到数据库，自动同步
      if (localSessions.length > 0 && dbSessions.length === 0) {
        console.log('检测到本地会话未同步，尝试自动同步...')
        syncToDatabase(localSessions)
      }
      
    } catch (error) {
      console.error('加载答题历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 同步本地数据到数据库
  const syncToDatabase = async (sessionsToSync?: AnswerSession[]) => {
    setSyncing(true)
    try {
      const sessions = sessionsToSync || loadSessionsFromLocal()
      
      if (sessions.length === 0) {
        console.log('没有需要同步的会话')
        return
      }
      
      const response = await fetch('/api/exams/sessions/migrate', {
        method: 'POST',
        headers: addClientSessionHeader({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ sessions })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`成功同步 ${result.data?.migrated || 0} 个会话到数据库`)
        // 重新加载数据
        await mergeAndLoadSessions()
      }
    } catch (error) {
      console.error('同步到数据库失败:', error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    mergeAndLoadSessions()
    
    // 监听事件更新
    const handleSessionUpdate = () => {
      console.log('检测到答题会话更新')
      mergeAndLoadSessions()
    }
    
    window.addEventListener('answerSessionUpdated', handleSessionUpdate)
    
    // 定时刷新（减少频率）
    const intervalId = setInterval(() => {
      mergeAndLoadSessions()
    }, 60000) // 60秒刷新一次
    
    return () => {
      window.removeEventListener('answerSessionUpdated', handleSessionUpdate)
      clearInterval(intervalId)
    }
  }, [])

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor(diff / (1000 * 60))
      
      if (minutes < 1) {
        return '刚刚'
      } else if (minutes < 60) {
        return `${minutes}分钟前`
      } else if (hours < 24) {
        return `${hours}小时前`
      } else if (days === 0) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      } else if (days === 1) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      } else if (days < 7) {
        return `${days}天前`
      } else {
        return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }).replace(/\//g, '月') + '日'
      }
    } catch {
      return '未知时间'
    }
  }

  const getSessionTitle = (session: AnswerSession) => {
    const parts = []
    
    if (session.source === 'wrong') {
      parts.push('🔴 错题练习')
    } else if (session.source === 'favorites') {
      parts.push('⭐ 收藏练习')
    } else {
      // 科目
      if (session.filters?.subject && session.filters.subject !== 'all') {
        parts.push(session.filters.subject)
      } else if (session.subject && session.subject !== 'all') {
        parts.push(session.subject)
      } else {
        parts.push('全部科目')
      }
      
      // 年份
      const years = session.filters?.years || session.year || []
      if (years.length > 0 && !years.includes('all')) {
        parts.push(years.join('、') + '年')
      } else {
        parts.push('全部年份')
      }
      
      // 题型
      const types = session.filters?.types || session.questionType || []
      if (types.length > 0 && !types.includes('全部题型')) {
        parts.push(types.join('、'))
      } else {
        parts.push('全部题型')
      }
      
      // 搜索关键词
      if (session.filters?.search || session.search_keyword) {
        parts.push(`搜索"${session.filters?.search || session.search_keyword}"`)
      }
    }
    
    return parts.join(' · ')
  }

  const handleContinuePractice = (session: AnswerSession) => {
    if (session.filters) {
      localStorage.setItem('filteredQuestionsList', JSON.stringify({
        questions: [],
        filters: session.filters,
        timestamp: Date.now()
      }))
    }
    router.push(`/question-bank/${session.lastQuestionId}?continue=true`)
  }

  const handleRestartPractice = (session: AnswerSession) => {
    const historyStr = localStorage.getItem('answerHistory')
    if (historyStr) {
      try {
        const history = JSON.parse(historyStr)
        const newHistory = {
          ...history,
          answered: {},
          correct: {},
          results: {},
          timestamp: Date.now()
        }
        localStorage.setItem('answerHistory', JSON.stringify(newHistory))
      } catch (e) {
        console.error('清除答题记录失败:', e)
      }
    }
    
    if (session.filters) {
      localStorage.setItem('filteredQuestionsList', JSON.stringify({
        questions: [],
        filters: session.filters,
        timestamp: Date.now()
      }))
    }
    
    const { createAnswerSession } = require('@/lib/answer-sessions')
    createAnswerSession(session.filters)
    
    router.push(`/question-bank/1`)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            加载中...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            答题历史
          </h3>
          {syncing && (
            <div className="text-xs text-gray-500 flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              同步中...
            </div>
          )}
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">暂无答题记录</p>
            <p className="text-sm">开始练习后这里会显示你的答题历史</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-4"
              onClick={() => syncToDatabase()}
              disabled={syncing}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              手动同步
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {sessions.map((session, index) => {
                  const completionRate = session.totalQuestions > 0
                    ? Math.round((session.questionsAnswered / session.totalQuestions) * 100)
                    : 0
                  
                  return (
                    <div
                      key={session.sessionId || index}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="mb-2">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {getSessionTitle(session)}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{formatDate(session.startTime)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1 text-xs mb-3">
                        <div className="text-center">
                          <div className="font-semibold">{session.questionsAnswered}</div>
                          <div className="text-gray-500">已答</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{session.correctCount}</div>
                          <div className="text-gray-500">答对</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {session.questionsAnswered > 0 
                              ? Math.round((session.correctCount / session.questionsAnswered) * 100) 
                              : 0}%
                          </div>
                          <div className="text-gray-500">正确率</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">
                            {completionRate}%
                          </div>
                          <div className="text-gray-500">完成率</div>
                        </div>
                      </div>
                      
                      {session.totalQuestions > 0 && (
                        <div className="mb-3">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleRestartPractice(session)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          重新练习
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleContinuePractice(session)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          继续练习
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => router.push('/profile')}
              >
                查看完整统计
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}