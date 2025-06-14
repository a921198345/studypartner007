import { pool } from './lib/db.js';

async function checkSessionData() {
  const connection = await pool.getConnection();
  
  try {
    console.log('=== 检查答题会话数据 ===\n');
    
    // 1. 检查表结构
    console.log('1. 检查表结构:');
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM answer_sessions`
    );
    console.log('表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(必填)'}`);
    });
    
    // 2. 统计数据
    console.log('\n2. 数据统计:');
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM answer_sessions`
    );
    console.log(`  总会话数: ${countResult[0].total}`);
    
    // 按客户端会话ID统计
    const [clientStats] = await connection.execute(
      `SELECT client_session_id, COUNT(*) as count 
       FROM answer_sessions 
       GROUP BY client_session_id 
       ORDER BY count DESC 
       LIMIT 10`
    );
    console.log('\n  按客户端会话ID统计 (前10):');
    clientStats.forEach(stat => {
      console.log(`    ${stat.client_session_id}: ${stat.count} 个会话`);
    });
    
    // 3. 检查最近的会话
    console.log('\n3. 最近的会话 (前5条):');
    const [recentSessions] = await connection.execute(
      `SELECT session_id, client_session_id, start_time, questions_answered, source, subject
       FROM answer_sessions 
       ORDER BY start_time DESC 
       LIMIT 5`
    );
    
    recentSessions.forEach((session, index) => {
      console.log(`\n  会话 ${index + 1}:`);
      console.log(`    ID: ${session.session_id}`);
      console.log(`    客户端ID: ${session.client_session_id}`);
      console.log(`    开始时间: ${session.start_time}`);
      console.log(`    已答题数: ${session.questions_answered}`);
      console.log(`    来源: ${session.source || '未指定'}`);
      console.log(`    科目: ${session.subject || '未指定'}`);
    });
    
    // 4. 检查日期格式问题
    console.log('\n4. 检查日期格式:');
    const [dateCheck] = await connection.execute(
      `SELECT COUNT(*) as invalid_dates 
       FROM answer_sessions 
       WHERE start_time IS NULL OR start_time = '0000-00-00 00:00:00'`
    );
    console.log(`  无效日期数量: ${dateCheck[0].invalid_dates}`);
    
    // 5. 检查特定客户端会话ID的数据
    const testClientId = process.argv[2];
    if (testClientId) {
      console.log(`\n5. 检查特定客户端会话ID: ${testClientId}`);
      const [clientSessions] = await connection.execute(
        `SELECT * FROM answer_sessions WHERE client_session_id = ? ORDER BY start_time DESC`,
        [testClientId]
      );
      
      if (clientSessions.length > 0) {
        console.log(`  找到 ${clientSessions.length} 个会话`);
        clientSessions.forEach((session, index) => {
          console.log(`\n  会话 ${index + 1}:`);
          console.log(`    ${JSON.stringify(session, null, 2)}`);
        });
      } else {
        console.log('  没有找到该客户端ID的会话');
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

checkSessionData();