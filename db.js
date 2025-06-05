/**
 * 数据库连接模块 - 根目录导出
 * 
 * 从lib/db.js重新导出所有功能
 */

export * from './lib/db.js';

// 导入并重新导出默认导出
import dbDefault from './lib/db.js';
export default dbDefault; 

const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  pool: { 
    min: 0, 
    max: 10 
  }
});

// 法律文档向量存储相关功能
const legalDocVectors = {
  // 保存法律文本分段和其向量
  async saveSegments(segments) {
    try {
      // 开始事务
      return await knex.transaction(async (trx) => {
        const results = [];
        
        for (const segment of segments) {
          const [id] = await trx('law_segments').insert({
            law_name: segment.metadata.law_name,
            book: segment.metadata.book || null,
            chapter: segment.metadata.chapter || null,
            section: segment.metadata.section || null,
            article: segment.metadata.article || null,
            paragraph: segment.metadata.paragraph || null,
            item: segment.metadata.item || null,
            content: segment.content,
            token_count: segment.token_count || 0,
            key_concepts: JSON.stringify(segment.key_concepts || []),
            created_at: new Date()
          });
          
          // 保存向量数据（如果存在）
          if (segment.embedding && Array.isArray(segment.embedding)) {
            await trx('law_segment_vectors').insert({
              segment_id: id,
              vector: JSON.stringify(segment.embedding),
              embedding_model: segment.embedding_model || 'unknown',
              created_at: new Date()
            });
          }
          
          results.push({
            id,
            article: segment.metadata.article,
            law_name: segment.metadata.law_name
          });
        }
        
        return results;
      });
    } catch (error) {
      console.error('保存法律分段出错:', error);
      throw error;
    }
  },
  
  // 查询最相似的法律文本段落
  async searchSimilarSegments(queryVector, limit = 5) {
    try {
      // 注意：这是一个简化的相似度搜索实现
      // 实际生产环境应该使用专门的向量数据库或优化的MySQL算法
      const results = await knex.raw(`
        SELECT 
          s.id,
          s.law_name,
          s.book,
          s.chapter,
          s.section,
          s.article,
          s.content,
          s.key_concepts,
          /* 计算余弦相似度 (简化版，仅适用于小规模向量) */
          (
            /* 将JSON向量转为点积 (伪代码表示，实际需要根据数据库类型实现) */
            /* 这里使用存储过程或自定义函数计算向量相似度 */
            COSINE_SIMILARITY(v.vector, ?) AS similarity_score
          )
        FROM 
          law_segments s
          JOIN law_segment_vectors v ON s.id = v.segment_id
        ORDER BY 
          similarity_score DESC
        LIMIT ?
      `, [JSON.stringify(queryVector), limit]);
      
      return results;
    } catch (error) {
      console.error('向量搜索出错:', error);
      return [];
    }
  },
  
  // 按法律文本结构搜索
  async searchByStructure({law_name = null, book = null, chapter = null, section = null, article = null}) {
    try {
      const query = knex('law_segments')
        .select('*');
      
      if (law_name) query.where('law_name', law_name);
      if (book) query.where('book', book);
      if (chapter) query.where('chapter', chapter);
      if (section) query.where('section', section);
      if (article) query.where('article', article);
      
      return await query;
    } catch (error) {
      console.error('按结构搜索出错:', error);
      return [];
    }
  }
};

// 导出新增的功能
module.exports = {
  // ... existing code ...
  legalDocVectors
}; 