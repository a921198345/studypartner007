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

// Redis客户端配置
const config = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',  // Redis服务器地址
  socket: {
    reconnectStrategy: (retries) => {
      // 最多尝试5次重连，每次间隔增加
      if (retries > 5) {
        console.log('⚠️ Redis连接失败次数过多，切换到模拟模式');
        return false; // 停止尝试重连
      }
      return Math.min(retries * 1000, 3000); // 1s, 2s, 3s, ...，最多3秒
    }
  }
};

// 只有环境变量中设置了密码才添加密码配置
if (process.env.REDIS_PASSWORD) {
  config.password = process.env.REDIS_PASSWORD;
}

// 创建Redis客户端
let redisClient;
let isUsingMock = false;

try {
  redisClient = createClient(config);

  // 连接事件
  redisClient.on('error', (err) => {
    console.log('Redis连接错误', err);
  });
  redisClient.on('connect', () => console.log('Redis已连接'));
  redisClient.on('reconnecting', () => console.log('Redis重新连接中...'));
  redisClient.on('ready', () => console.log('Redis准备就绪!'));

  // 连接Redis
  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.log('⚠️ Redis连接失败，切换到内存模拟模式:', err.message);
      isUsingMock = true;
      redisClient = new MockRedisClient();
    }
  })();
} catch (err) {
  console.log('⚠️ Redis初始化失败，使用内存模拟模式:', err.message);
  isUsingMock = true;
  redisClient = new MockRedisClient();
}

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