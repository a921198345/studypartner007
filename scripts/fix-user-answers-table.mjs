import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixUserAnswersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '8.141.4.192',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'law_user',
    password: process.env.DB_PASSWORD || 'Accd0726351x.',
    database: process.env.DB_NAME || 'law_exam_assistant'
  });

  try {
    console.log('=== 修复 user_answers 表结构 ===\n');

    // 1. 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_answers'"
    );
    
    if (tables.length === 0) {
      console.log('user_answers 表不存在，正在创建...');
      
      // 创建新表，使用正确的字段名
      const createTableSQL = `
        CREATE TABLE user_answers (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id VARCHAR(255) NOT NULL,
          question_id INT NOT NULL,
          submitted_answer CHAR(4) NOT NULL,
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
    } else {
      console.log('user_answers 表已存在，检查字段...');
      
      // 检查现有字段
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM user_answers"
      );
      
      const columnNames = columns.map(col => col.Field);
      console.log('现有字段:', columnNames);
      
      // 检查是否有 selected_option 字段需要重命名
      if (columnNames.includes('selected_option') && !columnNames.includes('submitted_answer')) {
        console.log('发现 selected_option 字段，正在重命名为 submitted_answer...');
        
        try {
          await connection.execute(
            "ALTER TABLE user_answers CHANGE COLUMN selected_option submitted_answer CHAR(4) NOT NULL"
          );
          console.log('✅ 字段重命名成功！');
        } catch (error) {
          console.error('重命名字段失败:', error.message);
        }
      } else if (columnNames.includes('submitted_answer')) {
        console.log('✅ 表结构正确，submitted_answer 字段已存在');
      }
    }

    // 显示最终表结构
    console.log('\n最终表结构：');
    const [finalColumns] = await connection.execute(
      "SHOW COLUMNS FROM user_answers"
    );
    
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

  } catch (error) {
    console.error('修复表结构失败:', error.message);
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

fixUserAnswersTable().catch(console.error);