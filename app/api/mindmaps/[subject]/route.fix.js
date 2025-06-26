// app/api/mindmaps/[subject]/route.fix.js
// 这个文件是route.js的优化版本，更好地处理数据库中的mind_maps表结构
// 使用时请替换回route.js

import { NextResponse } from 'next/server';
import db from '../../../../lib/db'; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
const cache = require('../../../../lib/cache');

// 定义知识导图数据格式化函数
function formatMindmapData(data) {
  // 检查数据是否为空
  if (!data || data.length === 0) {
    return { nodes: [], error: "未找到知识导图数据" };
  }
  
  try {
    // 获取第一条记录
    const mindmapEntry = data[0];
    
    // 检查map_data字段是否存在
    if (!mindmapEntry.map_data) {
      console.error('知识导图数据格式错误，缺少map_data字段');
      return { nodes: [], error: "知识导图数据格式错误" };
    }
    
    // 如果map_data已经是对象，直接使用
    // 如果是字符串，需要解析为对象
    let mindmapContent = mindmapEntry.map_data;
    if (typeof mindmapContent === 'string') {
      try {
        mindmapContent = JSON.parse(mindmapContent);
      } catch (e) {
        console.error('解析知识导图JSON数据失败:', e);
        return { nodes: [], error: "知识导图数据格式错误" };
      }
    }
    
    return mindmapContent;
  } catch (error) {
    console.error('格式化知识导图数据时出错:', error);
    return { nodes: [], error: "处理知识导图数据时出错" };
  }
}

// GET方法处理函数
export async function GET(request, { params }) {
  try {
    const { subject } = params;
    
    // 获取用户会话信息，用于权限检查
    const session = await getServerSession(authOptions);
    
    // 检查权限 - 非会员用户只能访问"民法"学科
    if (!session?.user?.isMember && subject !== "民法") {
      return NextResponse.json(
        { error: "需要会员权限才能访问此学科的知识导图" },
        { status: 403 }
      );
    }
    
    // 生成缓存键 - 加入是否会员信息，防止权限混淆
    const userType = session?.user?.isMember ? "member" : "free";
    const cacheKey = `mindmap:${subject}:${userType}`;
    
    // 尝试从缓存获取数据
    const cachedData = await cache.get(cacheKey);
    
    // 如果缓存中有数据，直接返回
    if (cachedData) {
      console.log(`从缓存返回${subject}知识导图数据`);
      return NextResponse.json(cachedData);
    }
    
    // 缓存未命中，从数据库查询
    console.log(`从数据库加载${subject}知识导图数据`);
    
    // 执行数据库查询，使用正确的列名subject_name
    const mindmapData = await db.query(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      [subject]
    );
    
    // 格式化获取的数据
    const formattedData = formatMindmapData(mindmapData);
    
    // 检查是否有错误
    if (formattedData.error) {
      return NextResponse.json(
        { error: formattedData.error },
        { status: 404 }
      );
    }
    
    // 存入缓存(24小时过期)
    await cache.set(cacheKey, formattedData, 86400); 
    
    // 返回数据
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('获取知识导图失败:', error);
    return NextResponse.json(
      { error: '获取知识导图失败: ' + error.message },
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
        { error: "需要管理员权限" },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 先检查表结构
    let columnToUse = 'content';
    let subjectColumnToUse = 'subject';
    
    try {
      // 尝试获取表结构信息
      const columnsInfo = await db.query('SHOW COLUMNS FROM mind_maps');
      
      // 检查是否有content或map_data列
      const hasContentColumn = columnsInfo.some(col => col.Field === 'content');
      const hasMapDataColumn = columnsInfo.some(col => col.Field === 'map_data');
      
      if (hasMapDataColumn) {
        columnToUse = 'map_data';
      }
      
      // 检查是否有subject或subject_name列
      const hasSubjectColumn = columnsInfo.some(col => col.Field === 'subject');
      const hasSubjectNameColumn = columnsInfo.some(col => col.Field === 'subject_name');
      
      if (hasSubjectNameColumn) {
        subjectColumnToUse = 'subject_name';
      }
    } catch (error) {
      console.error('获取表结构失败，使用默认列名:', error);
    }
    
    // 更新数据库
    await db.query(
      `UPDATE mind_maps SET ${columnToUse} = ? WHERE ${subjectColumnToUse} = ?`,
      [JSON.stringify(data), subject]
    );
    
    // 清除相关缓存
    await cache.clear(`mindmap:${subject}:*`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新知识导图失败:', error);
    return NextResponse.json(
      { error: '更新知识导图失败: ' + error.message },
      { status: 500 }
    );
  }
} 