#!/usr/bin/env node

import { pool } from './lib/db.js';

console.log('=== 修复答题历史功能 ===\n');

async function fixAnswerHistory() {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查表结构
    console.log('1. 检查表结构...');
    
    // 检查 user_answers 表
    const [userAnswersColumns] = await connection.execute(
      `SHOW COLUMNS FROM user_answers`
    );
    console.log('user_answers 表字段:');
    userAnswersColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // 2. 检查 answer_sessions 表索引
    console.log('\n2. 检查索引...');
    const [indexes] = await connection.execute(
      `SHOW INDEX FROM answer_sessions WHERE Key_name = 'idx_client_session'`
    );
    
    if (indexes.length === 0) {
      console.log('创建 client_session_id 索引...');
      await connection.execute(
        `ALTER TABLE answer_sessions ADD INDEX idx_client_session (client_session_id)`
      );
      console.log('索引创建成功');
    } else {
      console.log('client_session_id 索引已存在');
    }
    
    // 3. 修复现有会话的日期格式
    console.log('\n3. 修复日期格式问题...');
    const [invalidDates] = await connection.execute(
      `SELECT COUNT(*) as count FROM answer_sessions 
       WHERE start_time IS NULL OR start_time = '0000-00-00 00:00:00'`
    );
    
    if (invalidDates[0].count > 0) {
      console.log(`发现 ${invalidDates[0].count} 个无效日期，正在修复...`);
      await connection.execute(
        `UPDATE answer_sessions 
         SET start_time = created_at 
         WHERE start_time IS NULL OR start_time = '0000-00-00 00:00:00'`
      );
      console.log('日期修复完成');
    }
    
    // 4. 检查是否有孤立的答题记录
    console.log('\n4. 检查孤立的答题记录...');
    const [orphanedAnswers] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM user_answers ua 
       LEFT JOIN answer_sessions ans ON ua.session_id = ans.session_id 
       WHERE ans.session_id IS NULL AND ua.session_id IS NOT NULL`
    );
    
    if (orphanedAnswers[0].count > 0) {
      console.log(`发现 ${orphanedAnswers[0].count} 个孤立的答题记录`);
    }
    
    // 5. 创建测试数据（可选）
    const createTestData = process.argv.includes('--test');
    if (createTestData) {
      console.log('\n5. 创建测试数据...');
      
      // 生成测试客户端会话ID
      const testClientId = `test_client_${Date.now()}`;
      const testSessionId = `test_session_${Date.now()}`;
      
      // 创建测试会话
      await connection.execute(
        `INSERT INTO answer_sessions (
          session_id, client_session_id, start_time, 
          questions_answered, correct_count, total_questions,
          source, subject, last_question_id
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [testSessionId, testClientId, 10, 7, 15, 'all', '民法', 10]
      );
      
      console.log(`创建测试会话成功: ${testSessionId}`);
      console.log(`客户端会话ID: ${testClientId}`);
      
      // 插入一些测试答题记录
      for (let i = 1; i <= 10; i++) {
        await connection.execute(
          `INSERT INTO user_answers (
            session_id, question_id, submitted_answer, is_correct, created_at
          ) VALUES (?, ?, ?, ?, NOW())`,
          [testSessionId, i, 'A', i <= 7 ? 1 : 0]
        );
      }
      
      console.log('创建了 10 条测试答题记录');
    }
    
    // 6. 统计当前数据
    console.log('\n6. 当前数据统计:');
    
    const [sessionStats] = await connection.execute(
      `SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT client_session_id) as unique_clients,
        SUM(questions_answered) as total_questions_answered,
        AVG(CASE WHEN questions_answered > 0 
            THEN correct_count / questions_answered * 100 
            ELSE 0 END) as avg_accuracy
       FROM answer_sessions`
    );
    
    const stats = sessionStats[0];
    console.log(`  总会话数: ${stats.total_sessions}`);
    console.log(`  独立客户端数: ${stats.unique_clients}`);
    console.log(`  总答题数: ${stats.total_questions_answered || 0}`);
    console.log(`  平均正确率: ${stats.avg_accuracy !== null ? parseFloat(stats.avg_accuracy).toFixed(2) : 0}%`);
    
    // 7. 显示最近的会话
    console.log('\n7. 最近的答题会话:');
    const [recentSessions] = await connection.execute(
      `SELECT 
        session_id, client_session_id, start_time, 
        questions_answered, correct_count, subject
       FROM answer_sessions 
       WHERE questions_answered > 0
       ORDER BY start_time DESC 
       LIMIT 5`
    );
    
    if (recentSessions.length === 0) {
      console.log('  暂无答题记录');
    } else {
      recentSessions.forEach((session, index) => {
        console.log(`\n  ${index + 1}. 会话ID: ${session.session_id}`);
        console.log(`     客户端: ${session.client_session_id}`);
        console.log(`     时间: ${session.start_time}`);
        console.log(`     科目: ${session.subject || '未指定'}`);
        console.log(`     答题: ${session.questions_answered} 题，正确: ${session.correct_count} 题`);
      });
    }
    
    console.log('\n修复完成！');
    
    // 提供调试建议
    console.log('\n调试建议:');
    console.log('1. 在浏览器中打开 http://localhost:3000/test-session-fix.html 进行完整测试');
    console.log('2. 检查浏览器控制台是否有错误信息');
    console.log('3. 确保 localStorage 中有 client_session_id');
    console.log('4. 验证 API 请求头中包含 X-Client-Session-Id');
    
  } catch (error) {
    console.error('修复过程出错:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixAnswerHistory();