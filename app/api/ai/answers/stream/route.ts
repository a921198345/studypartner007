/**
 * 标准化AI问答流式API端点
 * POST /api/ai/answers/stream - 创建流式AI答案
 */

import { NextRequest } from 'next/server';
import { withUnifiedAuth } from '@/lib/unified-auth';
import { checkUserMembershipStatus } from '@/lib/membership-middleware';

// POST /api/ai/answers/stream - 流式AI答案生成
export const POST = withUnifiedAuth(async (request: NextRequest) => {
  const user_id = request.user.user_id;
  
  try {
    // 检查用户会员状态
    const userStatus = await checkUserMembershipStatus(user_id);
    if (userStatus.hasReachedLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '您今日免费使用次数已用完',
          upgradeRequired: true
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json();
    const { question, context, subject } = body;

    if (!question || question.trim() === '') {
      return new Response(
        JSON.stringify({
          success: false,
          error: '问题内容不能为空'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始事件
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'start',
              timestamp: new Date().toISOString()
            })}\n\n`)
          );

          // 调用AI流式服务
          const aiService = await import('@/lib/deepseek');
          const streamGenerator = aiService.generateAnswerStream({
            question: question.trim(),
            context: context || '',
            subject: subject || '法律',
            user_id
          });

          // 逐块发送数据
          for await (const chunk of streamGenerator) {
            if (chunk.type === 'content') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: chunk.content,
                  delta: chunk.delta
                })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'done',
                  totalTokens: chunk.totalTokens,
                  processingTime: chunk.processingTime
                })}\n\n`)
              );
              break;
            }
          }

          // 记录使用次数
          await import('@/lib/membership-middleware').then(module => 
            module.logFeatureUsage(user_id, 'ai_chat', 'stream_question', question.substring(0, 100))
          );

        } catch (error) {
          console.error('流式AI服务错误:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'AI服务暂时不可用'
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('流式API错误:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '服务器内部错误'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});