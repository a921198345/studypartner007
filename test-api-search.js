// 测试搜索API
async function testSearch() {
  console.log('测试搜索API...\n');
  
  // 测试用例
  const testCases = [
    { search: '合同', desc: '搜索"合同"' },
    { search: '侵权', desc: '搜索"侵权"' },
    { search: '合同', subject: '民法', desc: '在民法中搜索"合同"' },
    { search: '不存在的内容xyz', desc: '搜索不存在的内容' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n========== ${testCase.desc} ==========`);
    
    const params = new URLSearchParams({
      search: testCase.search,
      page: '1',
      limit: '5'
    });
    
    if (testCase.subject) {
      params.append('subject', testCase.subject);
    }
    
    const url = `http://localhost:3000/api/exams/questions?${params.toString()}`;
    console.log('请求URL:', url);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        console.log(`找到 ${data.data.pagination.total} 条结果`);
        console.log('前几条结果:');
        data.data.questions.slice(0, 3).forEach((q, i) => {
          console.log(`${i + 1}. [${q.subject}] ${q.question_text.substring(0, 50)}...`);
        });
      } else {
        console.error('搜索失败:', data.message);
      }
    } catch (error) {
      console.error('请求错误:', error.message);
    }
  }
}

// 运行测试
testSearch().catch(console.error);