import { pool } from './lib/db.js';

async function checkAnswerSessions() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // 1. 检查总记录数
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM answer_sessions'
    );
    console.log('=== answer_sessions 表总记录数 ===');
    console.log(`总计: ${countResult[0].total} 条记录\n`);
    
    // 2. 检查有答题记录的会话
    const [sessionCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM answer_sessions WHERE questions_answered > 0'
    );
    console.log('=== 已答题的会话数 ===');
    console.log(`已答题会话: ${sessionCount[0].total} 条\n`);
    
    // 3. 获取最近的会话记录
    const [sessions] = await connection.execute(`
      SELECT 
        session_id,
        client_session_id,
        user_id,
        questions_answered,
        correct_count,
        start_time,
        subject,
        source
      FROM answer_sessions 
      WHERE questions_answered > 0
      ORDER BY start_time DESC 
      LIMIT 5
    `);
    
    console.log('=== 最近的答题会话 ===');
    sessions.forEach((session, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  session_id: ${session.session_id}`);
      console.log(`  client_session_id: ${session.client_session_id}`);
      console.log(`  user_id: ${session.user_id}`);
      console.log(`  questions_answered: ${session.questions_answered}`);
      console.log(`  correct_count: ${session.correct_count}`);
      console.log(`  start_time: ${session.start_time}`);
      console.log(`  subject: ${session.subject}`);
      console.log(`  source: ${session.source}`);
    });
    
    // 4. 检查不同的 client_session_id
    const [clientIds] = await connection.execute(
      'SELECT DISTINCT client_session_id FROM answer_sessions WHERE client_session_id IS NOT NULL'
    );
    console.log(`\n=== 客户端会话ID统计 ===`);
    console.log(`找到 ${clientIds.length} 个不同的客户端会话ID`);
    
    // 显示前5个
    clientIds.slice(0, 5).forEach(row => {
      console.log(`  - ${row.client_session_id}`);
    });
    
    // 5. 检查最近24小时的会话
    const [recentSessions] = await connection.execute(`
      SELECT 
        client_session_id,
        COUNT(*) as session_count,
        SUM(questions_answered) as total_answered
      FROM answer_sessions 
      WHERE start_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY client_session_id
    `);
    
    console.log(`\n=== 最近24小时的会话统计 ===`);
    console.log(`活跃客户端: ${recentSessions.length} 个`);
    recentSessions.forEach(row => {
      console.log(`  客户端 ${row.client_session_id}: ${row.session_count} 个会话，共答 ${row.total_answered} 题`);
    });
    
  } catch (error) {
    console.error('数据库查询错误:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

checkAnswerSessions();