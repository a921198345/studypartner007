// 测试会话管理功能

// 查看当前会话
function checkCurrentSession() {
  const currentSession = localStorage.getItem('currentAnswerSession');
  console.log('当前会话:', currentSession ? JSON.parse(currentSession) : '无');
}

// 查看会话历史
function checkSessionHistory() {
  const sessions = localStorage.getItem('answerSessions');
  console.log('会话历史:', sessions ? JSON.parse(sessions) : '无');
}

// 查看答题历史
function checkAnswerHistory() {
  const wrongHistory = localStorage.getItem('wrongAnswerHistory');
  const favoriteHistory = localStorage.getItem('favoriteAnswerHistory');
  const normalHistory = localStorage.getItem('answerHistory');
  
  console.log('答题历史:', {
    普通模式: normalHistory ? JSON.parse(normalHistory) : '无',
    错题模式: wrongHistory ? JSON.parse(wrongHistory) : '无',
    收藏模式: favoriteHistory ? JSON.parse(favoriteHistory) : '无'
  });
}

// 创建测试会话
function createTestSession(source = 'wrong') {
  const session = {
    sessionId: Date.now().toString(),
    startTime: new Date().toISOString(),
    questionsAnswered: 5,
    correctCount: 3,
    totalQuestions: 10,
    source: source,
    filters: {},
    lastQuestionId: 123
  };
  
  localStorage.setItem('currentAnswerSession', JSON.stringify(session));
  console.log('创建测试会话:', session);
}

// 执行测试
console.log('=== 会话管理测试 ===');
checkCurrentSession();
checkSessionHistory();
checkAnswerHistory();

// 如果需要创建测试会话，取消下面的注释
// createTestSession('wrong');