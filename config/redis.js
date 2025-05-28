// config/redis.js
const { createClient } = require('redis');

// Redis客户端配置
const config = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',  // Redis服务器地址
};

// 只有环境变量中设置了密码才添加密码配置
if (process.env.REDIS_PASSWORD) {
  config.password = process.env.REDIS_PASSWORD;
}

const redisClient = createClient(config);

// 连接事件
redisClient.on('error', (err) => console.log('Redis连接错误', err));
redisClient.on('connect', () => console.log('Redis已连接'));
redisClient.on('reconnecting', () => console.log('Redis重新连接中...'));
redisClient.on('ready', () => console.log('Redis准备就绪!'));

// 连接Redis
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;