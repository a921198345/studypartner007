// 诊断搜索问题的脚本
import { pool } from './lib/db.js';

async function diagnoseSearchIssue() {
  console.log('=== 诊断搜索问题 ===\n');
  
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查数据库中是否有民法题目
    console.log('1. 检查民法题目数量:');
    const [civilLawCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM questions WHERE subject = ?',
      ['民法']
    );
    console.log(`   民法题目总数: ${civilLawCount[0].count}`);
    
    // 2. 搜索包含特定关键词的题目
    const searchKeywords = ['婚姻', '家庭', '夫妻', '配偶', '继承', '合同'];
    
    console.log('\n2. 搜索关键词在题目中的出现情况:');
    for (const keyword of searchKeywords) {
      const [results] = await connection.execute(
        `SELECT COUNT(*) as count FROM questions 
         WHERE subject = ? AND (
           question_text LIKE ? OR 
           options_json LIKE ? OR 
           explanation_text LIKE ?
         )`,
        ['民法', `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
      );
      console.log(`   "${keyword}": ${results[0].count} 条`);
      
      // 如果找到题目，显示一个例子
      if (results[0].count > 0) {
        const [sample] = await connection.execute(
          `SELECT id, question_code, question_text 
           FROM questions 
           WHERE subject = ? AND question_text LIKE ?
           LIMIT 1`,
          ['民法', `%${keyword}%`]
        );
        
        if (sample.length > 0) {
          console.log(`      例: [${sample[0].question_code}] ${sample[0].question_text.substring(0, 50)}...`);
        }
      }
    }
    
    // 3. 检查数据格式问题
    console.log('\n3. 检查数据格式:');
    const [sampleQuestions] = await connection.execute(
      'SELECT id, question_code, subject, year, question_text FROM questions WHERE subject = ? LIMIT 5',
      ['民法']
    );
    
    console.log('   示例题目:');
    sampleQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ID: ${q.id}, Code: ${q.question_code}, Year: ${q.year}`);
      console.log(`      Text: ${q.question_text.substring(0, 60)}...`);
    });
    
    // 4. 测试搜索条件
    console.log('\n4. 测试不同的搜索条件:');
    
    // 测试精确匹配
    const testQueries = [
      { 
        desc: '包含"婚姻"的题目', 
        sql: 'SELECT COUNT(*) as count FROM questions WHERE question_text LIKE ?',
        params: ['%婚姻%']
      },
      {
        desc: '包含"30"和"婚姻"的题目',
        sql: 'SELECT COUNT(*) as count FROM questions WHERE question_text LIKE ? AND question_text LIKE ?',
        params: ['%30%', '%婚姻%']
      },
      {
        desc: '民法中包含"婚"或"姻"的题目',
        sql: 'SELECT COUNT(*) as count FROM questions WHERE subject = ? AND (question_text LIKE ? OR question_text LIKE ?)',
        params: ['民法', '%婚%', '%姻%']
      }
    ];
    
    for (const test of testQueries) {
      const [result] = await connection.execute(test.sql, test.params);
      console.log(`   ${test.desc}: ${result[0].count} 条`);
    }
    
  } catch (error) {
    console.error('诊断过程出错:', error);
  } finally {
    connection.release();
  }
}

// 运行诊断
diagnoseSearchIssue()
  .then(() => {
    console.log('\n诊断完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('诊断失败:', error);
    process.exit(1);
  });