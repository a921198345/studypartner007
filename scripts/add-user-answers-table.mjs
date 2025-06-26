import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addUserAnswersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '8.141.4.192',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'law_user',
    password: process.env.DB_PASSWORD || 'Accd0726351x.',
    database: process.env.DB_NAME || 'law_exam_assistant'
  });

  try {
    console.log('=== 创建 user_answers 表 ===\n');

    // 创建 user_answers 表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_answers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        question_id INT NOT NULL,
        selected_option CHAR(1) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_question_id (question_id),
        INDEX idx_created_at (created_at),
        INDEX idx_user_question (user_id, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ user_answers 表创建成功！');

    // 验证表是否创建成功
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_answers'"
    );
    
    if (tables.length > 0) {
      console.log('\n验证：表已成功创建');
      
      // 显示表结构
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM user_answers"
      );
      console.log('\n表结构：');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('创建表失败:', error.message);
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

addUserAnswersTable().catch(console.error);