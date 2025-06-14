import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkQuestionsTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'law_exam_assistant',
      port: process.env.DB_PORT || 3306
    });

    console.log('连接到数据库成功\n');

    // 1. 查看 questions 表的所有字段
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM questions`
    );

    console.log('questions 表结构:');
    console.log('字段名称 | 类型 | 是否为空 | 键 | 默认值 | 额外信息');
    console.log('-'.repeat(100));
    
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(25)} | ${col.Null.padEnd(8)} | ${col.Key.padEnd(3)} | ${(col.Default || 'NULL').toString().padEnd(10)} | ${col.Extra}`);
    });

    // 2. 检查是否有 question_code 字段
    const hasQuestionCode = columns.some(col => col.Field === 'question_code');
    console.log('\n是否有 question_code 字段:', hasQuestionCode ? '是' : '否');

    // 3. 查看表中的数据
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM questions');
    console.log('\n表中记录总数:', count[0].total);

    // 4. 如果有数据，查看一条示例
    if (count[0].total > 0) {
      const [sample] = await connection.execute('SELECT * FROM questions LIMIT 1');
      console.log('\n示例数据:');
      console.log(JSON.stringify(sample[0], null, 2));
    }

    // 5. 查看索引
    const [indexes] = await connection.execute('SHOW INDEX FROM questions');
    console.log('\n表索引:');
    indexes.forEach(idx => {
      console.log(`- ${idx.Key_name} on ${idx.Column_name} (${idx.Index_type})`);
    });

  } catch (error) {
    console.error('错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkQuestionsTable();