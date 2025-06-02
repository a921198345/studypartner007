// config/redis.js
const { createClient } = require('redis');

// 模拟Redis客户端，在Redis不可用时使用
class MockRedisClient {
  constructor() {
    this.store = new Map();
    console.log('⚠️ 使用内存模拟Redis，数据不会持久化或在实例间共享');
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, options = {}) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key) {
    if (Array.isArray(key)) {
      key.forEach(k => this.store.delete(k));
      return key.length;
    }
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern) {
    // 简单模拟，只支持"*"通配符
    if (pattern === '*') {
      return Array.from(this.store.keys());
    }
    // 简单的模式匹配，只处理前后缀*
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  // 其他操作的空实现
  async connect() { return true; }
  async disconnect() { return true; }
}

// 默认使用内存模拟模式，不尝试连接Redis
console.log('⚠️ 当前配置为默认使用内存模拟Redis模式');
let redisClient = new MockRedisClient();
let isUsingMock = true;

// 导出增强的Redis客户端
const enhancedClient = {
  ...redisClient,
  isUsingMock: () => isUsingMock,
  
  // 包装方法确保不会因Redis错误导致应用崩溃
  get: async (key) => {
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.log(`⚠️ Redis get("${key}")操作失败:`, err.message);
      return null;
    }
  },
  
  set: async (key, value, options = {}) => {
    try {
      return await redisClient.set(key, value, options);
    } catch (err) {
      console.log(`⚠️ Redis set("${key}")操作失败:`, err.message);
      return 'ERROR';
    }
  },
  
  del: async (key) => {
    try {
      return await redisClient.del(key);
    } catch (err) {
      console.log(`⚠️ Redis del操作失败:`, err.message);
      return 0;
    }
  },
  
  keys: async (pattern) => {
    try {
      return await redisClient.keys(pattern);
    } catch (err) {
      console.log(`⚠️ Redis keys("${pattern}")操作失败:`, err.message);
      return [];
    }
  }
};

module.exports = enhancedClient;