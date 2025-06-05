/**
 * 流式AI回答生成API接口
 * 
 * 处理用户问题并调用DeepSeek生成流式AI回答
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateAnswerStream, buildPrompt } from '@/lib/deepseek';
import { logAIResponse } from '@/lib/ai-log';
import { moderateAIAnswer } from '@/lib/content-moderation';

/**
 * 处理流式AI回答请求
 */
export async function POST(request) {
  try {
    // 1. 获取会话，检查用户是否登录
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '请先登录再使用AI回答功能' 
        }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '问题文本和会话ID不能为空' 
        }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // 3. 使用DeepSeek API生成流式回答
    console.log(`开始为问题生成流式AI回答: "${question_text.substring(0, 50)}${question_text.length > 50 ? '...' : ''}"`);
    console.log(`相关上下文数量: ${context.length}`);
    
    // 构建提示词
    const prompt = buildPrompt(question_text, context);
    
    // 调用DeepSeek API获取流式回答
    const stream = await generateAnswerStream(prompt);
    
    // 4. 创建响应流，同时收集完整回答以便进行内容审核和保存到数据库
    const encoder = new TextEncoder();
    let fullAnswer = '';
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        // 获取原始数据
        const text = new TextDecoder().decode(chunk);
        
        // 转发原始数据到客户端
        controller.enqueue(chunk);
        
        // 提取回答内容用于保存
        if (text.includes('data:') && !text.includes('[DONE]')) {
          try {
            // 从数据行中提取JSON
            const lines = text.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data:') && line !== 'data: [DONE]') {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr) {
                  const json = JSON.parse(jsonStr);
                  if (json.content) {
                    fullAnswer += json.content;
                  }
                }
              }
            }
          } catch (error) {
            console.error('解析流数据失败:', error);
          }
        }
      },
      async flush(controller) {
        // 流结束时，对完整回答进行内容审核
        if (fullAnswer) {
          try {
            console.log('对完整回答进行内容审核...');
            const moderationResult = await moderateAIAnswer(fullAnswer, question_text, subject);
            
            // 获取最终回答（原始回答或经过修改的回答）
            const finalAnswer = moderationResult.modifiedAnswer || fullAnswer;
            
            // 如果有警告或修改，发送通知给客户端
            if (moderationResult.reason) {
              const warningMessage = {
                type: 'moderation_notice',
                message: moderationResult.reason,
                has_modification: finalAnswer !== fullAnswer
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningMessage)}\n\n`));
            }
            
            // 如果回答被审核拒绝，发送拒绝消息
            if (!moderationResult.isAllowed) {
              const rejectionMessage = {
                type: 'moderation_rejection',
                message: moderationResult.reason || '回答内容不符合要求'
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(rejectionMessage)}\n\n`));
            } else {
              // 保存通过审核的回答到数据库
              console.log('保存完整回答到数据库...');
              console.log(`回答长度: ${finalAnswer.length} 字符`);
              
              const knowledgePointsJson = knowledge_points && knowledge_points.length > 0 
                ? JSON.stringify(knowledge_points) 
                : null;
              
              await logAIResponse(chat_id, finalAnswer, knowledgePointsJson);
              
              // 如果原始回答和最终回答不同，说明审核进行了修改，需要通知前端
              if (finalAnswer !== fullAnswer) {
                const modificationMessage = {
                  type: 'content_modified',
                  original_length: fullAnswer.length,
                  modified_length: finalAnswer.length
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(modificationMessage)}\n\n`));
              }
            }
          } catch (error) {
            console.error('保存回答到数据库失败:', error);
            // 发送错误消息
            const errorMessage = {
              type: 'error',
              message: '处理回答时出现错误'
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
          }
        }
        
        // 发送结束标记
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      }
    });
    
    // 将输入流通过转换流传递到输出流
    stream.pipeTo(transformStream.writable);
    
    // 5. 返回流式响应
    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error) {
    console.error('生成流式AI回答错误:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: '生成回答时出现错误，请稍后重试' 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 