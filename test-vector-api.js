/**
 * 测试向量化和知识库检索功能
 * 
 * 这是一个简单的测试脚本，用来验证我们的向量化和知识库检索功能是否正常工作
 */

// 引入需要的模块
import { getTextEmbedding } from './lib/embeddings.js';
import { cosineSimilarity } from './lib/vector-search.js';

// 模拟知识库数据
const MOCK_CHUNKS = [
  {
    id: 1,
    subject: '民法',
    original_text: '缔约过失责任是指在合同订立过程中，一方因欺诈、隐瞒或者其他故意或者重大过失行为致使合同无效、可撤销或者不成立，给对方造成损失的赔偿责任。根据《民法典》第五百条规定，缔约过失责任的认定需要满足主观过失、造成损害且有因果关系等要件。',
    path: '民法/合同法/缔约过失责任',
  },
  {
    id: 2,
    subject: '民法',
    original_text: '善意取得制度是指无处分权人将不动产或者动产转让给善意第三人，第三人在不知道转让人无处分权的情况下，依照法律规定可以取得该不动产或者动产的所有权的制度。《民法典》第三百一十一条对此有明确规定。',
    path: '民法/物权法/善意取得',
  },
  {
    id: 3,
    subject: '行政法',
    original_text: '行政处罚是行政机关对违反行政法规定的公民、法人或者其他组织，依法给予的制裁，主要包括罚款、吊销许可等。而行政处分是对公职人员的违纪行为进行的惩戒，如警告、记过、降级等。两者适用对象和法律依据不同。',
    path: '行政法/行政处罚与处分区别',
  },
  {
    id: 4,
    subject: '民法',
    original_text: '合同法是民法的重要组成部分，主要规范平等主体之间的契约关系。合同的成立要件包括主体适格、意思表示真实、内容合法等。合同一经成立，即对当事人产生法律约束力，当事人应当按照约定履行自己的义务。',
    path: '民法/合同法/概述',
  },
  {
    id: 5,
    subject: '民法',
    original_text: '违约责任是指合同的当事人不履行合同义务或者履行合同义务不符合约定，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。根据《民法典》规定，违约方赔偿损失范围为另一方因此所受到的损失和所失利益。',
    path: '民法/合同法/违约责任',
  }
];

// 设置测试参数
const testQuestion = "合同法中的缔约过失责任是什么？如何认定？";
const subject = "民法";

/**
 * 模拟向量搜索
 */
async function mockVectorSearch(questionVector, subject, topK = 3) {
  console.log(`模拟向量搜索 - 学科: ${subject}, 结果数量: ${topK}`);
  
  // 获取相关学科的知识块
  const subjectChunks = MOCK_CHUNKS.filter(chunk => chunk.subject === subject);
  
  // 构造相似度结果
  const results = subjectChunks.map(chunk => {
    // 根据内容相关性模拟不同的相似度
    let similarity = 0;
    
    if (chunk.original_text.includes('缔约过失责任')) {
      similarity = 0.92; // 高相关
    } else if (chunk.original_text.includes('合同') && chunk.original_text.includes('责任')) {
      similarity = 0.78; // 中高相关
    } else if (chunk.original_text.includes('合同')) {
      similarity = 0.65; // 中相关
    } else {
      similarity = 0.35; // 低相关
    }
    
    return {
      ...chunk,
      similarity
    };
  });
  
  // 按相似度排序并限制结果数量
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * 模拟关键词搜索
 */
async function mockKeywordSearch(question, subject, topK = 3) {
  console.log(`模拟关键词搜索 - 学科: ${subject}, 结果数量: ${topK}`);
  
  // 提取关键词
  const keywords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  console.log('提取关键词:', keywords);
  
  // 获取相关学科的知识块
  const subjectChunks = MOCK_CHUNKS.filter(chunk => chunk.subject === subject);
  
  // 构造相似度结果
  const results = subjectChunks.map(chunk => {
    // 计算包含的关键词数量
    const text = chunk.original_text.toLowerCase();
    const matchCount = keywords.filter(word => text.includes(word)).length;
    const similarity = matchCount / Math.max(1, keywords.length);
    
    return {
      ...chunk,
      similarity
    };
  });
  
  // 按相似度排序并限制结果数量
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * 测试知识库检索流程
 */
async function testVectorSearch() {
  console.log('===============================');
  console.log('开始测试知识库检索功能');
  console.log('===============================');
  console.log(`测试问题: "${testQuestion}"`);
  console.log(`学科: ${subject}`);
  
  try {
    // 1. 向量化测试问题
    console.log('\n正在向量化问题...');
    const startTime = Date.now();
    const questionVector = await getTextEmbedding(testQuestion);
    const endTime = Date.now();
    
    if (!questionVector) {
      console.log('问题向量化失败，将使用关键词搜索作为回退方案');
      await testKeywordSearch();
      return;
    }
    
    console.log(`向量化成功 (耗时 ${endTime - startTime} ms)`);
    console.log(`向量维度: ${questionVector.length}`);
    
    // 2. 搜索相关知识块
    console.log('\n正在通过向量相似度搜索知识库...');
    const searchStartTime = Date.now();
    
    // 使用模拟搜索
    const results = await mockVectorSearch(questionVector, subject, 3);
    
    const searchEndTime = Date.now();
    
    console.log(`搜索完成 (耗时 ${searchEndTime - searchStartTime} ms)`);
    console.log(`找到 ${results.length} 个相关知识块:`);
    
    // 3. 展示搜索结果
    results.forEach((chunk, index) => {
      console.log(`\n结果 #${index + 1} (相似度: ${chunk.similarity.toFixed(4)}):`);
      console.log('-'.repeat(50));
      console.log(chunk.original_text);
      console.log('-'.repeat(50));
    });
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

/**
 * 测试关键词搜索功能
 */
async function testKeywordSearch() {
  console.log('\n===============================');
  console.log('测试关键词搜索功能 (备用方案)');
  console.log('===============================');
  
  try {
    // 搜索相关知识块
    const results = await mockKeywordSearch(testQuestion, subject, 3);
    
    console.log(`找到 ${results.length} 个相关知识块:`);
    
    // 展示搜索结果
    results.forEach((chunk, index) => {
      console.log(`\n结果 #${index + 1} (匹配度: ${chunk.similarity.toFixed(4)}):`);
      console.log('-'.repeat(50));
      console.log(chunk.original_text);
      console.log('-'.repeat(50));
    });
  } catch (error) {
    console.error('关键词搜索测试出错:', error);
  }
}

/**
 * 测试向量相似度功能
 */
async function testVectorSimilarity() {
  console.log('\n===============================');
  console.log('测试向量相似度计算');
  console.log('===============================');
  
  try {
    // 一些测试向量
    const vectors = [
      await getTextEmbedding("合同法中的缔约过失责任是什么？"),
      await getTextEmbedding("什么是合同法中的缔约过失责任？"),
      await getTextEmbedding("物权法中的善意取得制度是什么？"),
      await getTextEmbedding("行政处罚和行政处分有什么区别？")
    ];
    
    // 创建向量标签
    const labels = [
      "缔约过失责任问题1",
      "缔约过失责任问题2",
      "善意取得问题",
      "行政处罚问题"
    ];
    
    // 计算相似度矩阵
    console.log('\n计算相似度矩阵:');
    console.log('  | ' + labels.map(l => l.substring(0, 8)).join(' | ') + ' |');
    console.log('-'.repeat(70));
    
    for (let i = 0; i < vectors.length; i++) {
      let row = `${labels[i].substring(0, 8)} | `;
      
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
    // 确保使用模拟向量
    process.env.MOCK_EMBEDDINGS = 'true';
    
    console.log('开始测试向量化和知识库检索功能...');
    await testVectorSearch();
    await testVectorSimilarity();
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
})(); 