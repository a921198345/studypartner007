require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const runSql = async (connection, sql) => {
  try {
    await connection.query(sql);
    console.log('SQL executed successfully');
    return true;
  } catch (error) {
    console.error('SQL execution error:', error.message);
    return false;
  }
};

const initializeDatabase = async () => {
  // 数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // 允许执行多条SQL语句
  };

  let connection;

  try {
    // 连接MySQL（不指定数据库名）
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server');
    
    // 创建数据库（如果不存在）
    const dbName = process.env.DB_NAME || 'law_exam';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database '${dbName}' created or already exists`);
    
    // 使用该数据库
    await connection.query(`USE ${dbName}`);
    console.log(`Using database '${dbName}'`);
    
    // 读取SQL文件内容
    const schemaFilePath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaFilePath, 'utf8');
    
    // 执行SQL语句创建表
    const success = await runSql(connection, schemaSql);
    
    if (success) {
      console.log('Database tables created successfully');
    } else {
      console.error('Failed to create database tables');
    }
    
    // 检查是否成功创建表
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in database:');
    rows.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`- ${tableName}`);
    });

    return success;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
};

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('Database initialization completed successfully');
        process.exit(0);
      } else {
        console.error('Database initialization failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error during database initialization:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase }; 