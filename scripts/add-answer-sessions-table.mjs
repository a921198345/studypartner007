import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addAnswerSessionsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'law_exam_assistant'
  });

  try {
    console.log('=== 创建答题会话相关表 ===\n');

    // 1. 创建 answer_sessions 表
    const createSessionsTableSQL = `
      CREATE TABLE IF NOT EXISTS answer_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(255) NOT NULL UNIQUE COMMENT '会话唯一标识',
        user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID，未登录用户为NULL',
        client_session_id VARCHAR(255) DEFAULT NULL COMMENT '客户端会话ID，用于未登录用户',
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
        end_time TIMESTAMP NULL DEFAULT NULL COMMENT '结束时间',
        questions_answered INT NOT NULL DEFAULT 0 COMMENT '已答题数',
        correct_count INT NOT NULL DEFAULT 0 COMMENT '答对题数',
        total_questions INT NOT NULL DEFAULT 0 COMMENT '总题数',
        source VARCHAR(50) DEFAULT 'all' COMMENT '题目来源：all/wrong/favorites',
        subject VARCHAR(255) DEFAULT NULL COMMENT '科目',
        years JSON DEFAULT NULL COMMENT '年份数组',
        question_types JSON DEFAULT NULL COMMENT '题型数组',
        search_keyword VARCHAR(255) DEFAULT NULL COMMENT '搜索关键词',
        last_question_id INT DEFAULT NULL COMMENT '最后答题ID',
        filters JSON DEFAULT NULL COMMENT '筛选条件JSON',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_session_id (session_id),
        INDEX idx_user_id (user_id),
        INDEX idx_client_session_id (client_session_id),
        INDEX idx_start_time (start_time),
        INDEX idx_source (source),
        INDEX idx_subject (subject)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题会话表';
    `;

    await connection.execute(createSessionsTableSQL);
    console.log('✅ answer_sessions 表创建成功！');

    // 2. 创建 session_answers 表（关联会话和答题记录）
    const createSessionAnswersTableSQL = `
      CREATE TABLE IF NOT EXISTS session_answers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
        answer_id INT NOT NULL COMMENT '答题记录ID',
        question_id INT NOT NULL COMMENT '题目ID',
        order_num INT NOT NULL COMMENT '答题顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_session_id (session_id),
        INDEX idx_answer_id (answer_id),
        INDEX idx_question_id (question_id),
        INDEX idx_order_num (order_num),
        
        CONSTRAINT fk_session_answers_session FOREIGN KEY (session_id) 
          REFERENCES answer_sessions(session_id) ON DELETE CASCADE,
        CONSTRAINT fk_session_answers_answer FOREIGN KEY (answer_id) 
          REFERENCES user_answers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话答题关联表';
    `;

    await connection.execute(createSessionAnswersTableSQL);
    console.log('✅ session_answers 表创建成功！');

    // 3. 修改 user_answers 表，添加 session_id 字段（如果不存在）
    const checkColumnSQL = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_answers' 
      AND COLUMN_NAME = 'session_id'
    `;
    
    const [columnExists] = await connection.execute(checkColumnSQL);
    
    if (columnExists[0].count === 0) {
      const alterTableSQL = `
        ALTER TABLE user_answers 
        ADD COLUMN session_id VARCHAR(255) DEFAULT NULL COMMENT '答题会话ID' AFTER user_id,
        ADD INDEX idx_session_id (session_id)
      `;
      
      await connection.execute(alterTableSQL);
      console.log('✅ user_answers 表添加 session_id 字段成功！');
    } else {
      console.log('⚠️  user_answers 表已有 session_id 字段，跳过');
    }

    // 4. 创建一个视图，方便查询会话统计信息
    const createViewSQL = `
      CREATE OR REPLACE VIEW v_session_statistics AS
      SELECT 
        s.session_id,
        s.user_id,
        s.client_session_id,
        s.start_time,
        s.end_time,
        s.source,
        s.subject,
        s.questions_answered,
        s.correct_count,
        s.total_questions,
        CASE 
          WHEN s.questions_answered > 0 
          THEN ROUND((s.correct_count / s.questions_answered) * 100, 2)
          ELSE 0 
        END as accuracy_rate,
        CASE 
          WHEN s.total_questions > 0 
          THEN ROUND((s.questions_answered / s.total_questions) * 100, 2)
          ELSE 0 
        END as completion_rate,
        TIMESTAMPDIFF(MINUTE, s.start_time, IFNULL(s.end_time, NOW())) as duration_minutes
      FROM answer_sessions s
    `;

    await connection.execute(createViewSQL);
    console.log('✅ 会话统计视图创建成功！');

    // 验证表是否创建成功
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'answer_sessions'"
    );
    
    if (tables.length > 0) {
      console.log('\n验证：表已成功创建');
      
      // 显示表结构
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM answer_sessions"
      );
      console.log('\nanswer_sessions 表结构：');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('创建表失败:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n数据库连接已关闭');
  }
}

// 执行脚本
addAnswerSessionsTable().catch(console.error);