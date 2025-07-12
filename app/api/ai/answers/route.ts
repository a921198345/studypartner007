/**
 * 标准化AI问答API端点
 * POST /api/ai/answers - 创建AI答案
 */

import { NextRequest, NextResponse } from 'next/server';
import { withUnifiedAuth } from '@/lib/unified-auth';
import { checkUserMembershipStatus } from '@/lib/membership-middleware';

// POST /api/ai/answers - 创建AI答案（同步）
export const POST = withUnifiedAuth(async (request: NextRequest) => {
  try {
    const user_id = request.user.user_id;
    
    // 检查用户会员状态和使用限制
    const userStatus = await checkUserMembershipStatus(user_id);
    if (userStatus.hasReachedLimit) {
      return NextResponse.json({
        success: false,
        error: '您今日免费使用次数已用完',
        upgradeRequired: true,
        usage: {
          used: userStatus.dailyUsed,
          limit: userStatus.dailyLimit
        }
      }, { status: 403 });
    }

    const body = await request.json();
    const { question, context, subject } = body;

    // 验证必填字段
    if (!question || question.trim() === '') {
      return NextResponse.json({
        success: false,
        error: '问题内容不能为空'
      }, { status: 400 });
    }

    // 调用AI服务（这里引用现有的AI逻辑）
    const aiService = await import('@/lib/deepseek');
    const aiResponse = await aiService.generateAnswer({
      question: question.trim(),
      context: context || '',
      subject: subject || '法律',
      user_id
    });

    if (!aiResponse.success) {
      return NextResponse.json({
        success: false,
        error: 'AI服务暂时不可用，请稍后重试'
      }, { status: 503 });
    }

    // 记录使用次数
    await import('@/lib/membership-middleware').then(module => 
      module.logFeatureUsage(user_id, 'ai_chat', 'question', question.substring(0, 100))
    );

    return NextResponse.json({
      success: true,
      data: {
        answer: aiResponse.answer,
        context: aiResponse.context,
        sources: aiResponse.sources || [],
        confidence: aiResponse.confidence || 0.8
      },
      meta: {
        timestamp: new Date().toISOString(),
        processing_time: aiResponse.processingTime || 0
      }
    });

  } catch (error) {
    console.error('AI答案生成失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
});