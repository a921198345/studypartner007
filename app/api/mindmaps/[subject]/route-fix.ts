// app/api/mindmaps/[subject]/route-fix.js
import { NextResponse } from 'next/server';

// 简化版本的mindmap API，用于测试
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
    
    // 返回默认的知识导图数据
    const defaultMindMap = {
      name: decodedSubject,
      children: [
        {
          name: "知识点1",
          children: [
            { name: "子知识点1" },
            { name: "子知识点2" }
          ]
        },
        {
          name: "知识点2", 
          children: [
            { name: "子知识点3" },
            { name: "子知识点4" }
          ]
        }
      ]
    };
    
    const result = { 
      success: true, 
      mindmap: {
        map_data: defaultMindMap
      }
    };
    
    console.log('返回默认知识导图数据');
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('获取知识导图时出错:', error);
    console.error('错误堆栈:', error.stack);
    return NextResponse.json(
      { success: false, error: "获取知识导图数据失败", details: error.message },
      { status: 500 }
    );
  }
}