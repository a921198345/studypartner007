// config/redis.js
const { createClient } = require('redis');

// Redis客户端配置
const redisClient = createClient({
  url: 'redis://localhost:6379',  // Redis服务器地址
  password: '你的Redis密码',       // 替换为你刚才在配置文件中设置的密码
});

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