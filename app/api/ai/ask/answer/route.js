/**
 * AI回答生成API接口
 * 
 * 处理用户问题并调用DeepSeek生成AI回答
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateAnswer, buildPrompt } from '@/lib/deepseek';
import { logAIResponse } from '@/lib/ai-log';

/**
 * 处理AI回答请求
 */
export async function POST(request) {
  try {
    // 1. 获取会话，检查用户是否登录
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        message: '请先登录再使用AI回答功能',
        requireLogin: true
      }, { status: 200 });  // 返回200状态码，避免前端报错
    }

    // 2. 解析请求数据
    const data = await request.json();
    const { 
      question_text,
      chat_id,
      context = [],
      knowledge_points = []
    } = data;
    
    if (!question_text || !chat_id) {
      return NextResponse.json({
        success: false,
        message: '问题文本和会话ID不能为空'
      }, { status: 400 });
    }
    
    // 3. 使用DeepSeek API生成回答
    console.log(`开始为问题生成AI回答: "${question_text.substring(0, 50)}${question_text.length > 50 ? '...' : ''}"`);
    console.log(`相关上下文数量: ${context.length}`);
    
    // 构建提示词
    const prompt = buildPrompt(question_text, context);
    
    // 调用DeepSeek API
    const answer = await generateAnswer(prompt);
    
    if (!answer) {
      throw new Error('无法生成回答，请稍后重试');
    }
    
    // 4. 将回答保存到数据库
    console.log('保存AI回答到数据库...');
    const knowledgePointsJson = knowledge_points && knowledge_points.length > 0 
      ? JSON.stringify(knowledge_points) 
      : null;
      
    await logAIResponse(chat_id, answer, knowledgePointsJson);
    
    // 5. 返回AI回答
    return NextResponse.json({
      success: true,
      message: '成功生成AI回答',
      data: {
        answer: answer,
        chat_id: chat_id
      }
    });
    
  } catch (error) {
    console.error('生成AI回答错误:', error);
    return NextResponse.json({
      success: false,
      message: '生成回答时出现错误，请稍后重试'
    }, { status: 500 });
  }
} 