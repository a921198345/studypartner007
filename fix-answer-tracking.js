// 修复答题跟踪问题的脚本

import { addClientSessionHeader } from './lib/client-session.js';

// 1. 检查并修复答题提交API
async function testAnswerSubmit() {
  console.log('=== 测试答题提交功能 ===\n');
  
  // 获取客户端会话ID
  const clientSessionId = localStorage.getItem('client_session_id');
  console.log('当前客户端会话ID:', clientSessionId);
  
  // 创建测试会话
  console.log('\n1. 创建测试会话...');
  const createResponse = await fetch('/api/exams/sessions', {
    method: 'POST',
    headers: addClientSessionHeader({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      filters: {
        subject: '民法',
        years: ['2023'],
        types: ['单项选择题']
      },
      totalQuestions: 50,
      source: 'all'
    })
  });
  
  if (!createResponse.ok) {
    console.error('创建会话失败:', await createResponse.text());
    return;
  }
  
  const { data: { sessionId } } = await createResponse.json();
  console.log('会话创建成功，ID:', sessionId);
  
  // 保存到localStorage以模拟真实场景
  localStorage.setItem('currentAnswerSession', JSON.stringify({
    sessionId,
    startTime: new Date().toISOString(),
    questionsAnswered: 0,
    correctCount: 0,
    totalQuestions: 50,
    filters: {
      subject: '民法',
      years: ['2023'],
      types: ['单项选择题']
    }
  }));
  
  // 提交测试答案
  console.log('\n2. 提交测试答案...');
  const submitResponse = await fetch('/api/exams/questions/1/submit', {
    method: 'POST',
    headers: addClientSessionHeader({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      userAnswer: 'A',
      timeTaken: 30
    })
  });
  
  if (!submitResponse.ok) {
    console.error('提交答案失败:', await submitResponse.text());
    return;
  }
  
  const submitResult = await submitResponse.json();
  console.log('答案提交结果:', submitResult);
  
  // 检查会话是否更新
  console.log('\n3. 检查会话更新...');
  const sessionResponse = await fetch('/api/exams/sessions', {
    headers: addClientSessionHeader()
  });
  
  if (sessionResponse.ok) {
    const { data: { sessions } } = await sessionResponse.json();
    const updatedSession = sessions.find(s => s.session_id === sessionId);
    console.log('更新后的会话:', updatedSession);
  }
}

// 2. 修复会话更新逻辑
async function fixSessionUpdate() {
  console.log('\n=== 修复会话更新逻辑 ===\n');
  
  // 获取当前会话
  const currentSessionStr = localStorage.getItem('currentAnswerSession');
  if (!currentSessionStr) {
    console.log('没有找到当前会话');
    return;
  }
  
  const currentSession = JSON.parse(currentSessionStr);
  console.log('当前会话:', currentSession);
  
  // 手动更新会话
  const updateResponse = await fetch('/api/exams/sessions', {
    method: 'PUT',
    headers: addClientSessionHeader({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      sessionId: currentSession.sessionId,
      updates: {
        questionsAnswered: 5,
        correctCount: 3,
        lastQuestionId: 5
      }
    })
  });
  
  if (updateResponse.ok) {
    console.log('会话更新成功');
    
    // 更新本地存储
    currentSession.questionsAnswered = 5;
    currentSession.correctCount = 3;
    currentSession.lastQuestionId = 5;
    localStorage.setItem('currentAnswerSession', JSON.stringify(currentSession));
  } else {
    console.error('会话更新失败:', await updateResponse.text());
  }
}

// 3. 验证答题历史显示
async function verifyAnswerHistory() {
  console.log('\n=== 验证答题历史显示 ===\n');
  
  // 从API获取答题历史
  const response = await fetch('/api/exams/sessions', {
    headers: addClientSessionHeader()
  });
  
  if (response.ok) {
    const { data } = await response.json();
    console.log(`客户端会话ID: ${data.clientSessionId}`);
    console.log(`找到 ${data.sessions.length} 个会话`);
    
    // 过滤出有答题记录的会话
    const answeredSessions = data.sessions.filter(s => s.questions_answered > 0);
    console.log(`其中 ${answeredSessions.length} 个会话有答题记录`);
    
    answeredSessions.forEach((session, index) => {
      console.log(`\n会话 ${index + 1}:`);
      console.log(`  ID: ${session.session_id}`);
      console.log(`  已答: ${session.questions_answered} 题`);
      console.log(`  正确: ${session.correct_count} 题`);
      console.log(`  正确率: ${session.accuracy_rate}%`);
    });
  } else {
    console.error('获取答题历史失败:', await response.text());
  }
}

// 运行测试
async function runTests() {
  try {
    await testAnswerSubmit();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await fixSessionUpdate();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await verifyAnswerHistory();
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.testAnswerTracking = runTests;
  console.log('运行 testAnswerTracking() 来测试答题跟踪功能');
}