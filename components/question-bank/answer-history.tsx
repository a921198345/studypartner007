"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Clock, RefreshCw, Play, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface AnswerSession {
  sessionId: string
  startTime: string
  endTime?: string
  questionsAnswered: number
  correctCount: number
  totalQuestions?: number
  source?: string // all/wrong/favorites
  subject?: string
  year?: string[]
  questionType?: string
  lastQuestionId: number
  filters: {
    subject?: string
    years?: string[]
    types?: string[]
    search?: string
  }
}

export function AnswerHistory() {
  const [sessions, setSessions] = useState<AnswerSession[]>([])
  const [loading, setLoading] = useState(true)
  const [migrateStatus, setMigrateStatus] = useState<'idle' | 'migrating' | 'done'>('idle')
  const router = useRouter()

  useEffect(() => {
    // 直接加载答题历史，不等待迁移
    console.log('答题历史组件挂载，开始加载数据')
    loadAnswerSessions()
    
    // 同时尝试迁移数据（异步执行，不阻塞显示）
    migrateLocalDataIfNeeded().then(() => {
      // 迁移完成后再次加载
      console.log('数据迁移完成，重新加载答题历史')
      loadAnswerSessions()
    })
    
    // 监听页面获得焦点事件，刷新答题历史
    const handleFocus = () => {
      console.log('页面获得焦点，刷新答题历史')
      loadAnswerSessions()
    }
    
    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('页面变为可见，刷新答题历史')
        loadAnswerSessions()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听自定义事件，用于更新答题历史
    const handleSessionUpdate = () => {
      console.log('检测到答题会话更新')
      loadAnswerSessions()
    }
    
    window.addEventListener('answerSessionUpdated', handleSessionUpdate)
    
    // 定时刷新，确保数据同步
    const intervalId = setInterval(() => {
      loadAnswerSessions()
    }, 10000) // 每10秒刷新一次（减少频率）
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('answerSessionUpdated', handleSessionUpdate)
      clearInterval(intervalId)
    }
  }, [])

  const migrateLocalDataIfNeeded = async () => {
    try {
      // 检查是否已经迁移过
      const migrated = localStorage.getItem('answerHistoryMigrated')
      if (migrated === 'true') {
        return
      }
      
      setMigrateStatus('migrating')
      
      // 获取本地数据
      const sessionsStr = localStorage.getItem('answerSessions')
      const currentSessionStr = localStorage.getItem('currentAnswerSession')
      const historyStr = localStorage.getItem('answerHistory')
      
      const sessions = sessionsStr ? JSON.parse(sessionsStr) : []
      const currentSession = currentSessionStr ? JSON.parse(currentSessionStr) : null
      const answerHistory = historyStr ? JSON.parse(historyStr) : null
      
      if (sessions.length > 0 || currentSession || answerHistory) {
        // 调用迁移API
        const { addClientSessionHeader } = await import('../../lib/client-session')
        const response = await fetch('/api/exams/sessions/migrate', {
          method: 'POST',
          headers: addClientSessionHeader({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            sessions,
            currentSession,
            answerHistory
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('数据迁移成功:', result)
          localStorage.setItem('answerHistoryMigrated', 'true')
        }
      }
      
      setMigrateStatus('done')
    } catch (error) {
      console.error('数据迁移失败:', error)
      setMigrateStatus('done')
    }
  }
  
  const loadAnswerSessions = async () => {
    try {
      // 优先从数据库加载
      try {
        const { addClientSessionHeader } = await import('../../lib/client-session')
        const response = await fetch('/api/exams/sessions', {
          headers: addClientSessionHeader()
        })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.sessions) {
            const dbSessions = result.data.sessions.map((session: any) => ({
              sessionId: session.session_id,
              startTime: session.start_time,
              endTime: session.end_time,
              questionsAnswered: session.questions_answered,
              correctCount: session.correct_count,
              totalQuestions: session.total_questions,
              source: session.source,
              subject: session.subject,
              year: session.years,
              questionType: session.question_types?.[0],
              lastQuestionId: session.last_question_id,
              filters: session.filters || {}
            }))
            
            console.log(`从数据库加载到 ${dbSessions.length} 个有答题记录的会话`)
            // 调试：显示会话详情
            if (dbSessions.length > 0) {
              console.log('会话详情:', dbSessions)
            } else {
              console.log('没有找到有答题记录的会话，检查 questions_answered > 0 的条件')
            }
            // 即使没有数据也要设置，让组件显示"暂无答题记录"
            setSessions(dbSessions)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('从数据库加载失败，尝试本地存储:', error)
      }
      
      // 如果数据库加载失败，降级到localStorage
      const historyStr = localStorage.getItem('answerHistory')
      const sessionsStr = localStorage.getItem('answerSessions')
      const currentSessionStr = localStorage.getItem('currentAnswerSession')
      
      console.log('加载本地答题历史数据:', {
        hasHistory: !!historyStr,
        hasSessions: !!sessionsStr,
        hasCurrentSession: !!currentSessionStr
      })
      
      let loadedSessions: AnswerSession[] = []
      
      // 尝试加载保存的会话
      if (sessionsStr) {
        try {
          loadedSessions = JSON.parse(sessionsStr)
        } catch (e) {
          console.error('解析答题会话失败:', e)
        }
      }
      
      // 如果没有会话记录但有答题历史，创建一个默认会话
      if (loadedSessions.length === 0 && historyStr) {
        try {
          const history = JSON.parse(historyStr)
          if (history && history.answered && Object.keys(history.answered).length > 0) {
            const answeredIds = Object.keys(history.answered).map(Number)
            const correctCount = Object.values(history.correct || {}).filter(Boolean).length
            
            loadedSessions.push({
              sessionId: 'default',
              startTime: new Date(history.timestamp || Date.now()).toISOString(),
              questionsAnswered: answeredIds.length,
              correctCount: correctCount,
              lastQuestionId: Math.max(...answeredIds),
              filters: {}
            })
          }
        } catch (e) {
          console.error('从答题历史创建会话失败:', e)
        }
      }
      
      // 过滤掉未答题的会话（已答题数为0）
      loadedSessions = loadedSessions.filter(session => session.questionsAnswered > 0)
      
      console.log('本地答题历史过滤后的会话:', {
        beforeFilter: sessionsStr ? JSON.parse(sessionsStr).length : 0,
        afterFilter: loadedSessions.length
      })
      
      // 按时间倒序排序
      loadedSessions.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      
      setSessions(loadedSessions)
    } catch (error) {
      console.error('加载答题历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

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
    
    // 如果是错题或收藏练习，优先显示
    if (session.source === 'wrong') {
      parts.push('🔴 错题练习')
    } else if (session.source === 'favorites') {
      parts.push('⭐ 收藏练习')
    } else {
      // 普通练习显示筛选条件
      // 科目
      if (session.filters?.subject && session.filters.subject !== 'all') {
        parts.push(session.filters.subject)
      } else if (session.subject && session.subject !== 'all') {
        parts.push(session.subject)
      } else {
        parts.push('全部科目')
      }
      
      // 年份
      if (session.filters?.years && session.filters.years.length > 0 && !session.filters.years.includes('all')) {
        parts.push(session.filters.years.join('、') + '年')
      } else if (session.year && session.year.length > 0 && !session.year.includes('all')) {
        parts.push(session.year.join('、') + '年')
      } else {
        parts.push('全部年份')
      }
      
      // 题型
      if (session.filters?.types && session.filters.types.length > 0 && !session.filters.types.includes('全部题型')) {
        parts.push(session.filters.types.join('、'))
      } else if (session.questionType) {
        parts.push(session.questionType)
      } else {
        parts.push('全部题型')
      }
      
      // 搜索关键词
      if (session.filters?.search) {
        parts.push(`搜索"${session.filters.search}"`)
      }
      
      // AI关键词
      if (session.filters?.aiKeywords && session.filters.aiKeywords.length > 0) {
        parts.push(`AI搜索"${session.filters.aiKeywords.join('、')}"`)
      }
    }
    
    return parts.join(' · ')
  }

  const handleContinuePractice = async (session: AnswerSession) => {
    // 如果有筛选条件，传递到目标页面让其重新加载题目
    if (session.filters) {
      // 将筛选条件编码到URL参数中
      const filtersParam = encodeURIComponent(JSON.stringify(session.filters))
      router.push(`/question-bank/${session.lastQuestionId}?continue=true&filters=${filtersParam}&sessionId=${session.sessionId}`)
    } else {
      // 没有筛选条件的情况
      router.push(`/question-bank/${session.lastQuestionId}?continue=true&sessionId=${session.sessionId}`)
    }
  }

  const handleRestartPractice = async (session: AnswerSession) => {
    // 清除该会话的答题记录
    const historyStr = localStorage.getItem('answerHistory')
    if (historyStr) {
      try {
        const history = JSON.parse(historyStr)
        // 创建新的历史记录，但保留其他数据
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
    
    // 创建新会话
    const { createAnswerSession } = require('../../lib/answer-sessions')
    const newSessionId = await createAnswerSession(session.filters)
    
    // 如果有筛选条件，传递到目标页面让其重新加载题目
    if (session.filters) {
      const filtersParam = encodeURIComponent(JSON.stringify(session.filters))
      // 跳转时带上筛选条件，让目标页面重新加载题目
      router.push(`/question-bank?restart=true&filters=${filtersParam}&sessionId=${newSessionId}`)
    } else {
      router.push(`/question-bank?restart=true&sessionId=${newSessionId}`)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-4">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            答题历史
          </h3>
          {migrateStatus === 'idle' && localStorage.getItem('answerHistoryMigrated') !== 'true' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => migrateLocalDataIfNeeded().then(() => loadAnswerSessions())}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              同步数据
            </Button>
          )}
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">暂无答题记录</p>
            <p className="text-sm">开始练习后这里会显示你的答题历史</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {sessions.map((session, index) => {
                // 计算练习时长
                const getDuration = () => {
                  if (!session.endTime) return '进行中'
                  const start = new Date(session.startTime)
                  const end = new Date(session.endTime)
                  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000)
                  if (minutes < 1) return '不到1分钟'
                  if (minutes < 60) return `${minutes}分钟`
                  const hours = Math.floor(minutes / 60)
                  const mins = minutes % 60
                  return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
                }
                
                // 计算完成率
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
                        <span>·</span>
                        <span>用时 {getDuration()}</span>
                        {session.totalQuestions > 0 && (
                          <>
                            <span>·</span>
                            <span>共{session.totalQuestions}题</span>
                          </>
                        )}
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
                    
                    {/* 进度条 */}
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
        )}
        
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
      </CardContent>
    </Card>
  )
}