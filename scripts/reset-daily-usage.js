#!/usr/bin/env node

/**
 * 每日重置AI查询次数的定时任务脚本
 * 
 * 使用方法：
 * 1. 直接运行: node scripts/reset-daily-usage.js
 * 2. 添加到crontab: 0 0 * * * /usr/bin/node /path/to/law-exam-assistant/scripts/reset-daily-usage.js
 * 3. 使用PM2管理: pm2 start scripts/reset-daily-usage.js --cron "0 0 * * *"
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'law_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'law_exam_assistant',
  charset: 'utf8mb4'
};

async function resetDailyUsage() {
  let connection;
  
  try {
    console.log(`[${new Date().toISOString()}] 开始执行每日重置任务`);
    
    // 连接数据库
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('数据库连接成功');
    
    // 获取需要重置的用户数量
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE daily_ai_queries_used > 0 
         AND (last_ai_query_date < CURDATE() OR last_ai_query_date IS NULL)`
    );
    
    const userCount = countResult[0].count;
    console.log(`发现 ${userCount} 个用户需要重置AI查询次数`);
    
    if (userCount > 0) {
      // 重置AI查询次数
      const [result] = await connection.execute(
        `UPDATE users 
         SET daily_ai_queries_used = 0,
             last_ai_query_date = NULL
         WHERE daily_ai_queries_used > 0 
           AND (last_ai_query_date < CURDATE() OR last_ai_query_date IS NULL)`
      );
      
      console.log(`成功重置 ${result.affectedRows} 个用户的AI查询次数`);
    }
    
    // 清理过期的会员
    const [expiredResult] = await connection.execute(
      `UPDATE users 
       SET membership_type = 'free_user'
       WHERE membership_type = 'active_member' 
         AND membership_expires_at < CURDATE()`
    );
    
    if (expiredResult.affectedRows > 0) {
      console.log(`处理 ${expiredResult.affectedRows} 个过期会员，已转为免费用户`);
    }
    
    // 清理过期的使用日志（保留30天）
    const [logCleanResult] = await connection.execute(
      `DELETE FROM user_usage_logs 
       WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    if (logCleanResult.affectedRows > 0) {
      console.log(`清理 ${logCleanResult.affectedRows} 条过期使用日志`);
    }
    
    console.log(`[${new Date().toISOString()}] 每日重置任务执行完成`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 每日重置任务执行失败:`, error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetDailyUsage();
}

module.exports = resetDailyUsage;