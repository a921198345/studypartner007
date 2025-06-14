#!/usr/bin/env node

/**
 * 修复答题历史显示问题
 * 
 * 问题分析：
 * 1. 答题历史组件检查了迁移标记，如果已迁移就跳过数据加载
 * 2. 即使数据库有数据，前端也可能因为各种原因不显示
 * 
 * 解决方案：
 * 1. 清除迁移标记，让组件重新加载数据
 * 2. 检查并修复可能的数据问题
 */

import { pool } from './lib/db.js';

console.log('=== 修复答题历史显示问题 ===\n');

async function fixAnswerHistoryDisplay() {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查当前数据状态
    console.log('1. 检查数据库中的答题会话:');
    const [sessions] = await connection.execute(
      `SELECT 
        session_id,
        client_session_id,
        questions_answered,
        correct_count,
        start_time,
        updated_at
      FROM answer_sessions
      WHERE questions_answered > 0
      ORDER BY updated_at DESC
      LIMIT 10`
    );
    
    console.log(`找到 ${sessions.length} 个有答题记录的会话\n`);
    
    if (sessions.length === 0) {
      console.log('❌ 数据库中没有答题记录，请先答几道题再测试\n');
      return;
    }
    
    // 2. 显示会话详情
    sessions.forEach((session, idx) => {
      console.log(`${idx + 1}. 会话 ${session.session_id}`);
      console.log(`   客户端ID: ${session.client_session_id}`);
      console.log(`   已答题数: ${session.questions_answered}`);
      console.log(`   正确数: ${session.correct_count}`);
      console.log(`   更新时间: ${session.updated_at}\n`);
    });
    
    // 3. 建议的修复步骤
    console.log('\n🔧 修复步骤:');
    console.log('1. 在浏览器中打开: http://localhost:3000/test-answer-history-display.html');
    console.log('2. 点击"一键修复并刷新"按钮');
    console.log('3. 前往题库页面查看答题历史是否显示');
    
    console.log('\n💡 如果还是不显示，可能的原因:');
    console.log('- 客户端会话ID不匹配（清除浏览器缓存）');
    console.log('- 组件渲染问题（检查浏览器控制台错误）');
    console.log('- API响应异常（使用开发者工具查看网络请求）');
    
    // 4. 提供手动修复命令
    console.log('\n📝 手动修复命令:');
    console.log('在浏览器控制台执行:');
    console.log('```javascript');
    console.log('// 清除迁移标记');
    console.log("localStorage.removeItem('answerHistoryMigrated');");
    console.log('// 触发会话更新');
    console.log("window.dispatchEvent(new Event('answerSessionUpdated'));");
    console.log('// 刷新页面');
    console.log('location.reload();');
    console.log('```');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixAnswerHistoryDisplay();