// 修复会话追踪问题
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 这个脚本用于修复客户端会话ID追踪问题
console.log(`
=== 会话追踪问题修复说明 ===

问题原因：
1. 客户端会话ID (client_session_id) 在每次请求时都重新生成，导致无法关联之前的答题记录
2. Cookie设置和读取不一致，导致答题历史无法显示

解决方案：
1. 修改 getClientSessionId 函数，确保会话ID持久化
2. 在前端添加会话ID管理逻辑
3. 确保答题记录正确关联到会话ID

实施步骤：
1. 更新 API 路由，改进会话ID管理
2. 在前端添加会话ID持久化逻辑
3. 修复错题练习的导航问题
`);

// 生成修复文件
const apiRoutesFix = `// 修改 app/api/exams/sessions/route.js 的 getClientSessionId 函数

// 改进后的获取客户端Session ID函数
function getClientSessionId(request) {
  // 1. 先从请求头获取
  const headersList = headers();
  const clientSessionHeader = headersList.get('x-client-session-id');
  if (clientSessionHeader) {
    return clientSessionHeader;
  }
  
  // 2. 从cookie获取
  const cookieHeader = headersList.get('cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/client_session_id=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1];
    }
  }
  
  // 3. 从查询参数获取（备用）
  if (request) {
    const { searchParams } = new URL(request.url);
    const urlSessionId = searchParams.get('client_session_id');
    if (urlSessionId) {
      return urlSessionId;
    }
  }
  
  // 4. 生成新的ID（只在确实没有的情况下）
  return \`client_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
}`;

const clientSessionManager = `// 创建新文件: lib/client-session.js

// 客户端会话管理
const CLIENT_SESSION_KEY = 'client_session_id';
const SESSION_DURATION = 365 * 24 * 60 * 60 * 1000; // 1年

export function getClientSessionId() {
  // 1. 先从 localStorage 获取
  let sessionId = localStorage.getItem(CLIENT_SESSION_KEY);
  
  // 2. 如果没有，检查 sessionStorage
  if (!sessionId) {
    sessionId = sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (sessionId) {
      // 迁移到 localStorage
      localStorage.setItem(CLIENT_SESSION_KEY, sessionId);
    }
  }
  
  // 3. 如果还是没有，生成新的
  if (!sessionId) {
    sessionId = \`client_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    localStorage.setItem(CLIENT_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// 在API请求中自动添加客户端会话ID
export function addClientSessionHeader(headers = {}) {
  const sessionId = getClientSessionId();
  return {
    ...headers,
    'X-Client-Session-Id': sessionId
  };
}`;

const answerSessionsFix = `// 修改 lib/answer-sessions.js
// 在所有 fetch 请求中添加客户端会话ID

import { addClientSessionHeader } from './client-session';

// 修改 createAnswerSession 函数
export async function createAnswerSession(filters = {}, totalQuestions = 0, source = 'all') {
  const sessionId = Date.now().toString()
  const session = {
    sessionId,
    startTime: new Date().toISOString(),
    questionsAnswered: 0,
    correctCount: 0,
    totalQuestions: totalQuestions || 0,
    source: source,
    filters: {
      subject: filters.subject || 'all',
      years: filters.years || ['all'],
      types: filters.types || ['全部题型'],
      search: filters.search || ''
    },
    lastQuestionId: 1
  }
  
  localStorage.setItem('currentAnswerSession', JSON.stringify(session))
  
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
      session.sessionId = result.data.sessionId
      localStorage.setItem('currentAnswerSession', JSON.stringify(session))
    }
  } catch (error) {
    console.error('保存会话到数据库失败:', error)
  }
  
  return session
}`;

const wrongQuestionsNavigationFix = `// 修复错题练习导航问题
// 在 app/question-bank/[id]/page.tsx 中修改 handleNextQuestion 函数

// 修复错题导航逻辑
if (source === 'wrong') {
  // 确保错题列表存在且有效
  const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
  if (wrongQuestionsStr) {
    try {
      const wrongQuestions = JSON.parse(wrongQuestionsStr);
      // 使用固定的错题列表顺序，避免跳跃
      const currentWrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
      
      if (currentWrongIndex < wrongQuestions.length - 1) {
        const nextIndex = currentWrongIndex + 1;
        const nextQuestion = wrongQuestions[nextIndex];
        
        currentParams.set('source', 'wrong');
        currentParams.set('wrongIndex', nextIndex.toString());
        currentParams.set('continue', 'true');
        
        router.push(\`/question-bank/\${nextQuestion.id}?\${currentParams.toString()}\`);
        return;
      }
    } catch (e) {
      console.error('解析错题列表失败:', e);
    }
  }
}`;

console.log('\n生成的修复代码：\n');
console.log('1. API路由修复：\n', apiRoutesFix);
console.log('\n2. 客户端会话管理：\n', clientSessionManager);
console.log('\n3. 答题会话修复：\n', answerSessionsFix);
console.log('\n4. 错题导航修复：\n', wrongQuestionsNavigationFix);

console.log('\n请按照以上代码进行修改，确保：');
console.log('1. 客户端会话ID能够持久化');
console.log('2. API请求携带正确的会话ID');
console.log('3. 错题导航使用固定的索引顺序');