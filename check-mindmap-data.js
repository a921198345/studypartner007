// 检查知识导图数据
import mysql from 'mysql2/promise';

const dbConfig = {
  host: '8.141.4.192',
  port: 3306,
  user: 'law_user',
  password: 'Accd0726351x.',
  database: 'law_exam_assistant',
  charset: 'utf8mb4'
};

async function checkMindMapData() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 检查表结构
    console.log('\n=== 检查知识导图相关表 ===');
    const tables = await connection.execute('SHOW TABLES LIKE "%mind%"');
    console.log('知识导图相关表:', tables[0]);
    
    if (tables[0].length === 0) {
      console.log('没有找到知识导图相关表');
      return;
    }
    
    // 检查表结构
    for (const table of tables[0]) {
      const tableName = Object.values(table)[0];
      console.log(`\n=== ${tableName} 表结构 ===`);
      const columns = await connection.execute(`SHOW COLUMNS FROM ${tableName}`);
      console.log(columns[0]);
    }
    
    // 检查数据
    console.log('\n=== 检查知识导图数据 ===');
    const data = await connection.execute('SELECT * FROM mind_maps');
    console.log('总记录数:', data[0].length);
    
    for (const row of data[0]) {
      console.log(`\n学科: ${row.subject_name}`);
      console.log(`ID: ${row.id}`);
      console.log(`创建时间: ${row.created_at}`);
      console.log(`更新时间: ${row.updated_at}`);
      
      // 解析JSON数据
      try {
        const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : row.map_data;
        console.log(`根节点名称: ${mapData.name}`);
        console.log(`子节点数量: ${mapData.children ? mapData.children.length : 0}`);
        
        if (mapData.children) {
          console.log('主要章节:');
          mapData.children.forEach((child, index) => {
            console.log(`  ${index + 1}. ${child.name}`);
          });
        }
      } catch (e) {
        console.log('JSON解析失败:', e.message);
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMindMapData();