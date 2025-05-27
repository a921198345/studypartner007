   // lib/cache.js
   const redisClient = require('../config/redis');

   // 数据保存时间(秒)
   const DEFAULT_EXPIRATION = 3600; // 1小时

   // 缓存工具
   class CacheService {
     // 获取缓存数据
     async get(key) {
       try {
         const data = await redisClient.get(key);
         if (data) {
           console.log(`从缓存找到了：${key}`);
           return JSON.parse(data);
         }
         console.log(`缓存里没有：${key}`);
         return null;
       } catch (error) {
         console.error('获取缓存出错了:', error);
         return null;
       }
     }

     // 保存数据到缓存
     async set(key, value, expiration = DEFAULT_EXPIRATION) {
       try {
         const stringValue = JSON.stringify(value);
         await redisClient.set(key, stringValue, {
           EX: expiration
         });
         console.log(`已保存到缓存：${key}`);
         return true;
       } catch (error) {
         console.error('保存缓存出错了:', error);
         return false;
       }
     }

     // 删除缓存数据
     async delete(key) {
       try {
         await redisClient.del(key);
         console.log(`已删除缓存：${key}`);
         return true;
       } catch (error) {
         console.error('删除缓存出错了:', error);
         return false;
       }
     }

     // 清除所有相关缓存
     async clear(pattern) {
       try {
         const keys = await redisClient.keys(pattern);
         if (keys.length > 0) {
           await redisClient.del(keys);
           console.log(`已清除${keys.length}条缓存`);
         }
         return true;
       } catch (error) {
         console.error('清除缓存出错了:', error);
         return false;
       }
     }
   }

   module.exports = new CacheService();