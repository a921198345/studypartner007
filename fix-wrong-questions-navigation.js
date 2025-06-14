// 修复错题导航问题

// 问题分析：
// 1. 错题导航时 currentQuestionIndex 可能不准确
// 2. 错题列表和实际导航的题目ID不匹配
// 3. wrongIndex 参数管理混乱

// 解决方案：
// 在 app/question-bank/[id]/page.tsx 中修改

const fixedNavigationLogic = `
// 1. 在组件初始化时正确设置错题列表
useEffect(() => {
  if (source === 'wrong') {
    // 从localStorage获取错题列表
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    if (wrongQuestionsStr) {
      try {
        const wrongQuestions = JSON.parse(wrongQuestionsStr);
        // 保存到状态中，确保导航时使用同一份列表
        setFilteredQuestions(wrongQuestions.map(q => ({
          id: q.id,
          question_code: q.question_code || null
        })));
        
        // 设置当前索引
        const wrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
        setCurrentQuestionIndex(wrongIndex);
        
        console.log(\`错题模式：共\${wrongQuestions.length}题，当前第\${wrongIndex + 1}题\`);
      } catch (e) {
        console.error('解析错题列表失败:', e);
      }
    }
  }
}, [source, questionId]);

// 2. 修改 handleNextQuestion 中的错题导航逻辑
if (source === 'wrong') {
  // 使用固定的wrongIndex来导航
  const currentWrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
  const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
  
  if (wrongQuestionsStr) {
    try {
      const wrongQuestions = JSON.parse(wrongQuestionsStr);
      
      if (currentWrongIndex < wrongQuestions.length - 1) {
        const nextIndex = currentWrongIndex + 1;
        const nextQuestion = wrongQuestions[nextIndex];
        
        console.log(\`错题导航：从索引\${currentWrongIndex}到\${nextIndex}，题目ID: \${nextQuestion.id}\`);
        
        const nextParams = new URLSearchParams({
          source: 'wrong',
          wrongIndex: nextIndex.toString(),
          continue: 'true'
        });
        
        router.push(\`/question-bank/\${nextQuestion.id}?\${nextParams.toString()}\`);
        return;
      } else {
        console.log('已经是最后一道错题');
        // 可以提示用户或跳转到其他页面
      }
    } catch (e) {
      console.error('错题导航失败:', e);
    }
  }
}

// 3. 修改 handlePrevQuestion 中的错题导航逻辑
if (source === 'wrong') {
  const currentWrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
  const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
  
  if (wrongQuestionsStr) {
    try {
      const wrongQuestions = JSON.parse(wrongQuestionsStr);
      
      if (currentWrongIndex > 0) {
        const prevIndex = currentWrongIndex - 1;
        const prevQuestion = wrongQuestions[prevIndex];
        
        console.log(\`错题导航：从索引\${currentWrongIndex}到\${prevIndex}，题目ID: \${prevQuestion.id}\`);
        
        const prevParams = new URLSearchParams({
          source: 'wrong',
          wrongIndex: prevIndex.toString(),
          continue: 'true'
        });
        
        router.push(\`/question-bank/\${prevQuestion.id}?\${prevParams.toString()}\`);
        return;
      } else {
        console.log('已经是第一道错题');
      }
    } catch (e) {
      console.error('错题导航失败:', e);
    }
  }
}
`;

console.log('错题导航修复方案：');
console.log(fixedNavigationLogic);

// 创建一个测试函数
function testWrongQuestionsNavigation() {
  // 模拟错题列表
  const mockWrongQuestions = [
    { id: 5, question_code: '2023-刑法-001' },
    { id: 12, question_code: '2023-刑法-002' },
    { id: 23, question_code: '2023-民法-001' },
    { id: 45, question_code: '2023-民法-002' },
    { id: 67, question_code: '2023-行政法-001' }
  ];
  
  localStorage.setItem('wrongQuestions', JSON.stringify(mockWrongQuestions));
  
  console.log('测试错题导航：');
  console.log('错题列表:', mockWrongQuestions);
  
  // 模拟导航
  let currentIndex = 0;
  
  console.log('\n测试下一题导航：');
  for (let i = 0; i < mockWrongQuestions.length; i++) {
    const current = mockWrongQuestions[i];
    const next = mockWrongQuestions[i + 1];
    
    if (next) {
      console.log(`从 题目#${current.id}(索引${i}) -> 题目#${next.id}(索引${i + 1})`);
    } else {
      console.log(`题目#${current.id}(索引${i}) 是最后一题`);
    }
  }
  
  console.log('\n测试上一题导航：');
  for (let i = mockWrongQuestions.length - 1; i >= 0; i--) {
    const current = mockWrongQuestions[i];
    const prev = mockWrongQuestions[i - 1];
    
    if (prev) {
      console.log(`从 题目#${current.id}(索引${i}) -> 题目#${prev.id}(索引${i - 1})`);
    } else {
      console.log(`题目#${current.id}(索引${i}) 是第一题`);
    }
  }
}

// 执行测试
testWrongQuestionsNavigation();