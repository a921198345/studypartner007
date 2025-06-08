import 'dotenv/config';
import { testConnection, query } from './lib/db.js';

async function main() {
  console.log('正在测试数据库连接...');
  console.log('环境变量:');
  console.log(`- DB_HOST: ${process.env.DB_HOST || '未设置'}`);
  console.log(`- DB_USER: ${process.env.DB_USER || '未设置'}`);
  console.log(`- DB_NAME: ${process.env.DB_NAME || '未设置'}`);
  console.log(`- DB_PASSWORD: ${process.env.DB_PASSWORD ? '已设置' : '未设置'}`);
  
  try {
    const isConnected = await testConnection();
    console.log(`数据库连接测试结果: ${isConnected ? '成功' : '失败'}`);
    
    if (isConnected) {
      console.log('尝试查询知识导图表...');
      try {
        const mindmapQuery = await query('SHOW TABLES LIKE "mind_maps"');
        const hasMindMapTable = mindmapQuery.length > 0;
        console.log(`mind_maps表是否存在: ${hasMindMapTable ? '是' : '否'}`);
        
        if (hasMindMapTable) {
          console.log('查询mind_maps表结构...');
          const columnsInfo = await query('SHOW COLUMNS FROM mind_maps');
          console.log('表结构:');
          columnsInfo.forEach(col => {
            console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '可为空' : '不可为空'}`);
          });
          
          console.log('查询mind_maps表数据量...');
          const countResult = await query('SELECT COUNT(*) as count FROM mind_maps');
          console.log(`表中记录数: ${countResult[0].count}`);
          
          if (countResult[0].count > 0) {
            console.log('查询第一条知识导图数据...');
            const firstRow = await query('SELECT * FROM mind_maps LIMIT 1');
            console.log('第一条数据字段:');
            Object.keys(firstRow[0]).forEach(key => {
              const value = firstRow[0][key];
              console.log(`- ${key}: ${typeof value === 'object' ? 'JSON对象' : value?.toString().substring(0, 30) + '...'}`);
            });
          }
        }
      } catch (err) {
        console.error('查询mind_maps表失败:', err.message);
      }
    }
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

main().catch(console.error); 