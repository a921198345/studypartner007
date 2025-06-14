import mysql from 'mysql2/promise';

async function checkQuestions() {
  const connection = await mysql.createConnection({
    host: '8.141.4.192',
    user: 'law_user',
    password: 'Accd0726351x.',
    database: 'law_exam_assistant',
    connectTimeout: 10000
  });

  try {
    // 查询刑法题目，找一个可能有问题的
    const [rows] = await connection.execute(
      `SELECT question_code, question_text, options_json, explanation_text 
       FROM questions 
       WHERE subject = '刑法' 
       ORDER BY id DESC 
       LIMIT 5`
    );

    console.log(`找到 ${rows.length} 个刑法题目\n`);

    for (const row of rows) {
      console.log(`\n题号: ${row.question_code}`);
      console.log(`题干: ${row.question_text.substring(0, 100)}...`);
      
      // 解析选项
      try {
        const options = JSON.parse(row.options_json);
        console.log('\n选项:');
        for (const [key, value] of Object.entries(options)) {
          console.log(`${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
          
          // 检查选项中是否包含解析内容的关键词
          if (value.includes('【解析】') || value.includes('错误') || value.includes('正确') || value.includes('答案')) {
            console.log(`⚠️ 警告: 选项${key}可能包含了解析内容！`);
          }
        }
      } catch (e) {
        console.log('选项解析失败:', e.message);
      }
      
      console.log(`\n解析前100字符: ${row.explanation_text.substring(0, 100)}...`);
      console.log('-'.repeat(80));
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkQuestions();