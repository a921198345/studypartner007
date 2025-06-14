// 调试AI搜索流程，找出搜索结果不一致的原因

// 模拟AI聊天页面的关键词提取和跳转
async function simulateAiChatFlow(message, answer = '') {
  console.log('=== 模拟AI聊天流程 ===');
  console.log('消息:', message);
  console.log('回答:', answer);
  
  // 1. 检测科目
  const subject = detectSubject(message + ' ' + answer);
  console.log('检测到的科目:', subject);
  
  // 2. 提取关键词（模拟RelatedQuestionsButton的逻辑）
  const keywords = await extractKeywords(message, answer);
  console.log('提取的关键词:', keywords);
  
  // 3. 构建跳转URL
  const searchParams = new URLSearchParams({
    subject: subject,
    keywords: keywords.join(','),
    source: 'ai-chat'
  });
  
  const jumpUrl = `/question-bank?${searchParams.toString()}`;
  console.log('跳转URL:', jumpUrl);
  
  // 4. 模拟题库页面接收参数并搜索
  console.log('\n=== 模拟题库页面处理 ===');
  const urlParams = new URLSearchParams(jumpUrl.split('?')[1]);
  const receivedKeywords = urlParams.get('keywords').split(',').map(k => k.trim()).filter(k => k);
  const receivedSubject = urlParams.get('subject');
  const source = urlParams.get('source');
  
  console.log('接收到的参数:', {
    keywords: receivedKeywords,
    subject: receivedSubject,
    source: source
  });
  
  // 5. 使用主关键词搜索
  const mainKeyword = receivedKeywords[0];
  console.log('使用主关键词搜索:', mainKeyword);
  
  // 6. 调用API
  const searchResults = await searchQuestions({
    subject: receivedSubject !== 'all' ? receivedSubject : undefined,
    search: mainKeyword,
    page: 1,
    limit: 10
  });
  
  return {
    keywords,
    mainKeyword,
    subject,
    results: searchResults
  };
}

// 模拟直接搜索
async function simulateDirectSearch(keyword, subject = 'all') {
  console.log('=== 模拟直接搜索 ===');
  console.log('搜索词:', keyword);
  console.log('科目:', subject);
  
  const searchResults = await searchQuestions({
    subject: subject !== 'all' ? subject : undefined,
    search: keyword,
    page: 1,
    limit: 10
  });
  
  return searchResults;
}

// 调用搜索API
async function searchQuestions(params) {
  const queryParams = new URLSearchParams();
  
  if (params.subject) {
    queryParams.append('subject', params.subject);
  }
  
  if (params.search) {
    queryParams.append('search', params.search);
  }
  
  queryParams.append('page', params.page);
  queryParams.append('limit', params.limit);
  
  console.log('API请求参数:', queryParams.toString());
  
  try {
    const response = await fetch(`/api/exams/questions?${queryParams.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`搜索结果: 找到 ${data.data.pagination.total} 道题目`);
      return data.data;
    } else {
      console.error('搜索失败:', data.message);
      return null;
    }
  } catch (error) {
    console.error('API调用失败:', error);
    return null;
  }
}

// 检测科目（复制自RelatedQuestionsButton）
function detectSubject(text) {
  const content = text.toLowerCase();
  
  const subjectKeywords = {
    '民法': ['民法', '合同', '物权', '债权', '侵权', '婚姻', '继承'],
    '刑法': ['刑法', '犯罪', '刑罚', '故意', '过失', '正当防卫', '盗窃', '抢劫', '贪污'],
    '行政法': ['行政法', '行政许可', '行政处罚', '行政强制', '行政复议'],
  };
  
  const scores = {};
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    scores[subject] = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        scores[subject] += keyword.length > 2 ? 2 : 1;
      }
    }
  }
  
  let maxScore = 0;
  let detectedSubject = '民法';
  
  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }
  
  return detectedSubject;
}

// 提取关键词（简化版）
async function extractKeywords(question, answer) {
  // 精确法律术语列表
  const preciseLegalTerms = [
    '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗', '抢夺',
    '职务侵占', '挪用资金', '敲诈勒索', '贪污', '受贿', '行贿',
    '交通肇事', '危险驾驶', '绑架', '非法拘禁',
    '正当防卫', '紧急避险', '共同犯罪', '犯罪中止', '犯罪未遂', '犯罪预备',
    '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权'
  ];
  
  const text = question.toLowerCase();
  
  // 首先检查是否包含精确法律术语
  for (const term of preciseLegalTerms) {
    if (text.includes(term.toLowerCase()) || text.includes(term + '罪')) {
      console.log('找到精确法律术语:', term);
      return [term];
    }
  }
  
  // 如果没有找到精确术语，提取最长的词
  const cleanedQuestion = question.replace(/[？?。，！、：；""''（）《》【】]/g, '').trim();
  const words = cleanedQuestion.split(/\s+/).filter(word => word.length >= 2);
  
  if (words.length > 0) {
    const longestWord = words.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    return [longestWord];
  }
  
  return ['法律'];
}

// 比较结果
function compareResults(aiResults, directResults) {
  console.log('\n=== 结果比较 ===');
  
  if (!aiResults || !directResults) {
    console.error('无法比较：有空结果');
    return;
  }
  
  const aiQuestions = aiResults.questions || [];
  const directQuestions = directResults.questions || [];
  
  console.log(`AI搜索结果数量: ${aiQuestions.length}`);
  console.log(`直接搜索结果数量: ${directQuestions.length}`);
  
  // 比较ID列表
  const aiIds = aiQuestions.map(q => q.id);
  const directIds = directQuestions.map(q => q.id);
  
  console.log('AI搜索题目ID:', aiIds);
  console.log('直接搜索题目ID:', directIds);
  
  // 找出差异
  const onlyInAi = aiIds.filter(id => !directIds.includes(id));
  const onlyInDirect = directIds.filter(id => !aiIds.includes(id));
  
  if (onlyInAi.length > 0) {
    console.log('仅在AI搜索中的题目ID:', onlyInAi);
  }
  
  if (onlyInDirect.length > 0) {
    console.log('仅在直接搜索中的题目ID:', onlyInDirect);
  }
  
  if (onlyInAi.length === 0 && onlyInDirect.length === 0) {
    console.log('✅ 搜索结果完全一致！');
  } else {
    console.log('❌ 搜索结果存在差异！');
  }
}

// 运行测试
async function runTest() {
  console.log('开始调试AI搜索流程...\n');
  
  // 测试案例
  const testCases = [
    {
      message: '什么是盗窃罪？',
      answer: '盗窃罪是指以非法占有为目的，秘密窃取公私财物的行为。',
      expectedKeyword: '盗窃'
    },
    {
      message: '正当防卫的条件是什么？',
      answer: '正当防卫需要满足五个条件...',
      expectedKeyword: '正当防卫'
    }
  ];
  
  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(50));
    console.log('测试案例:', testCase.message);
    console.log('='.repeat(50));
    
    // AI聊天流程
    const aiFlow = await simulateAiChatFlow(testCase.message, testCase.answer);
    
    // 直接搜索
    const directResults = await simulateDirectSearch(
      testCase.expectedKeyword,
      aiFlow.subject
    );
    
    // 比较结果
    compareResults(aiFlow.results, directResults);
    
    // 等待一下避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 如果在Node.js环境中运行
if (typeof window === 'undefined') {
  // Node.js环境需要安装node-fetch
  const fetch = require('node-fetch');
  global.fetch = fetch;
  
  runTest().catch(console.error);
} else {
  // 浏览器环境
  console.log('请在控制台中运行 runTest() 来开始调试');
}