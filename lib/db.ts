/**
 * 数据库连接模块
 * 
 * 提供MySQL数据库连接的工具函数
 */

import mysql from 'mysql2/promise';

// 数据库连接配置
// 注意：Next.js 会自动加载 .env.local 文件
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000 // 连接超时时间设置为30秒
};

// 验证必要的环境变量
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('数据库环境变量缺失！请检查 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 是否在 .env.local 中正确配置');
}

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 导出连接池以便其他模块直接使用
export { pool };

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

// 测试数据库连接
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

/**
 * 获取数据库连接
 * @returns {Promise<Connection>} - 数据库连接对象
 */
export async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('获取数据库连接失败:', error);
    throw error;
  }
}

export default {
  query,
  queryOne,
  transaction,
  testConnection,
  getConnection,
  pool
}; 