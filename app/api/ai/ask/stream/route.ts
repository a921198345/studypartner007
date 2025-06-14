import { NextRequest } from 'next/server';
import { generateAnswerStream, buildPrompt } from '@/lib/deepseek.js';
import { getTextEmbedding } from '@/lib/embeddings.js';
import { searchVectorChunks, searchByKeywords } from '@/lib/vector-search.js';

// 设置能够流式响应的headers
export const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*', // 允许跨域请求
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}



/**
 * 根据问题文本判断相关学科
 * @param question 用户问题
 * @returns 学科名称
 */
function detectSubject(question: string): string {
  const keywords = [
    { subject: "民法", terms: ["民法", "合同", "债务", "侵权", "物权", "婚姻", "继承", "人格权", "所有权", "抵押", "质押"] },
    { subject: "刑法", terms: ["刑法", "犯罪", "刑罚", "量刑", "故意", "过失", "正当防卫", "紧急避险", "共同犯罪"] },
    { subject: "行政法", terms: ["行政法", "行政处罚", "行政许可", "行政强制", "行政复议", "行政诉讼", "公务员", "政府"] },
    { subject: "民诉法", terms: ["民事诉讼", "起诉", "管辖", "证据", "审理", "判决", "执行", "上诉", "再审"] },
    { subject: "刑诉法", terms: ["刑事诉讼", "侦查", "起诉", "审判", "证据", "辩护", "强制措施", "搜查"] },
    { subject: "商法", terms: ["公司法", "证券法", "保险法", "票据法", "破产法", "企业", "股东", "董事"] },
    { subject: "经济法", terms: ["反垄断", "消费者权益", "银行法", "税法", "环境法", "竞争法"] },
    { subject: "国际法", terms: ["国际法", "国际私法", "国际经济法", "条约", "外交", "领土", "主权"] },
    { subject: "宪法", terms: ["宪法", "基本权利", "国家机构", "选举", "人大", "国务院", "法院", "检察院"] },
    { subject: "法理学", terms: ["法理", "法的本质", "法的作用", "法的价值", "法的效力", "法律关系", "法治"] }
  ];

  // 统计每个学科关键词匹配数量
  const scores = keywords.map(({ subject, terms }) => {
    const matchCount = terms.filter(term => question.includes(term)).length;
    return { subject, score: matchCount };
  });

  // 找出得分最高的学科
  const bestMatch = scores.reduce((max, current) => 
    current.score > max.score ? current : max
  );

  // 如果没有匹配或匹配度太低，返回默认学科
  return bestMatch.score > 0 ? bestMatch.subject : "民法";
}

// 接收POST请求，获取问题文本，返回流式响应
export async function POST(req: NextRequest) {
  console.log("接收到AI问答请求");
  
  try {
    // 解析请求体
    const requestData = await req.json();
    const { question, imageBase64, sessionId } = requestData;
    
    console.log("请求参数:", { 
      question: question?.substring(0, 30), 
      hasImage: !!imageBase64, 
      sessionId 
    });

    // 验证请求参数
    if (!question && !imageBase64) {
      console.log("缺少必要的请求参数");
      return new Response(JSON.stringify({ 
        success: false, 
        message: '请提供问题文本或图片' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 创建一个可读流，用于流式传输响应
    const encoder = new TextEncoder();
    let controllerClosed = false; // 添加标志位跟踪controller状态
    
    const stream = new ReadableStream({
      async start(controller) {
        // 安全的enqueue函数，避免在closed后写入
        const safeEnqueue = (data: string) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (error) {
              console.error('Enqueue error:', error);
            }
          }
        };
        
        // 安全的close函数，避免重复关闭
        const safeClose = () => {
          if (!controllerClosed) {
            controllerClosed = true;
            try {
              controller.close();
            } catch (error) {
              console.error('Close error:', error);
            }
          }
        };
        
        try {
          // 立即发送一个初始响应，确保连接建立
          safeEnqueue(`data: {"type": "init", "content": ""}\n\n`);
          // 立即开始，不显示多余的状态消息
          console.log('🚀 开始处理用户问题');
          
          // 并行处理：同时进行学科识别和知识库准备
          let contextChunks = [];
          let subject = "民法"; // 默认学科
          
          if (question) {
            // 快速学科识别（不等待，立即处理）
            subject = detectSubject(question);
            console.log('🎯 识别学科:', subject);
            
            // 异步进行知识库搜索（不阻塞AI调用）
            const searchPromise = (async () => {
              try {
                console.log('📚 开始检索相关法条...');
                
                const questionVector = await getTextEmbedding(question);
                if (questionVector && questionVector.length > 0) {
                  const chunks = await searchVectorChunks(subject, questionVector, 3);
                  console.log('✅ 找到', chunks.length, '个相关法条');
                  return chunks;
                } else {
                  const chunks = await searchByKeywords(question, subject, 2);
                  console.log('✅ 找到', chunks.length, '个相关内容');
                  return chunks;
                }
              } catch (error) {
                console.warn('⚠️ 知识库检索失败:', error.message);
                return [];
              }
            })();
            
            // 等待知识库检索完成（设置短超时）
            try {
              contextChunks = await Promise.race([
                searchPromise,
                new Promise(resolve => setTimeout(() => resolve([]), 2000)) // 2秒超时
              ]);
            } catch {
              contextChunks = [];
            }
          }
          
          // 5. 构建上下文
          const contextTexts = contextChunks
            .filter(chunk => chunk.similarity > 0.1) // 过滤相似度太低的结果
            .map(chunk => chunk.original_text);
          
          // 6. 构建完整的提示词
          const fullPrompt = buildPrompt(question || '请分析这张图片', contextTexts, imageBase64);
          console.log('构建的提示词长度:', fullPrompt.length);
          
          // 7. 调用DeepSeek生成流式回答 (如果没有API密钥则使用模拟回答)
          try {
            console.log('尝试调用DeepSeek API...');
            console.log('API Key 存在:', !!process.env.DEEPSEEK_API_KEY);
            console.log('NODE_ENV:', process.env.NODE_ENV);
            console.log('MOCK_AI_RESPONSE:', process.env.MOCK_AI_RESPONSE);
            
            const deepseekStream = await generateAnswerStream(fullPrompt, imageBase64);
            
            if (!deepseekStream) {
              throw new Error('DeepSeek流式响应为空');
            }
            
            const reader = deepseekStream.getReader();
            const decoder = new TextDecoder();
            
            // 立即开始AI内容流，不添加多余的换行符
            
            // 8. 处理流式响应
            const textDecoder = new TextDecoder();
            let buffer = '';
            
            while (!controllerClosed) { // 检查是否已关闭
              const { done, value } = await reader.read();
              
              if (done || controllerClosed) {
                break;
              }
              
              // 累积接收到的数据
              buffer += textDecoder.decode(value, { stream: true });
              
              // 按行分割处理SSE数据
              const lines = buffer.split('\n');
              
              // 保留最后一行（可能是不完整的）
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine.startsWith('data: ')) {
                  const dataContent = trimmedLine.substring(6).trim();
                  
                  // 跳过[DONE]标记
                  if (dataContent === '[DONE]') {
                    continue;
                  }
                  
                  try {
                    // 解析DeepSeek返回的JSON数据
                    const jsonData = JSON.parse(dataContent);
                    console.log('📦 DeepSeek原始响应:', JSON.stringify(jsonData).substring(0, 200));
                    
                    if (jsonData.choices && jsonData.choices.length > 0) {
                      const choice = jsonData.choices[0];
                      if (choice.delta && choice.delta.content) {
                        const content = choice.delta.content;
                        console.log('📝 发送内容片段:', content.substring(0, 50));
                        // 转发给客户端
                        const data = JSON.stringify({ content });
                        safeEnqueue(`data: ${data}\n\n`);
                      } else if (choice.finish_reason) {
                        console.log('DeepSeek响应完成:', choice.finish_reason);
                      }
                    } else if (jsonData.error) {
                      console.error('DeepSeek API错误:', jsonData.error);
                      throw new Error(jsonData.error.message || 'API错误');
                    }
                  } catch (parseError) {
                    console.error('解析DeepSeek响应错误:', parseError);
                    console.error('原始数据:', dataContent);
                    // 如果解析失败，尝试直接使用内容
                    if (dataContent && dataContent.trim() && !dataContent.includes('{')) {
                      const data = JSON.stringify({ content: dataContent });
                      safeEnqueue(`data: ${data}\n\n`);
                    }
                  }
                }
              }
            }
            
          } catch (aiError) {
            console.error('DeepSeek API调用失败:', aiError);
            
            // 直接向用户展示具体的API错误
            const errorMessage = aiError.message || 'API调用失败';
            safeEnqueue(`data: {"content": "\\n\\n⚠️ **API错误**\\n\\n"}\n\n`);
            safeEnqueue(`data: {"content": "错误信息: ${errorMessage}\\n\\n"}\n\n`);
            
            // 如果是认证错误，提供更详细的信息
            if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
              safeEnqueue(`data: {"content": "请检查 API 密钥配置是否正确。\\n"}\n\n`);
              safeEnqueue(`data: {"content": "当前使用的密钥后4位: ${process.env.DEEPSEEK_API_KEY?.slice(-4) || '未设置'}\\n\\n"}\n\n`);
            }
            
            let fallbackAnswer = '';
            if (contextTexts.length > 0) {
              // 如果有找到相关知识，基于知识库内容生成回答
              fallbackAnswer = `## 📖 基于知识库的解答

**问题：** ${question}

**相关法律条文：**
${contextTexts.slice(0, 2).map((text, index) => `${index + 1}. ${text.substring(0, 200)}...`).join('\\n\\n')}

**学习建议：**
1. **重点掌握**：以上法条是该问题的核心依据
2. **理解记忆**：结合具体案例加深理解
3. **举一反三**：思考类似情况的处理方式
4. **考试要点**：这类问题在法考中属于常考内容

💡 **提示**：建议结合教材和真题进一步学习。如需更详细解答，请稍后重试。`;
            } else {
              // 没有找到相关知识的通用回答
              const subject = detectSubject(question);
              fallbackAnswer = `## 📚 ${subject}学习指导

**您的问题：** ${question}

**学习建议：**
1. **法条查阅**：重点关注${subject}相关的核心法条
2. **教材学习**：系统学习该领域的基础理论
3. **真题练习**：通过历年真题掌握考试要点
4. **案例分析**：结合实际案例理解法条应用

**常见考点提醒：**
- ${subject}的基本原则和制度
- 重要法条的准确理解和应用
- 典型案例的分析方法

💡 **建议**：AI服务暂时不可用，请查阅相关教材或稍后重试。`;
            }

            // 将回答按合理的块进行分割，而不是按句子
            const chunks = [
              fallbackAnswer.substring(0, fallbackAnswer.indexOf('\\n\\n**相关法律条文：**') + 1),
              fallbackAnswer.substring(fallbackAnswer.indexOf('**相关法律条文：**'), fallbackAnswer.indexOf('\\n\\n**学习建议：**') + 1),
              fallbackAnswer.substring(fallbackAnswer.indexOf('**学习建议：**'))
            ].filter(chunk => chunk.trim());
            
            if (chunks.length === 0) {
              // 如果分割失败，按段落分割
              const paragraphs = fallbackAnswer.split('\\n\\n').filter(p => p.trim());
              for (const paragraph of paragraphs) {
                if (controllerClosed) break; // 检查是否已关闭
                safeEnqueue(`data: {"content": "${paragraph.replace(/"/g, '\\"')}\\n\\n"}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            } else {
              for (const chunk of chunks) {
                if (controllerClosed) break; // 检查是否已关闭
                safeEnqueue(`data: {"content": "${chunk.replace(/"/g, '\\"')}"}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
          }
          
          // 9. 发送完成标记
          safeEnqueue('data: [DONE]\n\n');
          safeClose();
          
        } catch (error) {
          console.error("流式响应生成错误:", error);
          safeEnqueue(`data: {"content": "生成回答时出现错误，请稍后重试。"}\n\n`);
          safeEnqueue('data: [DONE]\n\n');
          safeClose();
        }
      },
      cancel() {
        // 当客户端断开连接时调用
        console.log('客户端断开连接，清理资源');
        controllerClosed = true;
      }
    });
    
    // 返回流式响应，添加关键的响应头
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: '处理请求时出错' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

 