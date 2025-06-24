#!/usr/bin/env node

/**
 * 执行会员功能数据库迁移脚本
 * 
 * 使用方法：
 * node scripts/run-membership-migration.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'law_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'law_exam_assistant',
  charset: 'utf8mb4',
  multipleStatements: true // 允许执行多条SQL语句
};

async function runMigration() {
  let connection;
  
  try {
    console.log('开始执行会员功能数据库迁移...');
    
    // 连接数据库
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('数据库连接成功');
    
    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../db/migrate/004_add_membership_features.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`迁移文件不存在: ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('迁移文件读取成功');
    
    // 分割SQL语句（按分号分割，但保留存储过程等复合语句）
    const statements = migrationSql
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // 按分号分割，但忽略引号内的分号
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--')); // 过滤空语句和注释
    
    console.log(`准备执行 ${statements.length} 条SQL语句`);
    
    // 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('DELIMITER') || statement.length < 10) {
        continue; // 跳过DELIMITER语句和过短的语句
      }
      
      try {
        console.log(`执行第 ${i + 1} 条语句...`);
        await connection.execute(statement);
        console.log(`✓ 第 ${i + 1} 条语句执行成功`);
      } catch (error) {
        // 对于一些可能已存在的结构，只是警告而不中断
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠ 第 ${i + 1} 条语句跳过 (已存在): ${error.message}`);
        } else {
          console.error(`✗ 第 ${i + 1} 条语句执行失败:`, error.message);
          console.error('语句内容:', statement.substring(0, 200) + '...');
          throw error;
        }
      }
    }
    
    // 验证迁移结果
    console.log('验证迁移结果...');
    
    // 检查users表是否有新字段
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM users LIKE 'daily_ai_queries_used'"
    );
    
    if (columns.length > 0) {
      console.log('✓ users表字段添加成功');
    } else {
      console.log('⚠ users表字段可能未添加成功');
    }
    
    // 检查新表是否创建
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'membership_orders'"
    );
    
    if (tables.length > 0) {
      console.log('✓ membership_orders表创建成功');
    } else {
      console.log('⚠ membership_orders表可能未创建成功');
    }
    
    console.log('会员功能数据库迁移完成！');
    console.log('\n后续步骤:');
    console.log('1. 检查应用是否正常启动');
    console.log('2. 测试会员功能API');
    console.log('3. 配置定时任务重置每日使用次数');
    console.log('4. 配置支付回调地址');
    
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;