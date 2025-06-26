require('dotenv').config();
const mysql = require('mysql2/promise');

const addUserAnswersTable = async () => {
  // 数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'law_exam',
    multipleStatements: true
  };

  let connection;

  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('已连接到数据库');
    
    // 创建 user_answers 表的 SQL
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`user_answers\` (
        \`id\` INT PRIMARY KEY AUTO_INCREMENT,
        \`user_id\` INT NOT NULL COMMENT '用户ID',
        \`question_id\` INT NOT NULL COMMENT '题目ID',
        \`submitted_answer\` VARCHAR(255) NOT NULL COMMENT '用户提交的答案',
        \`is_correct\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否正确，0-错误，1-正确',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '答题时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        -- 添加索引以提高查询性能
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_question_id\` (\`question_id\`),
        INDEX \`idx_user_question\` (\`user_id\`, \`question_id\`),
        INDEX \`idx_created_at\` (\`created_at\`),
        
        -- 外键约束
        CONSTRAINT \`fk_user_answers_question\` FOREIGN KEY (\`question_id\`) REFERENCES \`questions\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户答题记录表';
    `;
    
    // 执行创建表的SQL
    await connection.query(createTableSql);
    console.log('user_answers 表创建成功（如果之前不存在）');
    
    // 检查表是否创建成功
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'user_answers'"
    );
    
    if (tables.length > 0) {
      console.log('✓ user_answers 表已存在');
      
      // 获取表结构信息
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM user_answers"
      );
      
      console.log('\n表结构：');
      console.table(columns.map(col => ({
        字段: col.Field,
        类型: col.Type,
        允许为空: col.Null,
        键: col.Key,
        默认值: col.Default,
        其他: col.Extra
      })));
      
      // 获取表中的记录数
      const [countResult] = await connection.query(
        "SELECT COUNT(*) as count FROM user_answers"
      );
      console.log(`\n当前表中有 ${countResult[0].count} 条记录`);
    } else {
      console.error('× user_answers 表创建失败');
    }
    
    return true;
  } catch (error) {
    console.error('执行过程中出错:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('表已经存在，这是正常的');
      return true;
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
};

// 如果直接运行此脚本，则执行添加表操作
if (require.main === module) {
  console.log('开始添加 user_answers 表...\n');
  
  addUserAnswersTable()
    .then(success => {
      if (success) {
        console.log('\n✓ 操作完成！');
        console.log('\n下一步操作：');
        console.log('1. 重启应用服务器');
        console.log('2. 测试答题功能，确认答题历史能正常保存和显示');
        process.exit(0);
      } else {
        console.error('\n× 操作失败！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n未处理的错误:', error);
      process.exit(1);
    });
}

module.exports = { addUserAnswersTable };