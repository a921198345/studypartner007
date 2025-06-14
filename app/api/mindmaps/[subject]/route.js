// app/api/mindmaps/[subject]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../lib/db.js';
import mysql from 'mysql2/promise'; 

// 默认民法知识导图数据
const getDefaultMindMapData = (subject) => {
  const mindMapTemplates = {
    '民法': {
      name: subject,
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
        },
        {
          name: "侵权责任法",
          children: [
            { name: "一般规定" },
            { name: "损害赔偿" },
            { name: "责任主体的特殊规定" },
            { name: "产品责任" },
            { name: "机动车交通事故责任" },
            { name: "医疗损害责任" },
            { name: "环境污染和生态破坏责任" },
            { name: "高度危险责任" },
            { name: "饲养动物损害责任" },
            { name: "建筑物和物件损害责任" }
          ]
        }
      ]
    },
    '刑法': {
      name: subject,
      children: [
        {
          name: "刑法总则",
          children: [
            { name: "刑法的任务、基本原则和适用范围" },
            { name: "犯罪" },
            { name: "刑罚" }
          ]
        },
        {
          name: "刑法分则",
          children: [
            { name: "危害公共安全罪" },
            { name: "破坏社会主义市场经济秩序罪" },
            { name: "侵犯公民人身权利、民主权利罪" },
            { name: "侵犯财产罪" },
            { name: "妨害社会管理秩序罪" },
            { name: "危害国防利益罪" },
            { name: "贪污贿赂罪" },
            { name: "渎职罪" }
          ]
        }
      ]
    }
  };
  
  return mindMapTemplates[subject] || {
    name: subject,
    children: [
      {
        name: "知识点1",
        children: [
          { name: "子知识点1" },
          { name: "子知识点2" }
        ]
      }
    ]
  };
};

// 检查表是否存在并获取表结构信息
async function getTableInfo() {
  try {
    // 首先检查表是否存在
    const tables = await db.query('SHOW TABLES LIKE "mind_maps"');
    if (tables.length === 0) {
      console.log('mind_maps表不存在，将创建表');
      await createMindMapsTable();
    }
    
    // 获取表结构信息
    const columnsInfo = await db.query('SHOW COLUMNS FROM mind_maps');
    console.log('mind_maps表结构:', columnsInfo);
    
    // 检查是否有subject或subject_name列
    const hasSubjectColumn = columnsInfo.some(col => col.Field === 'subject');
    const hasSubjectNameColumn = columnsInfo.some(col => col.Field === 'subject_name');
    
    // 检查是否有content或map_data列
    const hasContentColumn = columnsInfo.some(col => col.Field === 'content');
    const hasMapDataColumn = columnsInfo.some(col => col.Field === 'map_data');
    
    // 确定使用的列名
    const subjectColumnName = hasSubjectNameColumn ? 'subject_name' : 
                             (hasSubjectColumn ? 'subject' : 'subject_name');
    
    const contentColumnName = hasMapDataColumn ? 'map_data' : 
                             (hasContentColumn ? 'content' : 'map_data');
    
    return {
      subjectColumnName,
      contentColumnName
    };
  } catch (error) {
    console.error('获取表结构失败:', error);
    // 返回默认值
    return {
      subjectColumnName: 'subject_name',
      contentColumnName: 'map_data'
    };
  }
}

// 创建mind_maps表
async function createMindMapsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS mind_maps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_name VARCHAR(255) NOT NULL UNIQUE,
        map_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('mind_maps表创建成功');
  } catch (error) {
    console.error('创建mind_maps表失败:', error);
    throw error;
  }
}

// 定义知识导图数据格式化函数
function formatMindmapData(data) {
  // 检查数据是否为空
  if (!data || data.length === 0) {
    return { success: false, error: "未找到知识导图数据" };
  }
  
  try {
    // 获取第一条记录
    const mindmapEntry = data[0];
    
    // 检查map_data字段是否存在
    if (!mindmapEntry.map_data) {
      console.error('知识导图数据格式错误，缺少map_data字段');
      return { success: false, error: "知识导图数据格式错误" };
    }
    
    // 如果map_data已经是对象，直接使用
    // 如果是字符串，需要解析为对象
    let mindmapContent = mindmapEntry.map_data;
    if (typeof mindmapContent === 'string') {
      try {
        mindmapContent = JSON.parse(mindmapContent);
      } catch (e) {
        console.error('解析知识导图JSON数据失败:', e);
        return { success: false, error: "知识导图数据格式错误" };
      }
    }
    
    // 包装成前端期望的格式
    return { 
      success: true, 
      mindmap: {
        map_data: mindmapContent
      }
    };
  } catch (error) {
    console.error('格式化知识导图数据时出错:', error);
    return { success: false, error: "处理知识导图数据时出错" };
  }
}

// GET方法处理函数
export async function GET(request, { params }) {
  try {
    const { subject } = params;
    
    console.log(`接收到获取知识导图请求，学科: ${subject}`);
    
    if (!subject) {
      console.error('缺少学科参数');
      return NextResponse.json({ success: false, error: "缺少学科参数" }, { status: 400 });
    }
    
    // 解码URL编码的中文字符
    const decodedSubject = decodeURIComponent(subject);
    console.log(`解码后的学科名称: ${decodedSubject}`);
    
    // 添加内存缓存
    const cacheKey = `mindmap_cache_${decodedSubject}`;
    if (global[cacheKey]) {
      const cachedResult = global[cacheKey];
      const now = Date.now();
      // 服务端缓存5分钟
      if (now - cachedResult.timestamp < 300000) {
        console.log('使用服务端内存缓存');
        return NextResponse.json(cachedResult.data);
      }
    }
    
    // 先尝试直接连接数据库（优化连接参数）
    try {
      console.log('尝试连接数据库...');
      
      const connection = await mysql.createConnection({
        host: '8.141.4.192',
        port: 3306,
        user: 'law_user',
        password: 'Accd0726351x.',
        database: 'law_exam_assistant',
        connectTimeout: 10000, // 10秒连接超时
        acquireTimeout: 10000, // 10秒获取连接超时
        timeout: 10000, // 10秒查询超时
        charset: 'utf8mb4'
      });
      
      console.log('数据库连接成功');
      
      // 优化查询，只选择需要的字段
      const [rows] = await connection.execute(
        'SELECT subject_name, map_data FROM mind_maps WHERE subject_name = ? LIMIT 1',
        [decodedSubject]
      );
      
      await connection.end();
      
      console.log(`数据库查询结果: 找到 ${rows.length} 条记录`);
      
      // 如果找到数据库中的数据，使用它
      if (rows.length > 0) {
        const mindmapEntry = rows[0];
        console.log('找到数据库中的知识导图数据');
        
        // 处理map_data
        let mindmapContent = mindmapEntry.map_data;
        if (typeof mindmapContent === 'string') {
          try {
            mindmapContent = JSON.parse(mindmapContent);
          } catch (e) {
            console.error('解析知识导图JSON数据失败:', e);
          }
        }
        
        if (mindmapContent) {
          const result = { 
            success: true, 
            mindmap: {
              map_data: mindmapContent
            }
          };
          
          // 保存到服务端内存缓存
          global[cacheKey] = {
            data: result,
            timestamp: Date.now()
          };
          
          console.log('从数据库返回知识导图数据并缓存');
          return NextResponse.json(result);
        }
      }
      
      // 如果数据库中没有数据，创建默认数据并保存
      console.log(`未找到 ${decodedSubject} 的知识导图数据，创建默认数据`);
      const defaultMindMap = getDefaultMindMapData(decodedSubject);
      
      // 尝试插入默认数据到数据库
      try {
        const tableInfo = await getTableInfo();
        const { subjectColumnName, contentColumnName } = tableInfo;
        
        await db.query(
          `INSERT INTO mind_maps (${subjectColumnName}, ${contentColumnName}) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE ${contentColumnName} = VALUES(${contentColumnName})`,
          [decodedSubject, JSON.stringify(defaultMindMap)]
        );
        console.log(`默认知识导图数据已保存到数据库`);
      } catch (insertError) {
        console.warn('插入默认数据失败，但继续返回数据:', insertError.message);
      }
      
      const result = { 
        success: true, 
        mindmap: {
          map_data: defaultMindMap
        }
      };
      
      return NextResponse.json(result);
      
    } catch (dbError) {
      console.warn('数据库操作失败，使用默认数据:', dbError.message);
      
      // 数据库连接失败时使用默认数据
      const defaultMindMap = getDefaultMindMapData(decodedSubject);
      const result = { 
        success: true, 
        mindmap: {
          map_data: defaultMindMap
        }
      };
      
      return NextResponse.json(result);
    }
    
  } catch (error) {
    console.error('获取知识导图时出错:', error);
    console.error('错误堆栈:', error.stack);
    
    // 即使出现错误也返回默认数据
    try {
      const decodedSubject = decodeURIComponent(params.subject || '民法');
      const defaultMindMap = getDefaultMindMapData(decodedSubject);
      const result = { 
        success: true, 
        mindmap: {
          map_data: defaultMindMap
        }
      };
      
      return NextResponse.json(result);
    } catch (fallbackError) {
      return NextResponse.json(
        { success: false, error: "获取知识导图数据失败", details: error.message },
        { status: 500 }
      );
    }
  }
}