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
import { moderateAIAnswer } from '@/lib/content-moderation';

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
        message: '请先登录再使用AI回答功能'
      }, { status: 401 });
    }

    // 2. 解析请求数据
    const data = await request.json();
    const { 
      question_text,
      chat_id,
      context = [],
      knowledge_points = [],
      subject = '民法'  // 默认学科为民法
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
    
    // 4. 内容审核
    console.log('开始对AI回答进行内容审核...');
    const moderationResult = await moderateAIAnswer(answer, question_text, subject);
    
    // 获取最终回答（原始回答或经过修改的回答）
    const finalAnswer = moderationResult.modifiedAnswer || answer;
    
    // 如果内容不允许展示，则返回错误
    if (!moderationResult.isAllowed) {
      return NextResponse.json({
        success: false,
        message: moderationResult.reason || '回答内容不符合要求',
        data: {
          chat_id: chat_id
        }
      }, { status: 403 });
    }
    
    // 5. 将回答保存到数据库
    console.log('保存AI回答到数据库...');
    const knowledgePointsJson = knowledge_points && knowledge_points.length > 0 
      ? JSON.stringify(knowledge_points) 
      : null;
      
    await logAIResponse(chat_id, finalAnswer, knowledgePointsJson);
    
    // 6. 返回AI回答
    return NextResponse.json({
      success: true,
      message: moderationResult.reason ? `成功生成AI回答 (${moderationResult.reason})` : '成功生成AI回答',
      data: {
        answer: finalAnswer,
        chat_id: chat_id,
        has_modification: finalAnswer !== answer
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