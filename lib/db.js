/**
 * 数据库连接模块
 * 
 * 提供MySQL数据库连接的工具函数
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000 // 连接超时时间设置为30秒
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

/**
 * 执行SQL查询
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} - 查询结果
 */
export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw error;
  }
}

/**
 * 获取单个查询结果
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Object|null>} - 查询结果对象或null
 */
export async function queryOne(sql, params) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数，接收connection参数
 * @returns {Promise<any>} - 事务执行的结果
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接是否成功
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功!');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 导出所有函数，不用默认导出
export {
  pool
};