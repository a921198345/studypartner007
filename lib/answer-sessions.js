// 答题会话管理
import { addClientSessionHeader } from './client-session';

// 创建新的答题会话
export async function createAnswerSession(filters = {}, totalQuestions = 0, source = 'all') {
  const sessionId = Date.now().toString()
  const session = {
    sessionId,
    startTime: new Date().toISOString(),
    questionsAnswered: 0,
    correctCount: 0,
    totalQuestions: totalQuestions || 0, // 添加总题数
    source: source, // 添加来源：all/wrong/favorites
    filters: {
      subject: filters.subject || 'all',
      years: filters.years || ['all'],
      types: filters.types || ['全部题型'],
      search: filters.search || '',
      aiKeywords: filters.aiKeywords || []
    },
    lastQuestionId: 1
  }
  
  // 保存当前会话到localStorage（作为缓存）
  localStorage.setItem('currentAnswerSession', JSON.stringify(session))
  
  // 同时保存到数据库
  try {
    const response = await fetch('/api/exams/sessions', {
      method: 'POST',
      headers: addClientSessionHeader({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        filters,
        totalQuestions,
        source
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('会话已保存到数据库:', result.data.sessionId)
      // 使用数据库返回的sessionId更新本地会话
      session.sessionId = result.data.sessionId
      localStorage.setItem('currentAnswerSession', JSON.stringify(session))
    }
  } catch (error) {
    console.error('保存会话到数据库失败:', error)
    // 继续使用本地存储，确保功能不中断
  }
  
  return session
}

// 更新当前会话
export async function updateCurrentSession(updates) {
  try {
    const currentSessionStr = localStorage.getItem('currentAnswerSession')
    if (!currentSessionStr) return
    
    const currentSession = JSON.parse(currentSessionStr)
    const updatedSession = {
      ...currentSession,
      ...updates
    }
    
    // 更新本地存储
    localStorage.setItem('currentAnswerSession', JSON.stringify(updatedSession))
    
    // 同时更新数据库
    try {
      const response = await fetch('/api/exams/sessions', {
        method: 'PUT',
        headers: addClientSessionHeader({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
          updates
        })
      })
      
      if (response.ok) {
        console.log('会话已更新到数据库')
      }
    } catch (error) {
      console.error('更新数据库会话失败:', error)
      // 继续使用本地存储，确保功能不中断
    }
    
    return updatedSession
  } catch (error) {
    console.error('更新当前会话失败:', error)
    return null
  }
}

// 结束当前会话并保存到历史
export async function endCurrentSession() {
  try {
    const currentSessionStr = localStorage.getItem('currentAnswerSession')
    if (!currentSessionStr) {
      console.log('没有当前会话需要结束')
      return
    }
    
    const currentSession = JSON.parse(currentSessionStr)
    
    // 如果会话没有答题记录，不保存
    if (!currentSession.questionsAnswered || currentSession.questionsAnswered === 0) {
      console.log('会话没有答题记录，不保存到历史:', currentSession.sessionId)
      localStorage.removeItem('currentAnswerSession')
      return
    }
    
    currentSession.endTime = new Date().toISOString()
    
    console.log('准备结束会话:', {
      sessionId: currentSession.sessionId,
      source: currentSession.source,
      questionsAnswered: currentSession.questionsAnswered,
      correctCount: currentSession.correctCount,
      totalQuestions: currentSession.totalQuestions
    })
    
    // 更新数据库中的会话结束时间
    try {
      const response = await fetch('/api/exams/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
          updates: {
            endTime: currentSession.endTime
          }
        })
      })
      
      if (response.ok) {
        console.log('会话结束时间已更新到数据库')
      }
    } catch (error) {
      console.error('更新数据库会话结束时间失败:', error)
    }
    
    // 获取现有会话历史
    const sessionsStr = localStorage.getItem('answerSessions')
    let sessions = []
    
    if (sessionsStr) {
      try {
        sessions = JSON.parse(sessionsStr)
      } catch (e) {
        console.error('解析会话历史失败:', e)
      }
    }
    
    // 添加当前会话到历史
    sessions.push(currentSession)
    
    // 保留最近30个会话
    if (sessions.length > 30) {
      sessions = sessions.slice(-30)
    }
    
    // 保存更新后的会话历史
    localStorage.setItem('answerSessions', JSON.stringify(sessions))
    
    // 清除当前会话
    localStorage.removeItem('currentAnswerSession')
    
    // 触发自定义事件，通知其他组件更新
    window.dispatchEvent(new Event('answerSessionUpdated'))
    
    return currentSession
  } catch (error) {
    console.error('结束会话失败:', error)
    return null
  }
}

// 获取当前会话
export function getCurrentSession() {
  try {
    const currentSessionStr = localStorage.getItem('currentAnswerSession')
    if (!currentSessionStr) return null
    
    return JSON.parse(currentSessionStr)
  } catch (error) {
    console.error('获取当前会话失败:', error)
    return null
  }
}

// 获取或创建会话
export async function getOrCreateSession(filters = {}, totalQuestions = 0, source = 'all') {
  let session = getCurrentSession()
  
  if (!session) {
    session = await createAnswerSession(filters, totalQuestions, source)
  } else {
    // 如果会话存在但没有source字段，补充它
    if (!session.source && source) {
      session.source = source
      localStorage.setItem('currentAnswerSession', JSON.stringify(session))
      // 同时更新数据库
      try {
        await fetch('/api/exams/sessions', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            updates: { source }
          })
        })
      } catch (error) {
        console.error('更新会话source失败:', error)
      }
    }
  }
  
  return session
}