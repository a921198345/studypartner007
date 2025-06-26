import mysql from 'mysql2/promise';
import fs from 'fs';

const DB_CONFIG = {
  host: '8.141.4.192',
  port: 3306,
  user: 'law_user',
  password: 'Accd0726351x.',
  database: 'law_exam_assistant',
  charset: 'utf8mb4'
};

async function clearCivilLawMindMap() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查现有数据
    console.log('\n📊 检查现有民法数据...');
    const [rows] = await connection.execute(
      'SELECT id, subject_name, created_at, updated_at FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    if (rows.length === 0) {
      console.log('❌ 未找到民法知识导图数据');
      return;
    }
    
    console.log(`📋 找到 ${rows.length} 条民法数据:`);
    rows.forEach(row => {
      console.log(`  - ID: ${row.id}, 学科: ${row.subject_name}`);
      console.log(`    创建: ${row.created_at}, 更新: ${row.updated_at}`);
    });
    
    // 2. 创建备份
    console.log('\n💾 创建数据备份...');
    const [backupData] = await connection.execute(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    const backupFileName = `civil-law-backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
    console.log(`✅ 备份已保存到: ${backupFileName}`);
    
    // 3. 删除民法数据
    console.log('\n🗑️  开始删除民法知识导图数据...');
    const [result] = await connection.execute(
      'DELETE FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    console.log(`✅ 删除成功! 共删除 ${result.affectedRows} 条记录`);
    
    // 4. 验证删除结果
    console.log('\n🔍 验证删除结果...');
    const [verifyRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    const remainingCount = verifyRows[0].count;
    if (remainingCount === 0) {
      console.log('✅ 验证成功: 民法数据已完全清除');
    } else {
      console.log(`❌ 验证失败: 仍有 ${remainingCount} 条民法数据残留`);
    }
    
    // 5. 显示剩余数据
    console.log('\n📈 剩余知识导图数据:');
    const [allRows] = await connection.execute(
      'SELECT subject_name, COUNT(*) as count FROM mind_maps GROUP BY subject_name'
    );
    
    if (allRows.length === 0) {
      console.log('  无任何知识导图数据');
    } else {
      allRows.forEach(row => {
        console.log(`  - ${row.subject_name}: ${row.count} 条`);
      });
    }
    
    console.log('\n🎉 民法知识导图数据清除完成!');
    console.log('💡 现在可以重新上传新的民法知识导图数据');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 提示: 请检查数据库连接配置');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 数据库连接已关闭');
    }
  }
}

// 执行清除操作
clearCivilLawMindMap();