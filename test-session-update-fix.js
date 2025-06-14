// 测试会话更新问题

// 模拟创建错题练习会话
function createWrongSession() {
  const session = {
    sessionId: Date.now().toString(),
    startTime: new Date().toISOString(),
    questionsAnswered: 0,
    correctCount: 0,
    totalQuestions: 11,
    source: 'wrong',
    filters: {},
    lastQuestionId: 1
  };
  
  localStorage.setItem('currentAnswerSession', JSON.stringify(session));
  console.log('创建错题练习会话:', session);
}

// 模拟答题后更新会话
function simulateAnswerQuestion(isCorrect = true) {
  const currentSessionStr = localStorage.getItem('currentAnswerSession');
  if (!currentSessionStr) {
    console.log('没有当前会话');
    return;
  }
  
  const session = JSON.parse(currentSessionStr);
  session.questionsAnswered += 1;
  if (isCorrect) {
    session.correctCount += 1;
  }
  session.lastQuestionId += 1;
  
  localStorage.setItem('currentAnswerSession', JSON.stringify(session));
  console.log('更新会话后:', session);
}

// 模拟结束会话
function endSession() {
  const currentSessionStr = localStorage.getItem('currentAnswerSession');
  if (!currentSessionStr) {
    console.log('没有当前会话需要结束');
    return;
  }
  
  const currentSession = JSON.parse(currentSessionStr);
  currentSession.endTime = new Date().toISOString();
  
  console.log('准备保存的会话:', currentSession);
  
  // 获取现有会话历史
  const sessionsStr = localStorage.getItem('answerSessions');
  let sessions = [];
  
  if (sessionsStr) {
    try {
      sessions = JSON.parse(sessionsStr);
    } catch (e) {
      console.error('解析会话历史失败:', e);
    }
  }
  
  // 添加当前会话到历史
  sessions.push(currentSession);
  
  // 保留最近30个会话
  if (sessions.length > 30) {
    sessions = sessions.slice(-30);
  }
  
  // 保存更新后的会话历史
  localStorage.setItem('answerSessions', JSON.stringify(sessions));
  
  // 清除当前会话
  localStorage.removeItem('currentAnswerSession');
  
  console.log('会话已保存，当前历史会话数:', sessions.length);
}

// 检查会话历史
function checkSessions() {
  const sessionsStr = localStorage.getItem('answerSessions');
  if (!sessionsStr) {
    console.log('没有会话历史');
    return;
  }
  
  const sessions = JSON.parse(sessionsStr);
  console.log('所有会话:', sessions);
  
  // 过滤掉未答题的会话
  const validSessions = sessions.filter(s => s.questionsAnswered > 0);
  console.log('有效会话 (已答题数>0):', validSessions);
  
  // 按来源分组
  const wrongSessions = sessions.filter(s => s.source === 'wrong');
  const favoritesSessions = sessions.filter(s => s.source === 'favorites');
  const normalSessions = sessions.filter(s => !s.source || s.source === 'all');
  
  console.log('错题会话:', wrongSessions);
  console.log('收藏会话:', favoritesSessions);
  console.log('普通会话:', normalSessions);
}

// 运行测试
console.log('=== 测试错题练习会话保存 ===');
console.log('1. 创建错题会话');
createWrongSession();

console.log('\n2. 模拟答题');
simulateAnswerQuestion(true);
simulateAnswerQuestion(false);
simulateAnswerQuestion(true);

console.log('\n3. 结束会话');
endSession();

console.log('\n4. 检查会话历史');
checkSessions();