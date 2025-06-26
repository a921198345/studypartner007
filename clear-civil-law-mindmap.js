// 清除民法知识导图数据
import mysql from 'mysql2/promise';

const dbConfig = {
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
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    // 首先检查民法数据是否存在
    console.log('\n=== 检查民法知识导图数据 ===');
    const [civilLawData] = await connection.execute(
      'SELECT id, subject_name, created_at, updated_at FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    if (civilLawData.length === 0) {
      console.log('未找到民法知识导图数据，无需删除');
      return;
    }
    
    console.log('找到民法知识导图数据:');
    civilLawData.forEach(row => {
      console.log(`- ID: ${row.id}, 学科: ${row.subject_name}`);
      console.log(`  创建时间: ${row.created_at}`);
      console.log(`  更新时间: ${row.updated_at}`);
    });
    
    // 确认是否要删除
    console.log('\n=== 即将删除民法知识导图数据 ===');
    console.log('这将永久删除民法学科的所有知识导图数据！');
    
    // 执行删除操作
    const [deleteResult] = await connection.execute(
      'DELETE FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    console.log(`\n=== 删除完成 ===`);
    console.log(`删除了 ${deleteResult.affectedRows} 条记录`);
    
    // 验证删除结果
    const [verifyResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    if (verifyResult[0].count === 0) {
      console.log('✅ 验证成功：民法知识导图数据已完全清除');
    } else {
      console.log('❌ 验证失败：仍有民法数据残留');
    }
    
    // 显示剩余的知识导图数据
    console.log('\n=== 剩余知识导图数据 ===');
    const [remainingData] = await connection.execute(
      'SELECT subject_name, COUNT(*) as count FROM mind_maps GROUP BY subject_name'
    );
    
    if (remainingData.length === 0) {
      console.log('没有剩余的知识导图数据');
    } else {
      console.log('剩余学科:');
      remainingData.forEach(row => {
        console.log(`- ${row.subject_name}: ${row.count} 条记录`);
      });
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 主函数
async function main() {
  console.log('🗑️  民法知识导图数据清除工具');
  console.log('=====================================');
  
  await clearCivilLawMindMap();
  
  console.log('\n操作完成！');
}

main().catch(console.error);