import { NextRequest } from 'next/server';
import { generateAnswerStream, buildPrompt } from '@/lib/deepseek';

export async function POST(req: NextRequest) {
  try {
    const { knowledgePoint, subject, parentNodes = [] } = await req.json();
    
    if (!knowledgePoint) {
      return new Response(JSON.stringify({ error: '缺少知识点名称' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 构建专业的法考知识点详解提示词
    const analysisPrompt = buildAnalysisPrompt(knowledgePoint, subject, parentNodes);
    
    // 调用DeepSeek进行流式分析
    const fullPrompt = buildPrompt(analysisPrompt, []);
    const deepseekStream = await generateAnswerStream(fullPrompt);
    
    if (!deepseekStream) {
      throw new Error('AI分析服务不可用');
    }

    // 创建流式响应
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
              console.error('知识点详解 Enqueue error:', error);
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
              console.error('知识点详解 Close error:', error);
            }
          }
        };
        
        try {
          // 立即发送一个初始响应，确保连接建立
          safeEnqueue(`data: {"type": "init", "content": ""}\n\n`);
          console.log('🚀 开始生成知识点详解:', knowledgePoint);
          
          const reader = deepseekStream.getReader();
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
                  safeEnqueue('data: [DONE]\n\n');
                  safeClose();
                  return;
                }
                
                try {
                  // 解析DeepSeek返回的JSON数据
                  const jsonData = JSON.parse(dataContent);
                  
                  if (jsonData.choices && jsonData.choices.length > 0) {
                    const choice = jsonData.choices[0];
                    if (choice.delta && choice.delta.content) {
                      const content = choice.delta.content;
                      console.log('📝 知识点详解内容片段:', content.substring(0, 20));
                      // 转发给客户端
                      const data = JSON.stringify({ content });
                      safeEnqueue(`data: ${data}\n\n`);
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
          
          // 处理最后的缓冲区数据
          if (buffer.trim() && !controllerClosed) {
            console.log('处理剩余缓冲区:', buffer.substring(0, 50));
            if (buffer.startsWith('data: ')) {
              const dataContent = buffer.substring(6).trim();
              if (dataContent && dataContent !== '[DONE]') {
                try {
                  const jsonData = JSON.parse(dataContent);
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    const data = JSON.stringify({ content });
                    safeEnqueue(`data: ${data}\n\n`);
                  }
                } catch (e) {
                  console.error('解析最后缓冲区错误:', e);
                }
              }
            }
          }
          
        } catch (error) {
          console.error('知识点详解流式传输错误:', error);
          safeEnqueue(`data: ${JSON.stringify({ error: '分析过程中出现错误: ' + error.message })}\n\n`);
        } finally {
          safeClose();
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
    console.error('知识点详解失败:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : '分析过程中出现错误'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * 构建法考知识点详解的专业提示词
 */
function buildAnalysisPrompt(knowledgePoint: string, subject: string, parentNodes: string[] = []): string {
  const contextInfo = parentNodes.length > 0 
    ? `，属于【${parentNodes.join(' → ')}】体系下的具体考点`
    : '';

  // 根据不同学科提供更精准的分析角度
  const subjectSpecificTips = getSubjectSpecificTips(subject);

  return `你是资深法考辅导专家，对历年国家统一法律职业资格考试有深入研究。请对以下知识点进行专业详解。

**分析对象：** ${knowledgePoint}（${subject}${contextInfo}）

**特别说明：** ${subjectSpecificTips}

## 📍 考点定位
- **考试地位**：在法考${subject}中的重要程度和必考指数
- **出题频率**：近年来的考查频率（每年/隔年/偶尔）
- **分值比重**：在该科目中所占分值比例
- **题型偏好**：主要出现在哪种题型中

## 🎯 核心考点
### ⚡ 重点内容（核心掌握）
- 核心定义和构成要件
- 法定条件和适用范围  
- 与其他制度的关系
- 实务操作要点

### 🔍 难点解析（精准突破）
- 概念辨析的关键区别
- 容易混淆的相似制度
- 理解上的常见误区
- 记忆难点的突破方法

## 📊 高频考法
- **命题角度**：常见的出题方式
- **陷阱设置**：题目中的典型干扰选项
- **关键词提示**：题干中的重要信号词
- **解题技巧**：快速识别和应对的方法

## 🔗 关联考点
- **内部联系**：与本科目其他知识点的关联
- **交叉考查**：可能与其他科目结合出题的情况
- **体系位置**：在整个法律体系中的地位

## 💡 记忆要点
- **核心要点**：最应该重点掌握的核心内容
- **记忆方法**：便于记忆的技巧或联想方法
- **理解角度**：深入理解的关键要点

**要求：**
1. 基于真实法考情况，内容准确专业
2. 突出应试实用性，避免纯理论阐述  
3. 语言简洁明了，重点突出
4. 总字数控制在1000字左右
5. 严格使用Markdown格式
6. 不包含生动案例和备考建议部分

请开始详解：`;
}

/**
 * 根据学科提供特定的分析提示
 */
function getSubjectSpecificTips(subject: string): string {
  const tips: Record<string, string> = {
    '民法': '重点关注合同、物权、侵权三大板块的实务应用，注意民法典的新变化和司法解释',
    '刑法': '重点分析罪名构成要件、数罪并罚、量刑情节等核心问题，注意总则与分则的结合',
    '行政法': '重点关注行政行为的效力、程序和救济途径，注意与民法、刑法的交叉',
    '民事诉讼法': '重点分析程序规则、证据制度和执行程序，注意2021年民诉法修改内容',
    '刑事诉讼法': '重点关注强制措施、证据规则和程序正义，注意与实体法的配合',
    '商经知': '重点分析公司、证券、知识产权等商事法律关系，注意商法特有制度',
    '三国法': '重点关注法律适用、国际条约和涉外民商事争议解决',
    '理论法': '重点分析法理学核心概念、宪法基本制度和法律职业伦理'
  };
  
  return tips[subject] || '请结合该学科的特点进行针对性分析';
}