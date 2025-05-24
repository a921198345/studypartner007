/**
 * 数据库连接测试脚本
 */

const db = require('../lib/db').default;

async function testConnection() {
  try {
    console.log('开始测试数据库连接...');
    
    // 测试数据库连接
    const connected = await db.testConnection();
    console.log(`数据库连接测试: ${connected ? '成功' : '失败'}`);
    
    if (!connected) {
      console.error('数据库连接失败，请检查配置信息。');
      process.exit(1);
    }
    
    // 检查mind_maps表是否存在
    console.log('检查mind_maps表...');
    try {
      const result = await db.query('SHOW TABLES LIKE "mind_maps"');
      if (result.length === 0) {
        console.log('mind_maps表不存在，创建表...');
        await createMindMapsTable();
      } else {
        console.log('mind_maps表已存在');
        // 显示表结构
        const columns = await db.query('SHOW COLUMNS FROM mind_maps');
        console.log('表结构:', columns);
      }
    } catch (error) {
      console.error('检查表结构时出错:', error);
    }
    
    console.log('测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    process.exit(0);
  }
}

// 创建mind_maps表
async function createMindMapsTable() {
  try {
    await db.query(`
      CREATE TABLE mind_maps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_name VARCHAR(255) NOT NULL UNIQUE,
        map_data JSON NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);
    console.log('mind_maps表创建成功');
  } catch (error) {
    console.error('创建mind_maps表失败:', error);
  }
}

// 创建示例民法导图数据
async function createSampleCivilLawData() {
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
    
    // 检查是否已存在民法数据
    const existingData = await db.queryOne(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      ['民法']
    );
    
    if (existingData) {
      console.log('民法数据已存在，跳过创建');
      return;
    }
    
    // 插入样例数据
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      'INSERT INTO mind_maps (subject_name, map_data, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['民法', JSON.stringify(sampleData), now, now]
    );
    
    console.log('民法样例数据创建成功');
  } catch (error) {
    console.error('创建样例数据失败:', error);
  }
}

// 运行测试
testConnection()
  .then(() => {
    console.log('准备创建样例数据...');
    return createSampleCivilLawData();
  })
  .catch(error => {
    console.error('测试脚本执行失败:', error);
  }); 