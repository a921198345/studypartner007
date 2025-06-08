/**
 * 向量搜索模块 - vector-search.js
 * 用于在向量数据库中进行相似度搜索
 */

import { query } from './db.js';

/**
 * 计算两个向量之间的余弦相似度
 * @param {Array<number>} vec1 - 第一个向量
 * @param {Array<number>} vec2 - 第二个向量
 * @returns {number} - 余弦相似度，范围[-1, 1]，值越高表示越相似
 */
export function cosineSimilarity(vec1, vec2) {
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
 * 使用向量相似度搜索知识库
 * @param {string} subject - 学科名称，如"民法"
 * @param {Array<number>} questionVector - 问题的向量表示
 * @param {number} topK - 返回的最相似结果数量，默认为3
 * @returns {Promise<Array<Object>>} - 相似度最高的知识块，按相似度排序
 */
export async function searchVectorChunks(subject, questionVector, topK = 3) {
  try {
    if (!questionVector || !Array.isArray(questionVector)) {
      throw new Error('问题向量无效');
    }

    // 获取指定学科的所有向量块
    const chunks = await query(
      `SELECT id, subject, original_text, path, embedding
       FROM vector_chunks
       WHERE subject = ?
       LIMIT 1000`, // 限制数量以避免内存问题
      [subject]
    );

    if (!chunks || chunks.length === 0) {
      console.log(`未找到学科"${subject}"的知识块`);
      return [];
    }

    console.log(`找到${chunks.length}个"${subject}"学科的知识块，计算相似度...`);

    // 计算相似度并排序
    const results = chunks
      .filter(chunk => chunk.embedding) // 确保有向量数据
      .map(chunk => {
        // 处理JSON字符串或已解析的向量
        const embedding = typeof chunk.embedding === 'string' 
          ? JSON.parse(chunk.embedding) 
          : chunk.embedding;
          
        if (!Array.isArray(embedding)) {
          console.warn(`知识块ID ${chunk.id} 的向量格式无效`);
          return null;
        }
        
        try {
          // 计算相似度
          const similarity = cosineSimilarity(questionVector, embedding);
          
          return {
            id: chunk.id,
            subject: chunk.subject,
            original_text: chunk.original_text,
            path: chunk.path,
            similarity: similarity
          };
        } catch (error) {
          console.error(`计算知识块 ${chunk.id} 的相似度时出错:`, error);
          return null;
        }
      })
      .filter(result => result !== null) // 过滤无效结果
      .sort((a, b) => b.similarity - a.similarity) // 按相似度降序排序
      .slice(0, topK); // 取相似度最高的topK个

    return results;
  } catch (error) {
    console.error('向量搜索失败:', error);
    return [];
  }
}

/**
 * 使用关键词搜索知识库（回退方案）
 * @param {string} questionText - 问题文本
 * @param {string} subject - 学科名称，如"民法"
 * @param {number} topK - 返回的最相关结果数量，默认为3
 * @returns {Promise<Array<Object>>} - 最相关的知识块
 */
export async function searchByKeywords(questionText, subject, topK = 3) {
  try {
    if (!questionText || typeof questionText !== 'string') {
      return [];
    }
    
    // 提取关键词（简单的基于空格和常见标点符号分词）
    const words = questionText
      .replace(/[,.?!;:，。？！；：]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)  // 过滤太短的词
      .slice(0, 5);  // 取前5个关键词
    
    if (words.length === 0) {
      return [];
    }
    
    // 构建查询条件
    const likeConditions = words.map(() => 'original_text LIKE ?').join(' OR ');
    const params = [
      ...words.map(word => `%${word}%`),
      subject,
      topK
    ];
    
    // 执行数据库查询
    const results = await query(
      `SELECT id, subject, original_text, path
       FROM vector_chunks
       WHERE (${likeConditions}) AND subject = ?
       LIMIT ?`,
      params
    );
    
    // 添加简单的相关度评分（包含关键词的数量）
    return results.map(chunk => {
      const text = chunk.original_text.toLowerCase();
      const matchCount = words.filter(word => text.includes(word.toLowerCase())).length;
      const similarity = matchCount / words.length;  // 简单的相似度评分
      
      return {
        ...chunk,
        similarity
      };
    }).sort((a, b) => b.similarity - a.similarity);
    
  } catch (error) {
    console.error('关键词搜索失败:', error);
    return [];
  }
}

export default {
  cosineSimilarity,
  searchVectorChunks,
  searchByKeywords
}; 