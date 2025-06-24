// 测试AI增强搜索功能的脚本
import { AIKeywordProcessor } from './lib/ai-keyword-processor.js';

async function testAIKeywordProcessor() {
  console.log('=== 测试AI关键词处理器 ===\n');
  
  // 测试用例
  const testCases = [
    '30婚姻家庭',
    '1财产继承',
    '15物权法',
    '合同的保全',
    '侵权责任',
    '（12）债权债务'
  ];
  
  for (const keyword of testCases) {
    console.log(`\n处理关键词: "${keyword}"`);
    const result = AIKeywordProcessor.processKeyword(keyword);
    
    console.log('核心概念:', result.core);
    console.log('扩展关键词:', result.expanded);
    console.log('搜索模式数:', result.searchPatterns.length);
    console.log('搜索模式:', result.searchPatterns.slice(0, 5).join(', '), 
                result.searchPatterns.length > 5 ? '...' : '');
  }
}

async function testSearchAPI() {
  console.log('\n\n=== 测试搜索API ===\n');
  
  const testSearches = [
    { keywords: ['30婚姻家庭'], subject: '民法' },
    { keywords: ['婚姻'], subject: '民法' },
    { keywords: ['继承'], subject: '民法' },
    { keywords: ['合同'], subject: '民法' }
  ];
  
  for (const search of testSearches) {
    console.log(`\n搜索: ${search.keywords.join(', ')} (${search.subject || '全部科目'})`);
    
    try {
      const response = await fetch('http://localhost:3000/api/exams/questions/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: search.keywords,
          subject: search.subject,
          page: 1,
          limit: 5
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`找到 ${data.data.pagination.total} 条结果`);
        if (data.data.questions.length > 0) {
          console.log('前几条结果:');
          data.data.questions.slice(0, 3).forEach((q, i) => {
            console.log(`  ${i + 1}. [${q.question_code}] ${q.question_text.substring(0, 50)}...`);
            console.log(`     匹配: ${q.matched_keyword} | 原始: ${q.original_keyword}`);
          });
        }
      } else {
        console.log('搜索失败:', data.message);
      }
    } catch (error) {
      console.log('请求错误:', error.message);
    }
  }
}

// 运行测试
console.log('开始测试AI增强搜索功能...\n');

testAIKeywordProcessor()
  .then(() => testSearchAPI())
  .then(() => {
    console.log('\n\n测试完成！');
  })
  .catch(error => {
    console.error('测试出错:', error);
  });