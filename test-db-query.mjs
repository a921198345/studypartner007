import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testQuery() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'law_exam_assistant',
      port: process.env.DB_PORT || 3306
    });

    console.log('数据库连接成功\n');

    // 1. 检查总数
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM questions');
    console.log('题目总数:', count[0].total);

    // 2. 查看前5条记录
    const [rows] = await connection.execute(
      `SELECT id, question_code, subject, year, question_type, 
              SUBSTRING(question_text, 1, 50) as question_preview 
       FROM questions 
       LIMIT 5`
    );

    if (rows.length > 0) {
      console.log('\n前5条记录:');
      rows.forEach(row => {
        console.log(`- ID: ${row.id}, 题号: ${row.question_code}, 科目: ${row.subject}, 年份: ${row.year}, 类型: ${row.question_type}`);
        console.log(`  题干预览: ${row.question_preview}...`);
      });
    }

    // 3. 检查 question_type 的值分布
    const [types] = await connection.execute(
      `SELECT question_type, COUNT(*) as count 
       FROM questions 
       GROUP BY question_type`
    );

    if (types.length > 0) {
      console.log('\n题目类型分布:');
      types.forEach(type => {
        const typeName = type.question_type === 1 ? '单选题' : type.question_type === 2 ? '多选题' : '判断题';
        console.log(`- ${typeName} (${type.question_type}): ${type.count} 道`);
      });
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testQuery();