// 检查题目的科目分布
import { pool } from './lib/db.js';

async function checkSubjects() {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查所有科目的分布
    console.log('1. 题目科目分布:');
    const [subjects] = await connection.execute(
      'SELECT subject, COUNT(*) as count FROM questions GROUP BY subject ORDER BY count DESC'
    );
    
    subjects.forEach(s => {
      console.log(`   ${s.subject || '(空)'}: ${s.count} 条`);
    });
    
    // 2. 检查包含"婚姻"的题目属于哪些科目
    console.log('\n2. 包含"婚姻"的题目分布:');
    const [marriageQuestions] = await connection.execute(
      `SELECT subject, COUNT(*) as count 
       FROM questions 
       WHERE question_text LIKE ? 
       GROUP BY subject`,
      ['%婚姻%']
    );
    
    marriageQuestions.forEach(m => {
      console.log(`   ${m.subject || '(空)'}: ${m.count} 条`);
    });
    
    // 3. 显示几个包含"婚姻"的题目示例
    console.log('\n3. 包含"婚姻"的题目示例:');
    const [samples] = await connection.execute(
      `SELECT id, question_code, subject, year, question_text 
       FROM questions 
       WHERE question_text LIKE ? 
       LIMIT 5`,
      ['%婚姻%']
    );
    
    samples.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.subject || '未分类'}] ${q.question_code}`);
      console.log(`      ${q.question_text.substring(0, 80)}...`);
    });
    
    // 4. 检查题目总数
    const [total] = await connection.execute('SELECT COUNT(*) as count FROM questions');
    console.log(`\n题目总数: ${total[0].count}`);
    
  } catch (error) {
    console.error('检查过程出错:', error);
  } finally {
    connection.release();
  }
}

// 运行检查
checkSubjects()
  .then(() => {
    console.log('\n检查完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  });