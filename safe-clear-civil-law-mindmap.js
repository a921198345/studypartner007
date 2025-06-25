// 安全清除民法知识导图数据（带确认）
import mysql from 'mysql2/promise';
import readline from 'readline';

const dbConfig = {
  host: '8.141.4.192',
  port: 3306,
  user: 'law_user',
  password: 'Accd0726351x.',
  database: 'law_exam_assistant',
  charset: 'utf8mb4'
};

// 创建读取行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户确认
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function safeClearCivilLawMindMap() {
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
    
    console.log(`找到 ${civilLawData.length} 条民法知识导图数据:`);
    civilLawData.forEach(row => {
      console.log(`- ID: ${row.id}, 学科: ${row.subject_name}`);
      console.log(`  创建时间: ${row.created_at}`);
      console.log(`  更新时间: ${row.updated_at}`);
    });
    
    // 显示将要删除的数据详情
    const [fullData] = await connection.execute(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    console.log('\n=== 数据内容预览 ===');
    fullData.forEach(row => {
      try {
        const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : row.map_data;
        console.log(`学科: ${row.subject_name}`);
        console.log(`根节点: ${mapData.name}`);
        console.log(`子节点数: ${mapData.children ? mapData.children.length : 0}`);
        if (mapData.children && mapData.children.length > 0) {
          console.log('主要章节:');
          mapData.children.slice(0, 3).forEach((child, index) => {
            console.log(`  ${index + 1}. ${child.name}`);
          });
          if (mapData.children.length > 3) {
            console.log(`  ... 共 ${mapData.children.length} 个章节`);
          }
        }
      } catch (e) {
        console.log(`数据格式: ${typeof row.map_data}`);
      }
    });
    
    // 第一次确认
    console.log('\n⚠️  警告：此操作将永久删除民法知识导图的所有数据！');
    console.log('这包括：');
    console.log('- 所有民法章节结构');
    console.log('- 所有民法知识点');
    console.log('- 创建和更新时间等元数据');
    
    const confirm1 = await askQuestion('\n您确定要删除民法知识导图数据吗？(yes/no): ');
    if (confirm1.toLowerCase() !== 'yes' && confirm1.toLowerCase() !== 'y') {
      console.log('操作已取消');
      return;
    }
    
    // 第二次确认
    const confirm2 = await askQuestion('\n请再次确认：输入 "DELETE CIVIL LAW" 来确认删除: ');
    if (confirm2 !== 'DELETE CIVIL LAW') {
      console.log('确认失败，操作已取消');
      return;
    }
    
    // 创建备份（可选）
    const createBackup = await askQuestion('\n是否要在删除前创建备份？(yes/no): ');
    if (createBackup.toLowerCase() === 'yes' || createBackup.toLowerCase() === 'y') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupTableName = `mind_maps_backup_${timestamp}`;
      
      await connection.execute(`
        CREATE TABLE ${backupTableName} AS 
        SELECT * FROM mind_maps WHERE subject_name = '民法'
      `);
      
      console.log(`✅ 备份已创建：${backupTableName}`);
    }
    
    // 执行删除操作
    console.log('\n=== 正在删除民法知识导图数据... ===');
    const [deleteResult] = await connection.execute(
      'DELETE FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    console.log(`\n✅ 删除完成！`);
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
    console.log('\n=== 当前知识导图数据状态 ===');
    const [remainingData] = await connection.execute(
      'SELECT subject_name, COUNT(*) as count FROM mind_maps GROUP BY subject_name'
    );
    
    if (remainingData.length === 0) {
      console.log('数据库中没有任何知识导图数据');
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
    }
    rl.close();
  }
}

// 主函数
async function main() {
  console.log('🛡️  安全民法知识导图数据清除工具');
  console.log('=====================================');
  console.log('此工具将安全地清除民法知识导图数据');
  console.log('包含多重确认和可选备份功能');
  console.log('=====================================\n');
  
  await safeClearCivilLawMindMap();
  
  console.log('\n操作完成！');
}

main().catch(console.error);