import { pool } from './lib/db.js';

async function debugSessionUpdate() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // 1. 获取所有会话
    const [sessions] = await connection.execute(
      'SELECT session_id, questions_answered, correct_count FROM answer_sessions ORDER BY start_time DESC LIMIT 10'
    );
    
    console.log('=== 当前会话状态 ===');
    sessions.forEach(session => {
      console.log(`会话 ${session.session_id}: 已答 ${session.questions_answered} 题，答对 ${session.correct_count} 题`);
    });
    
    // 2. 检查 user_answers 表中的记录
    const [answerCounts] = await connection.execute(`
      SELECT 
        session_id, 
        COUNT(*) as answer_count,
        SUM(is_correct) as correct_count
      FROM user_answers 
      WHERE session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY session_id DESC
      LIMIT 10
    `);
    
    console.log('\n=== user_answers 表统计 ===');
    answerCounts.forEach(row => {
      console.log(`会话 ${row.session_id}: 有 ${row.answer_count} 条答题记录，答对 ${row.correct_count} 题`);
    });
    
    // 3. 对比两个表的数据
    console.log('\n=== 数据不一致检查 ===');
    const [inconsistent] = await connection.execute(`
      SELECT 
        s.session_id,
        s.questions_answered as session_answered,
        s.correct_count as session_correct,
        COUNT(ua.id) as actual_answered,
        SUM(ua.is_correct) as actual_correct
      FROM answer_sessions s
      LEFT JOIN user_answers ua ON s.session_id = ua.session_id
      GROUP BY s.session_id
      HAVING session_answered != actual_answered OR session_correct != IFNULL(actual_correct, 0)
    `);
    
    if (inconsistent.length > 0) {
      console.log('发现数据不一致的会话:');
      inconsistent.forEach(row => {
        console.log(`会话 ${row.session_id}:`);
        console.log(`  - answer_sessions 表: 已答 ${row.session_answered}，答对 ${row.session_correct}`);
        console.log(`  - user_answers 表: 已答 ${row.actual_answered}，答对 ${row.actual_correct || 0}`);
      });
    } else {
      console.log('所有会话数据一致');
    }
    
    // 4. 修复数据不一致
    if (inconsistent.length > 0) {
      console.log('\n=== 修复数据不一致 ===');
      for (const row of inconsistent) {
        await connection.execute(`
          UPDATE answer_sessions 
          SET questions_answered = ?,
              correct_count = ?
          WHERE session_id = ?
        `, [row.actual_answered, row.actual_correct || 0, row.session_id]);
        
        console.log(`已修复会话 ${row.session_id}`);
      }
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

debugSessionUpdate();