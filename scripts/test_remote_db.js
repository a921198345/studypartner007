/**
 * 远程数据库连接测试脚本
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// 打印当前环境变量（不包含敏感信息）
console.log('当前数据库配置:');
console.log(`- 主机: ${process.env.DB_HOST}`);
console.log(`- 用户: ${process.env.DB_USER}`);
console.log(`- 数据库: ${process.env.DB_NAME}`);
console.log(`- 端口: ${process.env.DB_PORT || '3306'}`);

async function testRemoteConnection() {
  // 输入宝塔面板的数据库信息
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'law_exam_assistant'
  };

  console.log('尝试连接数据库...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功！');
    
    // 检查数据库表
    console.log('检查数据库表...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('数据库表:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    // 检查 mind_maps 表是否存在
    const [mindMapTables] = await connection.query('SHOW TABLES LIKE "mind_maps"');
    if (mindMapTables.length === 0) {
      console.log('创建 mind_maps 表...');
      await createMindMapsTable(connection);
    } else {
      console.log('mind_maps 表已存在');
      
      // 查看表结构
      const [columns] = await connection.query('SHOW COLUMNS FROM mind_maps');
      console.log('表结构:');
      columns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      // 检查是否有数据
      const [countResult] = await connection.query('SELECT COUNT(*) as count FROM mind_maps');
      console.log(`表中有 ${countResult[0].count} 条记录`);
      
      if (countResult[0].count === 0) {
        // 创建示例数据
        await createSampleData(connection);
      } else {
        // 显示现有数据
        const [rows] = await connection.query('SELECT id, subject_name FROM mind_maps');
        console.log('现有知识导图:');
        rows.forEach(row => {
          console.log(`- ID: ${row.id}, 学科: ${row.subject_name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('数据库连接或操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

async function createMindMapsTable(connection) {
  try {
    await connection.query(`
      CREATE TABLE mind_maps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_name VARCHAR(255) NOT NULL UNIQUE,
        map_data JSON NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);
    console.log('mind_maps 表创建成功');
  } catch (error) {
    console.error('创建 mind_maps 表失败:', error);
  }
}

async function createSampleData(connection) {
  try {
    const sampleData = {
      name: '民法',
      children: [
        {
          name: '民法总则',
          children: [
            { name: '基本规定' },
            { name: '自然人' },
            { name: '法人' },
            { name: '民事法律行为' },
            { name: '代理' },
            { name: '民事权利' },
            { name: '民事责任' },
            { name: '诉讼时效' }
          ]
        },
        {
          name: '物权法',
          children: [
            { name: '通则' },
            { name: '所有权' },
            { name: '用益物权' },
            { name: '担保物权' },
            { name: '占有' }
          ]
        },
        {
          name: '合同法',
          children: [
            { name: '通则' },
            { name: '合同的订立' },
            { name: '合同的效力' },
            { name: '合同的履行' },
            { name: '合同的变更和转让' },
            { name: '合同的权利义务终止' },
            { name: '违约责任' }
          ]
        }
      ]
    };
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.query(
      'INSERT INTO mind_maps (subject_name, map_data, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['民法', JSON.stringify(sampleData), now, now]
    );
    
    console.log('示例民法导图数据创建成功');
  } catch (error) {
    console.error('创建示例数据失败:', error);
  }
}

// 执行测试
testRemoteConnection(); 