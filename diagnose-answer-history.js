const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function diagnoseAnswerHistory() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '8.141.4.192',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'law_user',
    password: process.env.DB_PASSWORD || 'Accd0726351x.',
    database: process.env.DB_NAME || 'law_exam_assistant'
  });

  try {
    console.log('=== 答题历史功能诊断 ===\n');

    // 1. 检查 user_answers 表是否存在
    console.log('1. 检查 user_answers 表...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_answers'"
    );
    
    if (tables.length === 0) {
      console.log('❌ user_answers 表不存在！这是问题的根本原因。');
      console.log('   需要创建 user_answers 表来存储答题记录。');
      return;
    }
    
    console.log('✅ user_answers 表存在');

    // 2. 检查表结构
    console.log('\n2. 检查表结构...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM user_answers"
    );
    console.log('表结构：');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 3. 检查数据量
    console.log('\n3. 检查答题记录数据...');
    const [countResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_answers"
    );
    console.log(`   总答题记录数: ${countResult[0].count}`);

    // 4. 检查最近的答题记录
    const [recentAnswers] = await connection.execute(
      "SELECT * FROM user_answers ORDER BY created_at DESC LIMIT 5"
    );
    
    if (recentAnswers.length > 0) {
      console.log('\n最近5条答题记录：');
      recentAnswers.forEach((record, index) => {
        console.log(`   ${index + 1}. 用户: ${record.user_id}, 题目: ${record.question_id}, 答案: ${record.selected_option}, 时间: ${record.created_at}`);
      });
    } else {
      console.log('   暂无答题记录');
    }

  } catch (error) {
    console.error('诊断过程出错:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n❌ 确认: user_answers 表不存在，需要创建此表。');
    }
  } finally {
    await connection.end();
  }
}

diagnoseAnswerHistory().catch(console.error);