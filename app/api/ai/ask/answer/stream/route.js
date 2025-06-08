/**
 * 流式AI回答生成API接口
 * 
 * 处理用户问题并调用DeepSeek生成流式AI回答
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateAnswerStream, buildPrompt } from '@/lib/deepseek';
import { logAIResponse } from '@/lib/ai-log';

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
          message: '请先登录再使用AI回答功能',
          requireLogin: true
        }), 
        { 
          status: 200,  // 返回200状态码，避免前端报错
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
      subject = '民法'
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
    
    // 4. 创建响应流，同时收集完整回答以便保存到数据库
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
        // 流结束时，将完整回答保存到数据库
        if (fullAnswer) {
          try {
            console.log('保存完整回答到数据库...');
            console.log(`回答长度: ${fullAnswer.length} 字符`);
            
            const knowledgePointsJson = knowledge_points && knowledge_points.length > 0 
              ? JSON.stringify(knowledge_points) 
              : null;
              
            await logAIResponse(chat_id, fullAnswer, knowledgePointsJson);
            
            // 调用知识点提取API
            try {
              console.log('调用知识点提取API...');
              const extractionResponse = await fetch(new URL('/api/ai/ask/context', request.url), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': request.headers.get('cookie') || '' // 传递cookie以保持会话
                },
                body: JSON.stringify({
                  chat_id,
                  answer_text: fullAnswer,
                  subject
                })
              });
              
              if (extractionResponse.ok) {
                console.log('知识点提取成功');
              } else {
                console.warn('知识点提取API返回非成功状态:', extractionResponse.status);
              }
            } catch (extractionError) {
              console.error('调用知识点提取API失败:', extractionError);
              // 继续执行，不阻塞主流程
            }
          } catch (error) {
            console.error('保存回答到数据库失败:', error);
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