/**
 * 数据库迁移执行脚本
 * 
 * 执行数据库迁移文件
 */

import { promises as fs } from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true // 允许多语句执行
};

/**
 * 执行迁移文件
 */
async function runMigrations() {
  let connection;
  
  try {
    console.log('开始执行数据库迁移...');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 读取迁移文件目录
    const migrationsDir = path.join(process.cwd(), 'db', 'migrate');
    const files = await fs.readdir(migrationsDir);
    
    // 排序迁移文件（按文件名）
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`找到 ${migrationFiles.length} 个迁移文件`);
    
    // 逐个执行迁移文件
    for (const file of migrationFiles) {
      console.log(`执行迁移: ${file}`);
      const filePath = path.join(migrationsDir, file);
      
      // 读取SQL文件内容
      const sql = await fs.readFile(filePath, 'utf8');
      
      // 执行SQL
      await connection.query(sql);
      
      console.log(`迁移 ${file} 执行成功`);
    }
    
    console.log('所有迁移已成功执行');
    
  } catch (error) {
    console.error('执行迁移时出错:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行迁移
runMigrations(); 