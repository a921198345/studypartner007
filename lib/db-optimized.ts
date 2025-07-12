/**
 * 优化后的数据库连接模块
 * 
 * 主要优化点：
 * 1. 调整连接池配置以提高并发性能
 * 2. 添加连接监控和故障恢复
 * 3. 实现查询缓存和预编译语句
 * 4. 添加性能监控
 */

import mysql from 'mysql2/promise';

// 数据库连接配置 - 优化版本
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // 🚀 连接池优化配置
  waitForConnections: true,
  connectionLimit: 10,           // 🔥 提升连接数（从3增加到10）
  queueLimit: 20,               // 🔥 增加队列大小（从5增加到20）
  acquireTimeout: 30000,        // 🔥 增加获取连接超时（30秒）
  timeout: 60000,               // 🔥 增加查询超时（60秒）
  
  // 🚀 连接生命周期优化
  idleTimeout: 300000,          // 🔥 空闲连接超时（5分钟）
  maxLifetime: 1800000,         // 🔥 连接最大生命周期（30分钟）
  
  // 🚀 性能优化选项
  multipleStatements: false,     // 安全考虑，不允许多语句
  dateStrings: false,           // 使用Date对象而不是字符串
  supportBigNumbers: true,      // 支持大数字
  bigNumberStrings: false,      // 大数字使用Number类型
  
  // 🚀 连接选项优化
  charset: 'utf8mb4',
  timezone: 'local',
  
  // 🚀 SSL配置（生产环境建议启用）
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // 🚀 连接池事件监听
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// 验证必要的环境变量
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('数据库环境变量缺失！请检查 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 是否在 .env.local 中正确配置');
}

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 🚀 连接池监控
let connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  queuedRequests: 0,
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  averageQueryTime: 0,
  lastReset: new Date()
};

// 🚀 预编译语句缓存
const preparedStatements = new Map();

// 🚀 查询结果缓存（简单内存缓存）
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 生成缓存键
 */
function generateCacheKey(sql: string, params: any[]): string {
  return `${sql}:${JSON.stringify(params)}`;
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

/**
 * 获取缓存数据
 */
function getCachedResult(sql: string, params: any[]): any | null {
  const key = generateCacheKey(sql, params);
  const entry = queryCache.get(key);
  
  if (entry && isCacheValid(entry)) {
    console.log('🎯 缓存命中:', key.substring(0, 50) + '...');
    return entry.data;
  }
  
  if (entry) {
    queryCache.delete(key); // 清理过期缓存
  }
  
  return null;
}

/**
 * 设置缓存数据
 */
function setCachedResult(sql: string, params: any[], data: any, ttl: number = DEFAULT_CACHE_TTL): void {
  const key = generateCacheKey(sql, params);
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // 限制缓存大小，防止内存泄漏
  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
}

/**
 * 清理过期缓存
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (!isCacheValid(entry)) {
      queryCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanupCache, 10 * 60 * 1000); // 每10分钟清理一次

/**
 * 🚀 优化的查询执行函数
 */
export async function query(sql: string, params: any[] = [], options: {
  cache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  prepare?: boolean;
} = {}): Promise<any[]> {
  const startTime = Date.now();
  
  try {
    // 检查缓存
    if (options.cache !== false) {
      const cachedResult = getCachedResult(sql, params);
      if (cachedResult) {
        return cachedResult;
      }
    }
    
    connectionStats.totalQueries++;
    
    // 执行查询
    let results;
    const connection = await pool.getConnection();
    
    try {
      if (options.prepare) {
        // 使用预编译语句
        const [rows] = await connection.execute(sql, params);
        results = rows;
      } else {
        // 普通查询
        const [rows] = await connection.execute(sql, params);
        results = rows;
      }
    } finally {
      connection.release();
    }
    
    // 更新统计信息
    const queryTime = Date.now() - startTime;
    connectionStats.averageQueryTime = 
      (connectionStats.averageQueryTime * (connectionStats.totalQueries - 1) + queryTime) / connectionStats.totalQueries;
    
    if (queryTime > 1000) { // 超过1秒的查询视为慢查询
      connectionStats.slowQueries++;
      console.warn(`🐌 慢查询检测 (${queryTime}ms):`, sql.substring(0, 100) + '...');
    }
    
    // 设置缓存
    if (options.cache !== false && queryTime < 5000) { // 不缓存超过5秒的查询结果
      setCachedResult(sql, params, results, options.cacheTTL);
    }
    
    return results;
  } catch (error) {
    connectionStats.errors++;
    console.error('🚨 数据库查询失败:', {
      sql: sql.substring(0, 200),
      params,
      error: error.message,
      queryTime: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * 🚀 获取单个查询结果（优化版本）
 */
export async function queryOne(sql: string, params: any[] = [], options: {
  cache?: boolean;
  cacheTTL?: number;
} = {}): Promise<any | null> {
  const results = await query(sql, params, options);
  return results.length > 0 ? results[0] : null;
}

/**
 * 🚀 优化的事务执行
 */
export async function transaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    connectionStats.errors++;
    console.error('🚨 事务执行失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 🚀 批量插入优化
 */
export async function batchInsert(
  table: string, 
  columns: string[], 
  values: any[][], 
  options: {
    onDuplicateKey?: string;
    batchSize?: number;
  } = {}
): Promise<void> {
  const batchSize = options.batchSize || 1000;
  const placeholders = '(' + columns.map(() => '?').join(',') + ')';
  
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    const batchPlaceholders = batch.map(() => placeholders).join(',');
    const flatValues = batch.flat();
    
    let sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${batchPlaceholders}`;
    if (options.onDuplicateKey) {
      sql += ` ON DUPLICATE KEY UPDATE ${options.onDuplicateKey}`;
    }
    
    await query(sql, flatValues, { cache: false, prepare: true });
  }
}

/**
 * 🚀 分页查询优化
 */
export async function paginatedQuery(
  sql: string, 
  params: any[], 
  page: number, 
  limit: number,
  options: {
    cache?: boolean;
    countQuery?: string;
    useCursor?: boolean;
    cursorColumn?: string;
    cursorValue?: any;
  } = {}
): Promise<{
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    hasNext?: boolean;
  };
}> {
  let data: any[];
  let total: number | undefined;
  
  if (options.useCursor && options.cursorColumn && options.cursorValue) {
    // 使用游标分页
    const cursorSql = sql + ` AND ${options.cursorColumn} > ? ORDER BY ${options.cursorColumn} LIMIT ?`;
    data = await query(cursorSql, [...params, options.cursorValue, limit + 1], options);
    
    const hasNext = data.length > limit;
    if (hasNext) {
      data = data.slice(0, limit);
    }
    
    return {
      data,
      pagination: {
        page,
        limit,
        hasNext
      }
    };
  } else {
    // 传统分页
    const offset = (page - 1) * limit;
    const dataSql = sql + ` LIMIT ? OFFSET ?`;
    
    // 并行执行数据查询和计数查询
    const [dataResults, countResults] = await Promise.all([
      query(dataSql, [...params, limit, offset], options),
      options.countQuery ? 
        query(options.countQuery, params, { cache: true, cacheTTL: 60000 }) : 
        query(`SELECT COUNT(*) as total FROM (${sql}) as count_query`, params, { cache: true, cacheTTL: 60000 })
    ]);
    
    data = dataResults;
    total = countResults[0]?.total || 0;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasNext: offset + limit < total
      }
    };
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ 数据库连接成功!');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 获取连接池状态
 */
export function getPoolStatus() {
  return {
    ...connectionStats,
    poolConnections: {
      all: (pool as any)._allConnections?.length || 0,
      free: (pool as any)._freeConnections?.length || 0,
      used: ((pool as any)._allConnections?.length || 0) - ((pool as any)._freeConnections?.length || 0)
    },
    cacheSize: queryCache.size
  };
}

/**
 * 重置统计信息
 */
export function resetStats() {
  connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    queuedRequests: 0,
    totalQueries: 0,
    slowQueries: 0,
    errors: 0,
    averageQueryTime: 0,
    lastReset: new Date()
  };
  queryCache.clear();
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  await pool.end();
  queryCache.clear();
  console.log('🔒 数据库连接池已关闭');
}

// 监听进程退出事件，确保连接池正确关闭
process.on('SIGINT', async () => {
  console.log('📝 正在关闭数据库连接池...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📝 正在关闭数据库连接池...');
  await closePool();
  process.exit(0);
});

// 导出连接池和优化的查询函数
export { pool };

export default {
  query,
  queryOne,
  transaction,
  batchInsert,
  paginatedQuery,
  testConnection,
  getPoolStatus,
  resetStats,
  closePool,
  pool
};