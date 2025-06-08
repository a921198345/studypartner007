/**
 * 测试向量化功能（不依赖数据库）
 * 
 * 这是一个简单的测试脚本，用来验证DeepSeek API的向量化功能是否正常工作
 */

import { getTextEmbedding } from './lib/embeddings.js';

// 设置测试参数
const testQuestions = [
  "合同法中的缔约过失责任是什么？如何认定？",
  "什么是物权法中的善意取得制度？",
  "行政处罚与行政处分有什么区别？"
];

/**
 * 测试向量化功能
 */
async function testEmbedding() {
  console.log('===============================');
  console.log('开始测试向量化功能');
  console.log('===============================');
  
  try {
    // 检查API密钥
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('错误: 未设置DEEPSEEK_API_KEY环境变量');
      return;
    }
    
    // 逐一测试问题向量化
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n测试问题 #${i + 1}: "${question}"`);
      
      // 计时
      const startTime = Date.now();
      console.log('正在向量化...');
      
      const vector = await getTextEmbedding(question);
      const endTime = Date.now();
      
      if (!vector) {
        console.error(`问题 #${i + 1} 向量化失败`);
        continue;
      }
      
      console.log(`向量化成功 (耗时 ${endTime - startTime} ms)`);
      console.log(`向量维度: ${vector.length}`);
      console.log(`前5个向量元素: [${vector.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
      
      // 测试相同文本的缓存效果
      console.log('\n测试缓存效果 (重复向量化同一问题)...');
      const cacheStart = Date.now();
      const cachedVector = await getTextEmbedding(question);
      const cacheEnd = Date.now();
      
      if (cachedVector) {
        console.log(`缓存命中 (耗时 ${cacheEnd - cacheStart} ms)`);
        
        // 验证两次结果相同
        const isEqual = vector.length === cachedVector.length && 
                        vector.every((val, idx) => val === cachedVector[idx]);
        
        if (isEqual) {
          console.log('验证成功: 缓存结果与原始结果相同');
        } else {
          console.error('验证失败: 缓存结果与原始结果不同');
        }
      } else {
        console.error('缓存测试失败');
      }
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 计算两个向量的余弦相似度
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error(`向量长度不匹配: ${vec1.length} vs ${vec2.length}`);
  }
  
  // 计算点积
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  
  // 计算向量的模
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  // 避免除以零
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  // 计算余弦相似度
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 测试向量相似度功能
 */
async function testVectorSimilarity() {
  console.log('\n===============================');
  console.log('测试向量相似度计算');
  console.log('===============================');
  
  try {
    // 获取所有问题的向量
    console.log('正在向量化所有测试问题...');
    const vectors = await Promise.all(testQuestions.map(q => getTextEmbedding(q)));
    
    // 计算相似度矩阵
    console.log('\n计算相似度矩阵:');
    console.log('  | ' + testQuestions.map((_, i) => `问题${i+1}`).join(' | ') + ' |');
    console.log('-'.repeat(50));
    
    for (let i = 0; i < vectors.length; i++) {
      let row = `问题${i+1} | `;
      
      for (let j = 0; j < vectors.length; j++) {
        if (vectors[i] && vectors[j]) {
          const sim = cosineSimilarity(vectors[i], vectors[j]);
          row += sim.toFixed(4).padStart(6) + ' | ';
        } else {
          row += '  N/A  | ';
        }
      }
      
      console.log(row);
    }
  } catch (error) {
    console.error('相似度测试出错:', error);
  }
}

// 开始测试
(async function() {
  try {
    console.log('开始测试向量化和相似度计算功能...');
    await testEmbedding();
    await testVectorSimilarity();
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
})(); 