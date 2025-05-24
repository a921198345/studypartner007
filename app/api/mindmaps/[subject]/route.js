/**
 * 知识导图API端点
 * 
 * 根据学科名称获取知识导图数据的公开API
 */

import { NextResponse } from 'next/server';
import { getMindMapBySubject } from '@/lib/opml/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET 根据学科获取知识导图
 * @param {Request} request - Next.js请求对象
 * @param {Object} params - 路由参数，包含学科名
 * @returns {Promise<NextResponse>} - 响应对象
 */
export async function GET(request, { params }) {
  try {
    // 从路由参数中获取学科名称
    const { subject } = params;
    
    if (!subject) {
      return NextResponse.json({ error: '缺少学科参数' }, { status: 400 });
    }
    
    // 获取用户会话
    const session = await getServerSession(authOptions);
    
    // 校验权限（免费用户只能访问民法）
    if (!session?.user && subject !== '民法') {
      return NextResponse.json(
        { error: '无权访问该学科，请登录或升级至高级账户' }, 
        { status: 403 }
      );
    }
    
    // 调用数据库函数获取知识导图数据
    const actualMapData = await getMindMapBySubject(subject);
    
    if (!actualMapData) {
      return NextResponse.json(
        { success: false, error: `未找到学科"${subject}"的知识导图` }, 
        { status: 404 }
      );
    }

    // 确保如果 actualMapData 是 JSON 字符串，则解析它
    let parsedMapData = actualMapData;
    if (typeof actualMapData === 'string') {
      try {
        parsedMapData = JSON.parse(actualMapData);
      } catch (e) {
        console.error('解析从数据库获取的map_data失败:', e);
        return NextResponse.json(
          { success: false, error: '知识导图数据格式损坏', details: e.message }, 
          { status: 500 }
        );
      }
    }
    
    // 返回符合前端期望的结构
    return NextResponse.json({
      success: true,
      mindmap: { 
        subject_name: subject, 
        map_data: parsedMapData
      }
    });
    
  } catch (error) {
    console.error('获取知识导图失败:', error);
    return NextResponse.json(
      { success: false, error: '获取知识导图失败', details: error.message }, 
      { status: 500 }
    );
  }
} 