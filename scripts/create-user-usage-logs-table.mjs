import mysql from 'mysql2/promise';

async function createUserUsageLogsTable() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('数据库连接成功');

    // 创建用户使用日志表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        feature_type VARCHAR(50) NOT NULL COMMENT '功能类型：ai_chat, mindmap, question_bank, notes',
        action VARCHAR(50) NOT NULL COMMENT '操作类型：view, create, update, delete',
        resource_id VARCHAR(100) DEFAULT NULL COMMENT '资源ID（可选）',
        usage_date DATE NOT NULL COMMENT '使用日期',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, usage_date),
        INDEX idx_feature_type (feature_type),
        INDEX idx_usage_date (usage_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户功能使用日志表'
    `;

    await connection.execute(createTableSQL);
    console.log('✅ user_usage_logs 表创建成功');

    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_usage_logs'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 确认 user_usage_logs 表已存在');
      
      // 显示表结构
      const [columns] = await connection.execute(
        "DESCRIBE user_usage_logs"
      );
      
      console.log('表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`);
      });
    } else {
      console.error('❌ user_usage_logs 表创建失败');
    }

  } catch (error) {
    console.error('创建表时出错:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行创建表操作
createUserUsageLogsTable()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }); 