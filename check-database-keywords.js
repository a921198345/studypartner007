const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkKeywordDistribution() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'law_exam_assistant',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('=== 检查"盗窃"关键词在各科目中的分布 ===\n');

    // 1. 检查所有包含"盗窃"的题目总数
    const [totalResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM questions WHERE content LIKE ? OR options LIKE ?",
      ['%盗窃%', '%盗窃%']
    );
    console.log(`所有包含"盗窃"的题目总数: ${totalResult[0].count}`);

    // 2. 按科目统计
    const [subjectStats] = await connection.execute(
      `SELECT subject, COUNT(*) as count 
       FROM questions 
       WHERE (content LIKE ? OR options LIKE ?)
       GROUP BY subject
       ORDER BY count DESC`,
      ['%盗窃%', '%盗窃%']
    );
    
    console.log('\n按科目统计:');
    subjectStats.forEach(stat => {
      console.log(`${stat.subject}: ${stat.count} 道题`);
    });

    // 3. 检查精确匹配法律术语的情况
    const [preciseResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM questions 
       WHERE (content LIKE ? OR options LIKE ?)
       AND (content REGEXP ? OR options REGEXP ?)`,
      ['%盗窃%', '%盗窃%', '盗窃罪|盗窃案|盗窃行为|盗窃财物', '盗窃罪|盗窃案|盗窃行为|盗窃财物']
    );
    console.log(`\n精确匹配法律术语的题目数: ${preciseResult[0].count}`);

    // 4. 查看一些示例题目
    console.log('\n=== 示例题目 ===');
    const subjects = ['刑法', '民法', '行政法'];
    
    for (const subject of subjects) {
      const [examples] = await connection.execute(
        `SELECT id, question_id, subject, SUBSTRING(content, 1, 100) as content_preview
         FROM questions 
         WHERE subject = ? AND (content LIKE ? OR options LIKE ?)
         LIMIT 2`,
        [subject, '%盗窃%', '%盗窃%']
      );
      
      console.log(`\n${subject}示例:`);
      examples.forEach(ex => {
        console.log(`- ID: ${ex.id}, 题号: ${ex.question_id}`);
        console.log(`  内容: ${ex.content_preview}...`);
      });
    }

    // 5. 检查多关键词搜索的并集情况
    console.log('\n=== 多关键词搜索测试 ===');
    const keywords = ['盗窃', '侵权'];
    
    // 模拟多关键词搜索逻辑
    let unionQuery = `
      SELECT DISTINCT id, question_id, subject
      FROM questions 
      WHERE subject = ? AND (
    `;
    
    const conditions = [];
    const params = ['刑法'];
    
    keywords.forEach(keyword => {
      conditions.push('(content LIKE ? OR options LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    });
    
    unionQuery += conditions.join(' OR ') + ') LIMIT 100';
    
    const [unionResult] = await connection.execute(unionQuery, params);
    console.log(`刑法中搜索"${keywords.join(', ')}"的结果数: ${unionResult.length}`);

  } catch (error) {
    console.error('数据库查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkKeywordDistribution();