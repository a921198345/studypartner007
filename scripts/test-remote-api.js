/**
 * 测试远程API连接脚本
 * 
 * 这个脚本用于测试本地环境是否能正常连接到数据库
 * 并获取知识导图数据
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('redis');
const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    console.log('测试MySQL数据库连接...');
    console.log('配置:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: '******' // 隐藏密码
    });
    
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('\x1b[32m%s\x1b[0m', '✅ 数据库连接成功！');
    
    // 检查mind_maps表
    console.log('检查mind_maps表...');
    const [columns] = await connection.query('SHOW COLUMNS FROM mind_maps');
    console.log('表结构信息:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // 测试查询民法知识导图
    console.log('使用 subject_name 列查询民法数据...');
    const [rows] = await connection.query('SELECT * FROM mind_maps WHERE subject_name = ?', ['民法']);
    
    if (rows && rows.length > 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ 找到民法知识导图数据！');
      console.log('使用 map_data 字段获取数据');
      
      // 尝试解析数据
      const mapData = typeof rows[0].map_data === 'string' 
        ? JSON.parse(rows[0].map_data) 
        : rows[0].map_data;
        
      console.log('数据结构:');
      console.log(`  - name: ${mapData.name}`);
      console.log(`  - children: ${mapData.children ? mapData.children.length : 0} 个子节点`);
    } else {
      console.log('\x1b[31m%s\x1b[0m', '❌ 未找到民法知识导图数据');
    }
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ 数据库连接失败:');
    console.error(error);
  }
  
  console.log('\n----------------------------\n');
}

async function testRedis() {
  try {
    console.log('测试Redis连接...');
    const config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    };
    
    // 如果有密码则添加
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
    
    console.log('配置:', {
      url: config.url,
      password: config.password ? '(已设置密码)' : '(无密码)'
    });
    
    // 创建Redis客户端
    const client = createClient(config);
    client.on('error', err => console.error('Redis错误:', err));
    
    // 连接Redis
    await client.connect();
    console.log('\x1b[32m%s\x1b[0m', '✅ Redis连接成功！');
    
    // 测试写入和读取
    console.log('测试Redis写入和读取...');
    const testData = { test: true, time: new Date().toISOString() };
    await client.set('test:connection', JSON.stringify(testData), { EX: 60 });
    
    const result = await client.get('test:connection');
    console.log('读取结果:', JSON.parse(result));
    
    // 清理测试数据
    await client.del('test:connection');
    console.log('测试完成，已清理测试数据');
    
    // 关闭连接
    await client.quit();
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Redis连接失败:');
    console.error(error);
  }
  
  console.log('\n----------------------------\n');
}

// 运行测试
async function runTests() {
  console.log('===== 数据库和Redis连接测试 =====');
  
  await testDatabase();
  await testRedis();
  
  console.log('测试完成！');
  process.exit(0);
}

runTests(); 