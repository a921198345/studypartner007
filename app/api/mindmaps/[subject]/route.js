// app/api/mindmaps/[subject]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../db'; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
const cache = require('../../../../lib/cache');

// 加载表结构信息
async function getTableInfo() {
  try {
    // 尝试获取表结构信息
    const columnsInfo = await db.query('SHOW COLUMNS FROM mind_maps');
    
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
    
    if (!subject) {
      return NextResponse.json({ success: false, error: "缺少学科参数" }, { status: 400 });
    }
    
    // 尝试从缓存获取数据
    const cachedData = await cache.get(`mindmap:${subject}`);
    if (cachedData) {
      console.log(`从缓存返回 ${subject} 知识导图数据`);
      return NextResponse.json(cachedData);
    }
    
    console.log(`缓存未命中，从数据库查询 ${subject} 知识导图数据`);
    
    // 从数据库查询
    const data = await db.query(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      [subject]
    );
    
    // 格式化数据
    const formattedData = formatMindmapData(data);
    
    // 缓存数据(24小时)
    if (formattedData.success) {
      await cache.set(`mindmap:${subject}`, formattedData, 86400);
    }
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('获取知识导图时出错:', error);
    return NextResponse.json(
      { success: false, error: "获取知识导图数据失败", details: error.message },
      { status: 500 }
    );
  }
}

// 更新知识导图数据（管理员用）
export async function PUT(request, { params }) {
  try {
    const { subject } = params;
    const session = await getServerSession(authOptions);
    
    // 检查管理员权限
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "需要管理员权限" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 获取表结构信息
    const { subjectColumnName, contentColumnName } = await getTableInfo();
    
    // 更新数据库
    await db.query(
      `UPDATE mind_maps SET ${contentColumnName} = ? WHERE ${subjectColumnName} = ?`,
      [JSON.stringify(data), subject]
    );
    
    // 清除相关缓存
    await cache.clear(`mindmap:${subject}:*`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新知识导图失败:', error);
    return NextResponse.json(
      { success: false, error: '更新知识导图失败: ' + error.message },
      { status: 500 }
    );
  }
}