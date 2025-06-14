const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDbStructure() {
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

    // 查看 questions 表结构
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM questions`
    );

    console.log('questions 表结构:');
    console.log('字段名称 | 类型 | 是否为空 | 键 | 默认值 | 额外信息');
    console.log('-'.repeat(80));
    
    columns.forEach(col => {
      console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'} | ${col.Extra}`);
    });

    // 特别检查 question_type 字段
    const questionTypeCol = columns.find(col => col.Field === 'question_type');
    if (questionTypeCol) {
      console.log('\n特别注意: question_type 字段类型是:', questionTypeCol.Type);
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDbStructure();