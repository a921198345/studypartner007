#!/usr/bin/env node

import { pool } from './lib/db.js';

console.log('=== 调试答题历史问题 ===\n');

async function debugAnswerHistory() {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查最新的会话数据
    console.log('1. 检查有答题记录的会话:');
    const [sessions] = await connection.execute(
      `SELECT 
        session_id,
        client_session_id,
        questions_answered,
        correct_count,
        subject,
        start_time,
        updated_at
      FROM answer_sessions
      WHERE questions_answered > 0
      ORDER BY updated_at DESC
      LIMIT 10`
    );
    
    console.log(`找到 ${sessions.length} 个有答题记录的会话:\n`);
    sessions.forEach((session, idx) => {
      console.log(`${idx + 1}. 会话 ${session.session_id}`);
      console.log(`   客户端ID: ${session.client_session_id}`);
      console.log(`   已答题数: ${session.questions_answered}`);
      console.log(`   正确数: ${session.correct_count}`);
      console.log(`   科目: ${session.subject}`);
      console.log(`   更新时间: ${session.updated_at}\n`);
    });
    
    // 2. 检查答题记录
    console.log('\n2. 检查最新的答题记录:');
    const [answers] = await connection.execute(
      `SELECT 
        ua.id,
        ua.session_id,
        ua.question_id,
        ua.submitted_answer,
        ua.is_correct,
        ua.created_at
      FROM user_answers ua
      ORDER BY ua.created_at DESC
      LIMIT 10`
    );
    
    console.log(`找到 ${answers.length} 条最新答题记录:\n`);
    answers.forEach((answer, idx) => {
      console.log(`${idx + 1}. 答题记录 ID: ${answer.id}`);
      console.log(`   会话ID: ${answer.session_id}`);
      console.log(`   题目ID: ${answer.question_id}`);
      console.log(`   提交答案: ${answer.submitted_answer}`);
      console.log(`   是否正确: ${answer.is_correct ? '✓' : '✗'}`);
      console.log(`   答题时间: ${answer.created_at}\n`);
    });
    
    // 3. 验证会话更新是否正确
    console.log('\n3. 验证会话统计是否正确:');
    const [sessionStats] = await connection.execute(
      `SELECT 
        s.session_id,
        s.questions_answered as recorded_count,
        COUNT(ua.id) as actual_count,
        s.correct_count as recorded_correct,
        SUM(ua.is_correct) as actual_correct
      FROM answer_sessions s
      LEFT JOIN user_answers ua ON s.session_id = ua.session_id
      WHERE s.questions_answered > 0
      GROUP BY s.session_id
      ORDER BY s.updated_at DESC
      LIMIT 5`
    );
    
    sessionStats.forEach(stat => {
      const countMatch = stat.recorded_count === stat.actual_count;
      const correctMatch = stat.recorded_correct === stat.actual_correct;
      
      console.log(`会话 ${stat.session_id}:`);
      console.log(`  记录的答题数: ${stat.recorded_count}, 实际答题数: ${stat.actual_count} ${countMatch ? '✓' : '✗ 不匹配!'}`);
      console.log(`  记录的正确数: ${stat.recorded_correct}, 实际正确数: ${stat.actual_correct} ${correctMatch ? '✓' : '✗ 不匹配!'}\n`);
    });
    
    // 4. 建议的修复步骤
    console.log('\n4. 建议的调试步骤:');
    console.log('   a) 清除浏览器缓存和localStorage');
    console.log('   b) 确保前端正确获取了客户端会话ID');
    console.log('   c) 检查API响应是否包含正确的数据');
    console.log('   d) 验证答题历史组件是否正确渲染数据');
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

debugAnswerHistory();