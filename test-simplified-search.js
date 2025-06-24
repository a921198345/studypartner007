// 测试简化后的搜索逻辑
import { AIKeywordProcessor } from './lib/ai-keyword-processor.js';

function testSimplifiedKeywordProcessing() {
  console.log('=== 测试简化后的关键词处理 ===\n');
  
  const testCases = [
    '盗窃罪与侵占罪的区分★★★★★',
    '事后转化抢劫',
    '30婚姻家庭',
    '犯罪构成',
    '平和手段（秘密性问题）'
  ];
  
  for (const keyword of testCases) {
    console.log(`\n🔍 处理关键词: "${keyword}"`);
    console.log('=' + '='.repeat(keyword.length + 10));
    
    const result = AIKeywordProcessor.processKeyword(keyword);
    
    console.log(`📝 原始关键词: ${result.original}`);
    console.log(`🎯 清理后: ${result.core}`);
    console.log(`🔑 提取的核心关键词: [${result.keywords.join(', ')}]`);
    console.log(`📊 关键词数量: ${result.keywords.length}`);
  }
}

async function testSimplifiedSearch() {
  console.log('\n\n=== 测试简化搜索API ===\n');
  
  const testKeyword = '盗窃罪与侵占罪的区分★★★★★';
  console.log(`🔍 测试关键词: "${testKeyword}"`);
  
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
        console.log('\n📋 搜索结果预览:');
        data.data.questions.slice(0, 5).forEach((q, i) => {
          console.log(`\n${i + 1}. [${q.question_code}] ${q.subject} | ${q.year}年`);
          console.log(`   ${q.question_text.substring(0, 60)}...`);
          console.log(`   📌 匹配关键词: ${q.matched_keyword}`);
          console.log(`   🎯 相关性分数: ${q.relevance_score}`);
        });
      }
      
      // 显示调试信息
      if (data.data.debug) {
        console.log('\n📊 调试信息:');
        console.log(`   去重前: ${data.data.debug.total_before_dedup}`);
        console.log(`   去重后: ${data.data.debug.total_after_dedup}`);
      }
    } else {
      console.log(`❌ 搜索失败: ${data.message}`);
    }
  } catch (error) {
    console.log(`🔥 请求错误: ${error.message}`);
  }
}

// 运行测试
console.log('开始测试简化后的搜索功能...\n');

testSimplifiedKeywordProcessing();

// 延迟执行API测试，确保服务器响应
setTimeout(() => {
  testSimplifiedSearch().then(() => {
    console.log('\n\n🎉 测试完成！');
  }).catch(error => {
    console.error('❌ 测试出错:', error);
  });
}, 1000);