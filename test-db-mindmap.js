// 测试知识导图数据库连接和数据
const db = require('./lib/db.js');

async function testMindMapDatabase() {
  console.log('开始测试知识导图数据库...');
  
  try {
    // 1. 测试数据库连接
    console.log('1. 测试数据库连接...');
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('❌ 数据库连接失败');
      return;
    }
    console.log('✅ 数据库连接成功');
    
    // 2. 检查mind_maps表是否存在
    console.log('2. 检查mind_maps表...');
    try {
      const tables = await db.query("SHOW TABLES LIKE 'mind_maps'");
      if (tables.length === 0) {
        console.error('❌ mind_maps表不存在');
        console.log('请运行以下SQL创建表:');
        console.log(`
CREATE TABLE IF NOT EXISTS \`mind_maps\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`subject_name\` varchar(255) NOT NULL COMMENT '学科名称',
  \`map_data\` json NOT NULL COMMENT '知识导图数据',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`subject_name\` (\`subject_name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        return;
      }
      console.log('✅ mind_maps表存在');
    } catch (error) {
      console.error('❌ 检查表失败:', error.message);
      return;
    }
    
    // 3. 检查表结构
    console.log('3. 检查表结构...');
    try {
      const columns = await db.query("SHOW COLUMNS FROM mind_maps");
      console.log('✅ 表结构:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type}`);
      });
    } catch (error) {
      console.error('❌ 检查表结构失败:', error.message);
    }
    
    // 4. 检查民法数据
    console.log('4. 检查民法知识导图数据...');
    try {
      const data = await db.query("SELECT * FROM mind_maps WHERE subject_name = '民法'");
      if (data.length === 0) {
        console.log('⚠️  民法数据不存在，尝试插入示例数据...');
        
        const sampleData = {
          name: "民法",
          children: [
            {
              name: "民法总则",
              children: [
                { name: "基本规定" },
                { name: "自然人" },
                { name: "法人" },
                { name: "民事法律行为" }
              ]
            },
            {
              name: "物权法",
              children: [
                { name: "通则" },
                { name: "所有权" },
                { name: "用益物权" }
              ]
            }
          ]
        };
        
        await db.query(
          "INSERT INTO mind_maps (subject_name, map_data) VALUES (?, ?)",
          ['民法', JSON.stringify(sampleData)]
        );
        console.log('✅ 民法示例数据插入成功');
      } else {
        console.log('✅ 民法数据存在');
        console.log(`   数据长度: ${JSON.stringify(data[0].map_data).length} 字符`);
      }
    } catch (error) {
      console.error('❌ 检查民法数据失败:', error.message);
    }
    
    // 5. 测试API路由逻辑
    console.log('5. 测试API查询逻辑...');
    try {
      const apiData = await db.query(
        'SELECT * FROM mind_maps WHERE subject_name = ?',
        ['民法']
      );
      
      if (apiData.length > 0) {
        const mapData = apiData[0].map_data;
        if (typeof mapData === 'string') {
          JSON.parse(mapData); // 测试JSON解析
        }
        console.log('✅ API查询逻辑正常');
      } else {
        console.error('❌ API查询无数据');
      }
    } catch (error) {
      console.error('❌ API查询逻辑失败:', error.message);
    }
    
    console.log('\n✅ 数据库测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

// 运行测试
testMindMapDatabase().catch(console.error);