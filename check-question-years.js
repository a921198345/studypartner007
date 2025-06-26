import mysql from 'mysql2/promise';

async function checkQuestionYears() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查题目11和12的年份...');
    
    const [rows] = await connection.execute(
      'SELECT id, year, subject, question_type FROM questions WHERE id IN (11, 12)',
      []
    );

    if (rows.length > 0) {
      console.log('📊 题目信息:');
      rows.forEach(q => {
        console.log(`- 题目ID: ${q.id}, 年份: ${q.year}, 科目: ${q.subject}, 类型: ${q.question_type}`);
      });
    } else {
      console.log('❌ 未找到题目11和12');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkQuestionYears();