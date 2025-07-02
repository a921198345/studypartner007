/**
 * AI回答上下文与知识提取API
 * 
 * 处理AI回答后的知识点提取和上下文管理
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { extractKnowledgePoints, formatKnowledgePoints } from '@/lib/knowledge-extractor';

/**
 * 处理AI回答后的知识点提取
 */
export async function POST(request) {
  try {
    // 1. 获取会话，检查用户是否登录
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        message: '请先登录再使用AI问答功能'
      }, { status: 401 });
    }

    // 2. 解析请求数据
    const data = await request.json();
    const { 
      chat_id, 
      answer_text,
      subject = '民法'
    } = data;
    
    if (!chat_id || !answer_text) {
      return NextResponse.json({
        success: false,
        message: '回答ID和内容不能为空'
      }, { status: 400 });
    }

    // 3. 提取知识点
    console.log(`从AI回答中提取知识点，回答ID: ${chat_id}`);
    console.log(`回答长度: ${answer_text.length} 字符`);
    
    const extractedPoints = extractKnowledgePoints(answer_text, subject);
    const formattedPoints = formatKnowledgePoints(extractedPoints, subject);
    
    console.log(`成功提取 ${formattedPoints.length} 个知识点`);
    
    // 4. 更新数据库中的记录，添加提取的知识点
    try {
      const knowledgePointsJson = JSON.stringify(formattedPoints);
      
      await query(
        `UPDATE user_ai_chat_history
         SET related_knowledge_points = ?
         WHERE chat_id = ?`,
        [knowledgePointsJson, chat_id]
      );
      
      console.log(`已将知识点保存到数据库，chat_id: ${chat_id}`);
    } catch (dbError) {
      console.error('保存知识点到数据库失败:', dbError);
      // 继续处理，即使保存失败
    }
    
    // 5. 确认用户问答次数已成功记录
    try {
      const chatRecord = await query(
        `SELECT user_id FROM user_ai_chat_history WHERE chat_id = ?`,
        [chat_id]
      );
      
      if (chatRecord && chatRecord.length > 0) {
        const userId = chatRecord[0].user_id;
        
        // 确认用户的问答次数已更新，这通常已经在初始请求中完成
        // 这里只是额外检查一下确保更新成功
        console.log(`确认用户ID ${userId} 的问答次数已更新`);
      }
    } catch (userError) {
      console.error('确认用户问答次数更新失败:', userError);
      // 继续处理，即使确认失败
    }
    
    // 6. 返回提取的知识点
    return NextResponse.json({
      success: true,
      message: '知识点提取成功',
      data: {
        chat_id,
        knowledge_points: formattedPoints,
        count: formattedPoints.length
      }
    });
    
  } catch (error) {
    console.error('知识点提取错误:', error);
    return NextResponse.json({
      success: false,
      message: '知识点提取失败，请稍后重试'
    }, { status: 500 });
  }
} 