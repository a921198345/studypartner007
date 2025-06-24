// 测试增强的关键词处理功能
import { AIKeywordProcessor } from './lib/ai-keyword-processor.js';

function testKeywordProcessing() {
  console.log('=== 测试增强的关键词处理功能 ===\n');
  
  const testCases = [
    '事后转化抢劫',
    '一客观处分行为', 
    '30婚姻家庭',
    '犯罪构成',
    '正当防卫',
    '合同的保全'
  ];
  
  for (const keyword of testCases) {
    console.log(`\n🔍 处理关键词: "${keyword}"`);
    console.log('=' + '='.repeat(keyword.length + 10));
    
    const result = AIKeywordProcessor.processKeyword(keyword);
    
    console.log(`📝 原始关键词: ${result.original}`);
    console.log(`🎯 核心概念: ${result.core}`);
    console.log(`🔄 扩展关键词: [${result.expanded.join(', ')}]`);
    console.log(`🔎 搜索模式数量: ${result.searchPatterns.length}`);
    console.log(`📋 前10个搜索模式:`);
    
    result.searchPatterns.slice(0, 10).forEach((pattern, i) => {
      console.log(`   ${i + 1}. "${pattern}"`);
    });
    
    if (result.searchPatterns.length > 10) {
      console.log(`   ... 还有 ${result.searchPatterns.length - 10} 个模式`);
    }
  }
}

async function testSearchWithProcessedKeywords() {
  console.log('\n\n=== 测试使用处理后关键词进行搜索 ===\n');
  
  const testKeyword = '事后转化抢劫';
  console.log(`🔍 测试关键词: "${testKeyword}"`);
  
  const processed = AIKeywordProcessor.processKeyword(testKeyword);
  
  console.log(`\n📊 将搜索以下模式: [${processed.searchPatterns.slice(0, 5).join(', ')}...]`);
  
  try {
    const response = await fetch('http://localhost:3000/api/exams/questions/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: [testKeyword],
        subject: '刑法',
        page: 1,
        limit: 10
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`\n✅ 搜索成功: 找到 ${data.data.pagination.total} 条结果`);
      
      if (data.data.questions.length > 0) {
        console.log('\n📋 搜索结果:');
        data.data.questions.forEach((q, i) => {
          console.log(`\n${i + 1}. [${q.question_code}] ${q.subject} | ${q.year}年`);
          console.log(`   ${q.question_text.substring(0, 80)}...`);
          console.log(`   📌 匹配关键词: ${q.matched_keyword}`);
        });
      }
    } else {
      console.log(`❌ 搜索失败: ${data.message}`);
    }
  } catch (error) {
    console.log(`🔥 请求错误: ${error.message}`);
  }
}

// 运行测试
console.log('开始测试增强的关键词处理功能...\n');

testKeywordProcessing()
  .then(() => testSearchWithProcessedKeywords())
  .then(() => {
    console.log('\n\n🎉 测试完成！');
  })
  .catch(error => {
    console.error('❌ 测试出错:', error);
  });