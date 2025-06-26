import mysql from 'mysql2/promise';

async function checkQuestion12() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查题目ID 12的详细信息...');
    
    // 检查题目12的具体信息
    const [rows] = await connection.execute(
      'SELECT id, year, subject, question_type, question_text FROM questions WHERE id = 12',
      []
    );

    if (rows.length > 0) {
      const q = rows[0];
      console.log('📊 题目详情:');
      console.log(`- ID: ${q.id}`);
      console.log(`- 年份: ${q.year}`);
      console.log(`- 科目: ${q.subject}`);
      console.log(`- 类型: ${q.question_type}`);
      console.log(`- 题目文本: ${q.question_text ? q.question_text.substring(0, 50) + '...' : '无'}`);
      
      console.log('\n🔍 分析:');
      if (q.year === '2022') {
        console.log('✅ 这是2022年的题目，所有用户都应该能访问');
      } else {
        console.log(`❌ 这是${q.year}年的题目，只有会员才能访问`);
      }
    } else {
      console.log('❌ 题目ID 12不存在');
    }
    
    // 检查附近的题目
    console.log('\n🔍 检查附近的题目(ID 10-15)...');
    const [nearbyRows] = await connection.execute(
      'SELECT id, year, subject FROM questions WHERE id BETWEEN 10 AND 15 ORDER BY id',
      []
    );
    
    nearbyRows.forEach(q => {
      console.log(`- ID ${q.id}: ${q.year}年 ${q.subject}`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkQuestion12();