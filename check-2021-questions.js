import mysql from 'mysql2/promise';

async function check2021Questions() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查数据库中各年份的题目数量...');
    
    const [rows] = await connection.execute(
      'SELECT year, COUNT(*) as count FROM questions GROUP BY year ORDER BY year',
      []
    );

    console.log('📊 各年份题目统计:');
    rows.forEach(row => {
      console.log(`- ${row.year}年: ${row.count}题`);
    });
    
    console.log('\n🔍 检查2021年的具体题目...');
    const [questions2021] = await connection.execute(
      'SELECT id, year, subject, question_type FROM questions WHERE year = ? LIMIT 5',
      ['2021']
    );
    
    if (questions2021.length > 0) {
      console.log('📋 2021年题目示例:');
      questions2021.forEach(q => {
        console.log(`  - ID: ${q.id}, 年份: ${q.year}, 科目: ${q.subject}, 类型: ${q.question_type}`);
      });
    } else {
      console.log('❌ 数据库中没有2021年的题目');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

check2021Questions();