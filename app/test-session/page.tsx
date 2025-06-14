"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestSessionPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [fixResult, setFixResult] = useState<string>("")

  // 加载会话数据
  const loadSessions = () => {
    const sessionsData = localStorage.getItem('answerSessions')
    const currentSessionData = localStorage.getItem('currentAnswerSession')
    
    if (sessionsData) {
      setSessions(JSON.parse(sessionsData))
    }
    if (currentSessionData) {
      setCurrentSession(JSON.parse(currentSessionData))
    }
  }

  // 修复0答题会话
  const fixZeroSessions = () => {
    const sessionsData = localStorage.getItem('answerSessions')
    if (!sessionsData) {
      setFixResult("没有会话数据")
      return
    }

    const sessions = JSON.parse(sessionsData)
    let fixedCount = 0

    sessions.forEach((session: any) => {
      if (session.questionsAnswered === 0) {
        // 基于会话的source类型设置合理的默认值
        if (session.source === 'wrong' || session.source === 'favorites') {
          session.questionsAnswered = 1
          session.correctCount = 0
        }
        fixedCount++
      }
    })

    if (fixedCount > 0) {
      localStorage.setItem('answerSessions', JSON.stringify(sessions))
      setFixResult(`成功修复 ${fixedCount} 个会话`)
      
      // 触发答题历史更新事件
      window.dispatchEvent(new Event('answerSessionUpdated'))
      
      // 重新加载数据
      loadSessions()
    } else {
      setFixResult("没有需要修复的会话")
    }
  }

  // 创建测试会话
  const createTestSession = (type: string) => {
    const testSession = {
      sessionId: Date.now().toString(),
      startTime: new Date().toISOString(),
      questionsAnswered: 3,
      correctCount: 2,
      totalQuestions: type === 'wrong' ? 11 : 10,
      source: type,
      filters: {},
      lastQuestionId: 123,
      endTime: new Date().toISOString()
    }

    const sessionsData = localStorage.getItem('answerSessions')
    const sessions = sessionsData ? JSON.parse(sessionsData) : []
    sessions.push(testSession)
    
    localStorage.setItem('answerSessions', JSON.stringify(sessions))
    
    // 触发更新事件
    window.dispatchEvent(new Event('answerSessionUpdated'))
    
    setFixResult(`创建了${type}测试会话`)
    loadSessions()
  }

  // 清空所有会话
  const clearAllSessions = () => {
    if (confirm('确定要清空所有会话吗？')) {
      localStorage.removeItem('answerSessions')
      localStorage.removeItem('currentAnswerSession')
      setFixResult("已清空所有会话")
      loadSessions()
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const zeroSessions = sessions.filter(s => s.questionsAnswered === 0)
  const wrongSessions = sessions.filter(s => s.source === 'wrong')
  const favoritesSessions = sessions.filter(s => s.source === 'favorites')

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">会话调试工具</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>会话统计</CardTitle>
          </CardHeader>
          <CardContent>
            <p>总会话数: {sessions.length}</p>
            <p className={zeroSessions.length > 0 ? "text-red-500" : "text-green-500"}>
              0答题会话: {zeroSessions.length}
            </p>
            <p>错题会话: {wrongSessions.length}</p>
            <p>收藏会话: {favoritesSessions.length}</p>
            
            {currentSession && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="font-medium">当前活动会话:</p>
                <p>类型: {currentSession.source}</p>
                <p>已答: {currentSession.questionsAnswered}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => loadSessions()} className="w-full">
              刷新数据
            </Button>
            <Button onClick={fixZeroSessions} className="w-full" variant="outline">
              修复0答题会话
            </Button>
            <Button onClick={() => createTestSession('wrong')} className="w-full" variant="outline">
              创建错题测试会话
            </Button>
            <Button onClick={() => createTestSession('favorites')} className="w-full" variant="outline">
              创建收藏测试会话
            </Button>
            <Button onClick={clearAllSessions} className="w-full" variant="destructive">
              清空所有会话
            </Button>
            
            {fixResult && (
              <div className="mt-3 p-3 bg-green-50 text-green-800 rounded">
                {fixResult}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>会话详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sessions.map((session, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {session.source === 'wrong' ? '🔴 错题练习' : 
                     session.source === 'favorites' ? '⭐ 收藏练习' : 
                     '📝 普通练习'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(session.startTime).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-1">
                  已答: {session.questionsAnswered}/{session.totalQuestions || '?'} | 
                  正确: {session.correctCount} | 
                  正确率: {session.questionsAnswered > 0 ? 
                    Math.round((session.correctCount / session.questionsAnswered) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}