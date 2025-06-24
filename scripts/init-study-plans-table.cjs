/**
 * 初始化学习计划表
 */

const mysql = require('mysql2/promise')

const dbConfig = {
  host: process.env.DB_HOST || '8.141.4.192',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'law_user',
  password: process.env.DB_PASSWORD || 'Accd0726351x.',
  database: process.env.DB_NAME || 'law_exam_assistant',
  connectTimeout: 30000
}

async function initStudyPlansTable() {
  let connection
  
  try {
    console.log('连接数据库...')
    connection = await mysql.createConnection(dbConfig)
    
    console.log('创建学习计划表...')
    
    // 创建学习计划表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS study_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'anonymous',
        session_id VARCHAR(255) DEFAULT 'default',
        plan_data JSON NOT NULL,
        plan_type ENUM('generated', 'manual') DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_session (user_id, session_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
    
    await connection.execute(createTableSQL)
    console.log('✅ study_plans 表创建成功')
    
    // 检查表是否创建成功
    const [tables] = await connection.execute("SHOW TABLES LIKE 'study_plans'")
    if (tables.length > 0) {
      console.log('✅ 表创建验证成功')
      
      // 显示表结构
      const [columns] = await connection.execute('DESCRIBE study_plans')
      console.log('表结构:')
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Extra}`)
      })
    }
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    throw error
  } finally {
    if (connection) {
      await connection.end()
      console.log('数据库连接已关闭')
    }
  }
}

// 执行初始化
if (require.main === module) {
  initStudyPlansTable()
    .then(() => {
      console.log('🎉 学习计划表初始化完成!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 初始化失败:', error)
      process.exit(1)
    })
}

module.exports = { initStudyPlansTable }