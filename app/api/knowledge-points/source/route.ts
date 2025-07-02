/**
 * 知识点出处API
 * 根据知识点名称查找相关的法条条文
 */

import { NextResponse } from 'next/server';
import { searchByKeywords } from '@/lib/vector-search';

export async function POST(request) {
  try {
    const { knowledgePoint, subject, parentNodes = [] } = await request.json();
    
    if (!knowledgePoint) {
      return NextResponse.json({ 
        success: false, 
        message: '知识点名称不能为空' 
      }, { status: 400 });
    }

    console.log(`正在查找知识点"${knowledgePoint}"的相关法条...`);
    console.log(`父级节点:`, parentNodes);

    // 构建搜索关键词，包含知识点本身和父级节点信息
    let searchKeywords = knowledgePoint;
    
    // 如果有父级节点，只使用最直接相关的父节点
    if (parentNodes && parentNodes.length > 0) {
      // 只取最近的1个父级节点，避免搜索词过于宽泛
      const directParent = parentNodes[parentNodes.length - 1];
      // 如果父节点名称较短（如"物权法"），可以作为上下文
      if (directParent && directParent.length <= 6) {
        searchKeywords = `${knowledgePoint} ${directParent}`;
      }
      // 否则仅使用知识点名称本身
    }

    console.log(`搜索关键词: ${searchKeywords}`);

    // 使用增强的关键词搜索查找相关法条
    // 确保只在对应学科中搜索
    const searchSubject = subject || '民法';
    console.log(`在"${searchSubject}"学科中搜索法条`);
    console.log(`父级知识点范围:`, parentNodes);
    
    // 强制使用严格的学科匹配，避免跨学科查询，并传递父级知识点信息
    const results = await searchByKeywords(searchKeywords, searchSubject, 10, true, parentNodes);
    
    // 如果没有找到结果，再尝试只用知识点名称搜索
    let finalResults = results;
    if (results.length === 0 && parentNodes.length > 0) {
      console.log('尝试仅使用知识点名称搜索...');
      // 第二次搜索也使用严格模式和父级知识点信息
      finalResults = await searchByKeywords(knowledgePoint, searchSubject, 10, true, parentNodes);
    }
    
    if (!finalResults || finalResults.length === 0) {
      // 如果是民法相关的，提供更详细的说明
      if (subject === '民法' || subject.includes('民')) {
        return NextResponse.json({
          success: true,
          data: {
            knowledgePoint,
            subject,
            sources: [],
            message: `未找到与"${knowledgePoint}"相关的民法条文。请确保已上传并向量化民法法规文档。`,
            suggestion: '您可以上传"民法法规汇编2025.3.29 _3.docx"或其他民法相关文档到系统中。'
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          knowledgePoint,
          subject,
          sources: [],
          message: `未找到与"${knowledgePoint}"相关的法条条文`
        }
      });
    }

    // 格式化结果，并再次验证学科匹配
    const formattedSources = finalResults
      .filter(result => result.similarity > 0.1) // 过滤相似度太低的结果
      // 额外的学科验证：确保结果的学科与请求的学科匹配
      .filter(result => {
        // 如果result.subject存在，必须与searchSubject匹配
        if (result.subject && result.subject !== searchSubject) {
          console.log(`过滤掉不匹配的学科结果: ${result.subject} !== ${searchSubject}`);
          return false;
        }
        return true;
      })
      .map(result => ({
        id: result.id,
        content: result.original_text,
        source: result.path || '法规汇编',
        subject: result.subject || searchSubject,
        similarity: result.similarity,
        relevance: result.similarity > 0.5 ? '高' : result.similarity > 0.3 ? '中' : '低'
      }));

    return NextResponse.json({
      success: true,
      data: {
        knowledgePoint,
        subject,
        sources: formattedSources,
        total: formattedSources.length,
        message: formattedSources.length > 0 
          ? `找到${formattedSources.length}条相关法条` 
          : `未找到与"${knowledgePoint}"高度相关的法条`
      }
    });

  } catch (error) {
    console.error('查找知识点出处失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error.message 
    }, { status: 500 });
  }
}

// 支持GET方法以便于测试
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const knowledgePoint = searchParams.get('point');
  const subject = searchParams.get('subject');
  
  if (!knowledgePoint) {
    return NextResponse.json({ 
      success: false, 
      message: '请提供知识点名称（参数: point）' 
    }, { status: 400 });
  }

  try {
    const results = await searchByKeywords(knowledgePoint, subject || '民法', 5);
    
    return NextResponse.json({
      success: true,
      data: {
        knowledgePoint,
        subject,
        sources: results,
        total: results.length
      }
    });
  } catch (error) {
    console.error('查找知识点出处失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error.message 
    }, { status: 500 });
  }
}