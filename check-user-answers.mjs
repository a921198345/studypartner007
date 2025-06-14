import { pool } from './lib/db.js';

async function checkUserAnswers() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // 1. 检查 user_answers 表结构
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM user_answers"
    );
    
    console.log('=== user_answers 表结构 ===');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // 2. 检查最近的答题记录
    const [recentAnswers] = await connection.execute(`
      SELECT 
        id,
        user_id,
        session_id,
        question_id,
        submitted_answer,
        is_correct,
        created_at
      FROM user_answers 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n=== 最近的答题记录 ===');
    if (recentAnswers.length === 0) {
      console.log('user_answers 表中没有任何记录');
    } else {
      recentAnswers.forEach((answer, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ID: ${answer.id}`);
        console.log(`  用户ID: ${answer.user_id}`);
        console.log(`  会话ID: ${answer.session_id}`);
        console.log(`  题目ID: ${answer.question_id}`);
        console.log(`  提交答案: ${answer.submitted_answer}`);
        console.log(`  是否正确: ${answer.is_correct ? '✓' : '✗'}`);
        console.log(`  创建时间: ${answer.created_at}`);
      });
    }
    
    // 3. 检查有多少记录有 session_id
    const [sessionStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN session_id IS NOT NULL THEN 1 ELSE 0 END) as with_session,
        SUM(CASE WHEN session_id IS NULL THEN 1 ELSE 0 END) as without_session
      FROM user_answers
    `);
    
    console.log('\n=== 会话ID统计 ===');
    console.log(`总记录数: ${sessionStats[0].total}`);
    console.log(`有会话ID: ${sessionStats[0].with_session}`);
    console.log(`无会话ID: ${sessionStats[0].without_session}`);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

checkUserAnswers();