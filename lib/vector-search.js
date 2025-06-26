/**
 * 向量搜索模块 - vector-search.js
 * 用于在向量数据库中进行相似度搜索
 */

import { query as mysqlQuery } from './db.js'; // 导入MySQL查询函数

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

    // 获取指定学科的所有向量块（使用law_name字段）
    const chunks = await mysqlQuery(
      `SELECT id, law_name, original_text, source_document_name, vector_embedding as embedding
       FROM vector_chunks
       WHERE law_name LIKE ? OR law_name IS NULL
       LIMIT 1000`, // 限制数量以避免内存问题
      [`%${subject}%`]
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
        // 处理二进制向量数据
        let embedding;
        try {
          if (Buffer.isBuffer(chunk.embedding)) {
            // 假设是float32数组的二进制表示
            const buffer = chunk.embedding;
            const floatArray = [];
            for (let i = 0; i < buffer.length; i += 4) {
              floatArray.push(buffer.readFloatLE(i));
            }
            embedding = floatArray;
          } else if (typeof chunk.embedding === 'string') {
            embedding = JSON.parse(chunk.embedding);
          } else {
            embedding = chunk.embedding;
          }
          
          if (!Array.isArray(embedding) || embedding.length === 0) {
            console.warn(`知识块ID ${chunk.id} 的向量格式无效`);
            return null;
          }
        } catch (error) {
          console.error(`解析知识块 ${chunk.id} 的向量时出错:`, error);
          return null;
        }
        
        try {
          // 计算相似度
          const similarity = cosineSimilarity(questionVector, embedding);
          
          return {
            id: chunk.id,
            subject: chunk.law_name || '通用',
            original_text: chunk.original_text,
            path: chunk.source_document_name,
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
 * @param {boolean} strictSubjectMatch - 是否严格匹配学科
 * @param {Array<string>} parentNodes - 父级知识点数组，用于范围限制
 * @returns {Promise<Array<Object>>} - 最相关的知识块
 */
export async function searchByKeywords(questionText, subject, topK = 3, strictSubjectMatch = false, parentNodes = []) {
  try {
    if (!questionText || typeof questionText !== 'string') {
      return [];
    }
    
    // 提取关键词（改进的分词逻辑）
    // 1. 先提取核心关键词（去除括号和数字）
    let coreText = questionText
      .replace(/[（）()]/g, ' ')  // 移除括号
      .replace(/^\d+/, '')  // 移除开头的数字
      .replace(/^[一二三四五六七八九十百千万]+/, '')  // 移除中文数字
      .trim();
    
    // 2. 如果处理后的文本为空，使用原文本
    if (!coreText) {
      coreText = questionText;
    }
    
    // 3. 提取关键词
    const words = coreText
      .replace(/[,.?!;:，。？！；：]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 1)  // 降低长度要求
      .slice(0, 8);  // 增加关键词数量以提高匹配率
    
    // 4. 如果核心词很短（如"继承"），直接使用
    if (coreText.length <= 4 && coreText.length > 0) {
      words.unshift(coreText);  // 将完整的核心词加到开头
    }
    
    // 5. 添加父级知识点关键词以增强相关性
    if (parentNodes && parentNodes.length > 0) {
      // 只使用最近的2个父级节点，避免关键词过多
      const relevantParents = parentNodes.slice(-2);
      words.push(...relevantParents);
      console.log('父级知识点关键词:', relevantParents);
    }
    
    if (words.length === 0) {
      return [];
    }
    console.log('使用MySQL进行关键词搜索:', words);

    // 构建查询条件和参数
    const likeConditions = words.map(() => 'original_text LIKE ?').join(' OR ');
    const queryParams = words.map(word => `%${word}%`);
    
    let sqlQuery;

    if (strictSubjectMatch) {
      sqlQuery = `
        SELECT id, law_name, original_text, source_document_name
        FROM vector_chunks
        WHERE (${likeConditions}) AND (law_name = ? OR law_name LIKE ?)
        ORDER BY 
          CASE 
            WHEN law_name = ? THEN 1
            ELSE 2
          END,
          LENGTH(original_text) ASC
        LIMIT ?
      `;
      queryParams.push(subject, `%${subject}%`, subject, topK * 2);
    } else {
      sqlQuery = `
        SELECT id, law_name, original_text, source_document_name
        FROM vector_chunks
        WHERE (${likeConditions})
        ORDER BY 
          CASE 
            WHEN law_name = ? THEN 1
            WHEN law_name LIKE ? THEN 2
            ELSE 3
          END,
          LENGTH(original_text) ASC
        LIMIT ?
      `;
      queryParams.push(subject, `%${subject}%`, topK * 2);
    }

    const results = await mysqlQuery(sqlQuery, queryParams);
    
    console.log(`从MySQL找到 ${results.length} 条记录`);

    if (!results || results.length === 0) {
      return [];
    }

    // 去重和格式化结果
    const uniqueResults = [];
    const seen = new Set();
    for (const result of results) {
      if (!seen.has(result.original_text)) {
        seen.add(result.original_text);
        uniqueResults.push(result);
      }
    }

    return uniqueResults.slice(0, topK).map(row => ({
      id: row.id,
      original_text: row.original_text,
      path: row.source_document_name,
      subject: row.law_name,
      similarity: 1.0 // 关键词匹配，可以设为1.0或基于匹配度计算
    }));

  } catch (error) {
    console.error('通过MySQL进行关键词搜索失败:', error);
    return [];
  }
}

export default {
  cosineSimilarity,
  searchVectorChunks,
  searchByKeywords
}; 