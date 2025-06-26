/**
 * 远程数据库连接设置脚本
 * 此脚本用于设置连接远程数据库
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
const mysql = require('mysql2/promise');

// 创建命令行交互界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 将readline.question转换为Promise版本
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 测试远程MySQL连接
async function testDbConnection(config) {
  try {
    console.log('正在测试数据库连接...');
    const connection = await mysql.createConnection({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME
    });
    
    await connection.query('SELECT 1');
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error.message);
    return false;
  }
}

// 检查mind_maps表和字段
async function checkTableStructure(config) {
  try {
    console.log('正在检查数据库表结构...');
    const connection = await mysql.createConnection({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME
    });
    
    // 检查mind_maps表是否存在
    const [tables] = await connection.query('SHOW TABLES LIKE "mind_maps"');
    if (tables.length === 0) {
      console.log('表 mind_maps 不存在，将为您创建...');
      
      // 创建mind_maps表
      await connection.query(`
        CREATE TABLE mind_maps (
          id int(10) unsigned NOT NULL AUTO_INCREMENT,
          subject_name varchar(255) NOT NULL,
          map_data json DEFAULT NULL,
          created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY subject_name_index (subject_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('✅ mind_maps表创建成功！');
    } else {
      console.log('✅ mind_maps表已存在');
      
      // 检查字段
      const [columns] = await connection.query('SHOW COLUMNS FROM mind_maps');
      const columnNames = columns.map(col => col.Field);
      
      console.log('表字段列表:', columnNames.join(', '));
      
      // 检查必要的字段
      const hasSubjectName = columnNames.includes('subject_name');
      const hasMapData = columnNames.includes('map_data');
      
      if (!hasSubjectName || !hasMapData) {
        console.log('需要添加或修改必要的字段...');
        
        // 添加缺失的字段
        if (!hasSubjectName) {
          await connection.query(`
            ALTER TABLE mind_maps 
            ADD COLUMN subject_name varchar(255) NOT NULL AFTER id,
            ADD KEY subject_name_index (subject_name)
          `);
          console.log('✅ 已添加 subject_name 字段');
        }
        
        if (!hasMapData) {
          await connection.query(`
            ALTER TABLE mind_maps 
            ADD COLUMN map_data json DEFAULT NULL AFTER subject_name
          `);
          console.log('✅ 已添加 map_data 字段');
        }
      } else {
        console.log('✅ 所有必要的字段都已存在');
      }
    }
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('检查表结构失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('=== 远程数据库连接设置 ===');
  console.log('此脚本将帮助您设置连接远程数据库的环境变量\n');
  
  // 收集配置
  const config = {
    DB_HOST: await question('数据库主机地址: '),
    DB_PORT: await question('数据库端口 (默认: 3306): ') || '3306',
    DB_USER: await question('数据库用户名: '),
    DB_PASSWORD: await question('数据库密码: '),
    DB_NAME: await question('数据库名称: ')
  };
  
  // 测试连接
  console.log('\n测试连接配置...');
  const connectionSuccess = await testDbConnection(config);
  
  if (!connectionSuccess) {
    console.log('\n❌ 连接失败，请检查您的配置');
    rl.close();
    return;
  }
  
  console.log('\n✅ 连接成功！');
  
  // 检查表结构
  const structureOk = await checkTableStructure(config);
  if (!structureOk) {
    console.log('\n⚠️ 表结构检查失败，但将继续保存配置');
  }
  
  // 询问是否生成.env.local文件
  const createEnvFile = await question('\n是否保存配置到.env.local文件？[y/N] ');
  
  if (createEnvFile.toLowerCase() === 'y') {
    try {
      // 生成环境变量配置
      let envContent = '';
      Object.entries(config).forEach(([key, value]) => {
        envContent += `${key}=${value}\n`;
      });
      
      // 写入.env.local文件
      await fs.promises.writeFile(path.join(process.cwd(), '.env.local'), envContent);
      console.log('\n✅ 配置已保存到.env.local文件');
    } catch (error) {
      console.error('保存配置文件失败:', error.message);
    }
  }
  
  rl.close();
}

main().catch(console.error); 