// 分析知识导图数据结构
import mysql from 'mysql2/promise';
import fs from 'fs';

const dbConfig = {
  host: '8.141.4.192',
  port: 3306,
  user: 'law_user',
  password: 'Accd0726351x.',
  database: 'law_exam_assistant',
  charset: 'utf8mb4'
};

async function analyzeMindMapData() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('\n📊 知识导图数据分析报告');
    console.log('=====================================');
    
    // 1. 获取所有数据
    const [allData] = await connection.execute('SELECT * FROM mind_maps ORDER BY subject_name');
    
    console.log(`\n📋 总体概况`);
    console.log(`- 总记录数: ${allData.length}`);
    console.log(`- 学科数量: ${new Set(allData.map(row => row.subject_name)).size}`);
    
    // 2. 按学科分析
    console.log(`\n📚 学科详情`);
    const subjectAnalysis = {};
    
    for (const row of allData) {
      const subject = row.subject_name;
      
      try {
        const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : row.map_data;
        
        subjectAnalysis[subject] = {
          id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          root_name: mapData.name,
          total_nodes: countNodes(mapData),
          max_depth: getMaxDepth(mapData),
          chapters: mapData.children ? mapData.children.map(child => ({
            name: child.name,
            sub_nodes: child.children ? child.children.length : 0
          })) : []
        };
        
        console.log(`\n${subject}:`);
        console.log(`  - ID: ${row.id}`);
        console.log(`  - 根节点名称: ${mapData.name}`);
        console.log(`  - 总节点数: ${subjectAnalysis[subject].total_nodes}`);
        console.log(`  - 最大深度: ${subjectAnalysis[subject].max_depth}`);
        console.log(`  - 主要章节数: ${mapData.children ? mapData.children.length : 0}`);
        console.log(`  - 创建时间: ${row.created_at}`);
        console.log(`  - 更新时间: ${row.updated_at}`);
        
        if (mapData.children && mapData.children.length > 0) {
          console.log(`  - 章节列表:`);
          mapData.children.forEach((child, index) => {
            const subCount = child.children ? child.children.length : 0;
            console.log(`    ${index + 1}. ${child.name} (${subCount}个子节点)`);
          });
        }
        
      } catch (e) {
        console.log(`\n${subject}: ❌ JSON解析错误`);
        console.log(`  - 数据类型: ${typeof row.map_data}`);
        console.log(`  - 错误: ${e.message}`);
      }
    }
    
    // 3. 特别关注民法数据
    console.log(`\n🎯 民法数据详细分析`);
    const civilLawData = allData.find(row => row.subject_name === '民法');
    
    if (civilLawData) {
      console.log(`✅ 找到民法数据`);
      try {
        const mapData = typeof civilLawData.map_data === 'string' ? 
          JSON.parse(civilLawData.map_data) : civilLawData.map_data;
        
        console.log(`- 数据大小: ${JSON.stringify(mapData).length} 字符`);
        console.log(`- 结构完整性: ${mapData.name && mapData.children ? '✅ 完整' : '❌ 不完整'}`);
        
        if (mapData.children) {
          console.log(`- 详细章节结构:`);
          mapData.children.forEach((chapter, i) => {
            console.log(`  ${i + 1}. ${chapter.name}`);
            if (chapter.children) {
              chapter.children.forEach((subChapter, j) => {
                console.log(`     ${i + 1}.${j + 1} ${subChapter.name}`);
                if (subChapter.children) {
                  console.log(`        (包含 ${subChapter.children.length} 个三级节点)`);
                }
              });
            }
          });
        }
        
        // 生成民法数据的JSON文件备份
        const civilLawBackup = {
          subject: civilLawData.subject_name,
          id: civilLawData.id,
          created_at: civilLawData.created_at,
          updated_at: civilLawData.updated_at,
          map_data: mapData
        };
        
        const backupFileName = `civil-law-mindmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
        fs.writeFileSync(backupFileName, JSON.stringify(civilLawBackup, null, 2), 'utf8');
        console.log(`📄 已生成民法数据备份文件: ${backupFileName}`);
        
      } catch (e) {
        console.log(`❌ 民法数据解析失败: ${e.message}`);
      }
    } else {
      console.log(`❌ 未找到民法数据`);
    }
    
    // 4. 数据质量评估
    console.log(`\n🔍 数据质量评估`);
    let healthyCount = 0;
    let problematicCount = 0;
    
    for (const row of allData) {
      try {
        const mapData = typeof row.map_data === 'string' ? JSON.parse(row.map_data) : row.map_data;
        if (mapData && mapData.name && Array.isArray(mapData.children)) {
          healthyCount++;
        } else {
          problematicCount++;
          console.log(`⚠️  ${row.subject_name}: 数据结构异常`);
        }
      } catch (e) {
        problematicCount++;
        console.log(`❌ ${row.subject_name}: JSON格式错误`);
      }
    }
    
    console.log(`- 健康数据: ${healthyCount} 个学科`);
    console.log(`- 异常数据: ${problematicCount} 个学科`);
    console.log(`- 数据质量: ${(healthyCount / allData.length * 100).toFixed(1)}%`);
    
    // 5. 清除建议
    console.log(`\n💡 清除民法数据的建议方案`);
    console.log(`=====================================`);
    console.log(`1. 直接删除方案:`);
    console.log(`   DELETE FROM mind_maps WHERE subject_name = '民法';`);
    console.log(`   
2. 安全删除方案:`);
    console.log(`   - 先创建备份表`);
    console.log(`   - 执行删除操作`);
    console.log(`   - 验证删除结果`);
    console.log(`
3. 重置方案:`);
    console.log(`   - 删除现有民法数据`);
    console.log(`   - 插入新的默认民法模板`);
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 辅助函数：计算节点总数
function countNodes(node) {
  if (!node) return 0;
  let count = 1; // 当前节点
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// 辅助函数：计算最大深度
function getMaxDepth(node, currentDepth = 1) {
  if (!node || !node.children || !Array.isArray(node.children) || node.children.length === 0) {
    return currentDepth;
  }
  
  let maxChildDepth = currentDepth;
  for (const child of node.children) {
    const childDepth = getMaxDepth(child, currentDepth + 1);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }
  
  return maxChildDepth;
}

analyzeMindMapData().catch(console.error);