#!/usr/bin/env node

import { pool } from './lib/db.js';

console.log('=== 修复 user_answers 表结构 ===\n');

async function fixUserAnswersTable() {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查当前表结构
    console.log('1. 检查当前 user_answers 表结构...');
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM user_answers`
    );
    
    console.log('当前字段：');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(必填)'} ${col.Key ? col.Key : ''}`);
    });
    
    // 2. 修改 user_id 字段允许为 NULL
    const userIdColumn = columns.find(col => col.Field === 'user_id');
    if (userIdColumn && userIdColumn.Null === 'NO') {
      console.log('\n2. 修改 user_id 字段允许为 NULL...');
      await connection.execute(
        `ALTER TABLE user_answers MODIFY COLUMN user_id VARCHAR(255) NULL`
      );
      console.log('✓ user_id 字段已修改为可空');
    } else {
      console.log('\n2. user_id 字段已经允许为 NULL，无需修改');
    }
    
    // 3. 添加索引以提高查询性能
    console.log('\n3. 检查和添加索引...');
    const [indexes] = await connection.execute(
      `SHOW INDEX FROM user_answers`
    );
    
    // 检查 session_id 索引
    const hasSessionIndex = indexes.some(idx => idx.Key_name === 'idx_session_id');
    if (!hasSessionIndex) {
      console.log('添加 session_id 索引...');
      await connection.execute(
        `ALTER TABLE user_answers ADD INDEX idx_session_id (session_id)`
      );
      console.log('✓ session_id 索引添加成功');
    }
    
    // 检查 user_id 索引
    const hasUserIndex = indexes.some(idx => idx.Key_name === 'idx_user_id');
    if (!hasUserIndex) {
      console.log('添加 user_id 索引...');
      await connection.execute(
        `ALTER TABLE user_answers ADD INDEX idx_user_id (user_id)`
      );
      console.log('✓ user_id 索引添加成功');
    }
    
    // 4. 验证修改结果
    console.log('\n4. 验证修改结果...');
    const [newColumns] = await connection.execute(
      `SHOW COLUMNS FROM user_answers WHERE Field = 'user_id'`
    );
    
    if (newColumns.length > 0 && newColumns[0].Null === 'YES') {
      console.log('✓ user_id 字段现在允许为 NULL');
    } else {
      console.log('✗ user_id 字段修改失败');
    }
    
    // 5. 测试插入数据
    console.log('\n5. 测试插入数据（user_id 为 NULL）...');
    try {
      const testSessionId = `test_${Date.now()}`;
      await connection.execute(
        `INSERT INTO user_answers (user_id, session_id, question_id, submitted_answer, is_correct) 
         VALUES (NULL, ?, 1, 'A', 1)`,
        [testSessionId]
      );
      console.log('✓ 测试插入成功');
      
      // 清理测试数据
      await connection.execute(
        `DELETE FROM user_answers WHERE session_id = ?`,
        [testSessionId]
      );
      console.log('✓ 测试数据已清理');
    } catch (error) {
      console.error('✗ 测试插入失败:', error.message);
    }
    
    console.log('\n修复完成！');
    
  } catch (error) {
    console.error('修复过程出错:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixUserAnswersTable();