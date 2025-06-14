import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function clearAllQuestions() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'law_exam_assistant',
      port: process.env.DB_PORT || 3306
    });

    console.log('已连接到数据库');

    // 获取所有表名
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    `, [process.env.DB_NAME || 'law_exam_assistant']);

    console.log('\n找到以下表:');
    tables.forEach(table => console.log(`- ${table.TABLE_NAME}`));

    // 安全删除各个表的数据
    const tablesToClear = [
      { name: 'user_answers', description: '答题记录' },
      { name: 'user_favorites', description: '收藏记录' },
      { name: 'user_wrong_answers', description: '错题记录' },
      { name: 'questions', description: '题目' }
    ];

    console.log('\n开始清空数据...');
    
    for (const table of tablesToClear) {
      // 检查表是否存在
      const tableExists = tables.some(t => t.TABLE_NAME === table.name);
      
      if (tableExists) {
        try {
          const [result] = await connection.execute(`DELETE FROM ${table.name}`);
          console.log(`✓ 已删除 ${result.affectedRows} 条${table.description}`);
          
          // 重置自增ID
          await connection.execute(`ALTER TABLE ${table.name} AUTO_INCREMENT = 1`);
        } catch (error) {
          console.log(`✗ 清空 ${table.name} 表时出错: ${error.message}`);
        }
      } else {
        console.log(`- 表 ${table.name} 不存在，跳过`);
      }
    }

    console.log('\n✅ 数据清空完成！');
    console.log('\n您现在可以重新上传题目了。');
    console.log('上传地址: http://localhost:3000/admin/upload-questions');

  } catch (error) {
    console.error('操作时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 直接执行
console.log('='.repeat(60));
console.log('法考真题数据库清空工具');
console.log('='.repeat(60));

clearAllQuestions();