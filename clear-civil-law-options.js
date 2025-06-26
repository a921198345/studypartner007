// 民法知识导图清除工具（多种选项）
import mysql from 'mysql2/promise';
import readline from 'readline';
import fs from 'fs';

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

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function showMenu() {
  console.log('\n🛠️  民法知识导图管理工具');
  console.log('=====================================');
  console.log('请选择操作：');
  console.log('1. 仅查看民法数据（不做任何修改）');
  console.log('2. 创建民法数据备份');
  console.log('3. 直接清除民法数据');
  console.log('4. 安全清除民法数据（带备份）');
  console.log('5. 重置民法数据（清除后插入默认模板）');
  console.log('6. 退出');
  console.log('=====================================');
  
  const choice = await askQuestion('请输入选项编号 (1-6): ');
  return choice;
}

async function viewCivilLawData(connection) {
  console.log('\n📋 查看民法数据');
  
  const [data] = await connection.execute(
    'SELECT * FROM mind_maps WHERE subject_name = ?',
    ['民法']
  );
  
  if (data.length === 0) {
    console.log('❌ 未找到民法数据');
    return;
  }
  
  const row = data[0];
  console.log(`✅ 找到民法数据:`);
  console.log(`- ID: ${row.id}`);
  console.log(`- 创建时间: ${row.created_at}`);
  console.log(`- 更新时间: ${row.updated_at}`);
  
  try {
    const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : row.map_data;
    console.log(`- 根节点: ${mapData.name}`);
    console.log(`- 数据大小: ${JSON.stringify(mapData).length} 字符`);
    console.log(`- 主要章节: ${mapData.children ? mapData.children.length : 0} 个`);
    
    if (mapData.children) {
      console.log('- 章节列表:');
      mapData.children.forEach((child, index) => {
        console.log(`  ${index + 1}. ${child.name}`);
      });
    }
  } catch (e) {
    console.log(`❌ 数据解析失败: ${e.message}`);
  }
}

async function createBackup(connection) {
  console.log('\n💾 创建民法数据备份');
  
  const [data] = await connection.execute(
    'SELECT * FROM mind_maps WHERE subject_name = ?',
    ['民法']
  );
  
  if (data.length === 0) {
    console.log('❌ 未找到民法数据，无法创建备份');
    return false;
  }
  
  // JSON文件备份
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonBackupFile = `civil-law-backup-${timestamp}.json`;
  
  fs.writeFileSync(jsonBackupFile, JSON.stringify(data[0], null, 2), 'utf8');
  console.log(`✅ JSON备份已创建: ${jsonBackupFile}`);
  
  // 数据库表备份
  const backupTableName = `mind_maps_civil_law_backup_${timestamp.replace(/-/g, '_')}`;
  
  try {
    await connection.execute(`
      CREATE TABLE ${backupTableName} AS 
      SELECT * FROM mind_maps WHERE subject_name = '民法'
    `);
    console.log(`✅ 数据库备份表已创建: ${backupTableName}`);
    return { jsonFile: jsonBackupFile, tableName: backupTableName };
  } catch (e) {
    console.log(`⚠️  数据库备份失败，但JSON备份成功: ${e.message}`);
    return { jsonFile: jsonBackupFile, tableName: null };
  }
}

async function directClear(connection) {
  console.log('\n🗑️  直接清除民法数据');
  
  const confirm = await askQuestion('⚠️  此操作不可逆！确定要清除吗？(yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('操作已取消');
    return;
  }
  
  const [deleteResult] = await connection.execute(
    'DELETE FROM mind_maps WHERE subject_name = ?',
    ['民法']
  );
  
  console.log(`✅ 清除完成，删除了 ${deleteResult.affectedRows} 条记录`);
  
  // 验证
  const [verifyResult] = await connection.execute(
    'SELECT COUNT(*) as count FROM mind_maps WHERE subject_name = ?',
    ['民法']
  );
  
  if (verifyResult[0].count === 0) {
    console.log('✅ 验证成功：民法数据已完全清除');
  } else {
    console.log('❌ 验证失败：仍有残留数据');
  }
}

async function safeClear(connection) {
  console.log('\n🛡️  安全清除民法数据（带备份）');
  
  // 先创建备份
  const backup = await createBackup(connection);
  if (!backup) {
    console.log('❌ 备份失败，取消清除操作');
    return;
  }
  
  console.log('\n✅ 备份完成，现在开始清除数据');
  
  const confirm = await askQuestion('确定要清除民法数据吗？(yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('操作已取消');
    return;
  }
  
  await directClear(connection);
  
  console.log(`\n📄 备份信息:`);
  console.log(`- JSON文件: ${backup.jsonFile}`);
  if (backup.tableName) {
    console.log(`- 数据库表: ${backup.tableName}`);
  }
}

async function resetCivilLaw(connection) {
  console.log('\n🔄 重置民法数据');
  
  // 先备份
  await createBackup(connection);
  
  const confirm = await askQuestion('确定要重置民法数据吗？这将删除现有数据并插入默认模板 (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('操作已取消');
    return;
  }
  
  // 删除现有数据
  await connection.execute('DELETE FROM mind_maps WHERE subject_name = ?', ['民法']);
  console.log('✅ 现有民法数据已清除');
  
  // 插入默认模板
  const defaultTemplate = {
    name: "民法",
    children: [
      {
        name: "民法总则",
        children: [
          { name: "基本规定" },
          { name: "自然人" },
          { name: "法人" },
          { name: "民事法律行为" },
          { name: "代理" },
          { name: "民事权利" },
          { name: "民事责任" },
          { name: "诉讼时效" }
        ]
      },
      {
        name: "物权法",
        children: [
          { name: "通则" },
          { name: "所有权" },
          { name: "用益物权" },
          { name: "担保物权" },
          { name: "占有" }
        ]
      },
      {
        name: "合同法",
        children: [
          { name: "通则" },
          { name: "合同的订立" },
          { name: "合同的效力" },
          { name: "合同的履行" },
          { name: "合同的变更和转让" },
          { name: "合同的权利义务终止" },
          { name: "违约责任" }
        ]
      },
      {
        name: "人格权法",
        children: [
          { name: "一般规定" },
          { name: "生命权、身体权和健康权" },
          { name: "姓名权和名称权" },
          { name: "肖像权" },
          { name: "名誉权和荣誉权" },
          { name: "隐私权和个人信息保护" }
        ]
      }
    ]
  };
  
  await connection.execute(
    'INSERT INTO mind_maps (subject_name, map_data) VALUES (?, ?)',
    ['民法', JSON.stringify(defaultTemplate)]
  );
  
  console.log('✅ 默认民法模板已插入');
  
  // 验证新数据
  const [newData] = await connection.execute(
    'SELECT id, subject_name, created_at FROM mind_maps WHERE subject_name = ?',
    ['民法']
  );
  
  if (newData.length > 0) {
    console.log(`✅ 验证成功：新民法数据已创建 (ID: ${newData[0].id})`);
  }
}

async function main() {
  let connection;
  
  try {
    console.log('🚀 启动民法知识导图管理工具');
    console.log('连接数据库...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    while (true) {
      const choice = await showMenu();
      
      switch (choice) {
        case '1':
          await viewCivilLawData(connection);
          break;
        case '2':
          await createBackup(connection);
          break;
        case '3':
          await directClear(connection);
          break;
        case '4':
          await safeClear(connection);
          break;
        case '5':
          await resetCivilLaw(connection);
          break;
        case '6':
          console.log('👋 再见！');
          return;
        default:
          console.log('❌ 无效选项，请重新选择');
      }
      
      const continueChoice = await askQuestion('\n按回车键继续，输入 q 退出: ');
      if (continueChoice.toLowerCase() === 'q') {
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
    rl.close();
  }
}

main().catch(console.error);