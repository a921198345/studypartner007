// DeepSeek API 集成
export class DeepSeekAPI {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com/v1';
  }

  async chat(messages: any[], options: any = {}) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: options.stream || false,
        ...options
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API Error:', response.status, errorData);
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return response;
  }

  async streamChat(messages: any[], onChunk: (chunk: string) => void) {
    const response = await this.chat(messages, { stream: true });
    
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                onChunk(parsed.choices[0].delta.content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default DeepSeekAPI;

// 构建提示词的函数
export function buildPrompt(question: string, contextTexts: string[] = []): string {
  let prompt = '';
  
  // 添加系统角色说明
  prompt += '你是一个专业的法律考试辅导专家，精通中国法律体系。请根据以下信息为用户提供准确、详细的法律知识解答。\n\n';
  
  // 如果有上下文信息，添加到提示词中
  if (contextTexts.length > 0) {
    prompt += '参考信息：\n';
    contextTexts.forEach((context, index) => {
      prompt += `${index + 1}. ${context}\n`;
    });
    prompt += '\n';
  }
  
  // 添加用户问题
  prompt += `用户问题：${question}\n\n`;
  
  // 添加回答要求
  prompt += '请提供：\n';
  prompt += '1. 清晰准确的法律条文解释\n';
  prompt += '2. 相关的法律原理和要点\n';
  prompt += '3. 实际应用示例（如适用）\n';
  prompt += '4. 考试重点和注意事项\n\n';
  prompt += '请用中文回答，语言要专业但易于理解。';
  
  return prompt;
}

// 生成流式回答的函数
export async function generateAnswerStream(prompt: string): Promise<ReadableStream | null> {
  try {
    // 检查 API 密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('未设置 DEEPSEEK_API_KEY 环境变量');
      throw new Error('API密钥未配置');
    }

    console.log('正在调用 DeepSeek API...');
    console.log('API Key 长度:', apiKey.length);
    
    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API 调用失败:', response.status, response.statusText, errorText);
      
      // 特殊处理 402 错误（积分不足）
      if (response.status === 402) {
        throw new Error('DeepSeek API 积分不足，请检查账户余额');
      }
      
      throw new Error(`DeepSeek API 错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.body;

  } catch (error) {
    console.error('generateAnswerStream 错误:', error);
    
    // 如果是开发环境或设置了模拟模式，返回模拟响应
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_AI_RESPONSE === 'true') {
      console.log('使用模拟 AI 响应');
      return createMockStream(prompt);
    }
    
    throw error;
  }
}

// 创建模拟流响应（用于开发或API不可用时）
// 添加缺失的导出函数
export async function generateAnswer(prompt: string): Promise<string> {
  try {
    const stream = await generateAnswerStream(prompt);
    if (!stream) {
      throw new Error('无法获取响应流');
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              fullResponse += parsed.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('generateAnswer 错误:', error);
    throw error;
  }
}

export async function getDeepSeekCompletion(messages: any[], options: any = {}): Promise<any> {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('API密钥未配置');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: false,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 4000,
        ...options
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API 调用失败:', response.status, response.statusText, errorText);
      throw new Error(`DeepSeek API 错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('getDeepSeekCompletion 错误:', error);
    throw error;
  }
}

function createMockStream(prompt: string): ReadableStream {
  const mockResponse = `我是法律学习助手，很抱歉，当前AI服务暂时不可用。

针对您的问题，我建议：
1. 查阅相关法律条文
2. 参考权威法律教材
3. 咨询专业法律人士

这是一个模拟回复，请确保您的DeepSeek API配置正确。`;

  const encoder = new TextEncoder();
  let index = 0;
  
  return new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        if (index < mockResponse.length) {
          const chunk = mockResponse.slice(index, index + 5);
          const sseData = `data: ${JSON.stringify({
            choices: [{
              delta: {
                content: chunk
              }
            }]
          })}\n\n`;
          
          controller.enqueue(encoder.encode(sseData));
          index += 5;
        } else {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          clearInterval(interval);
        }
      }, 100);
    }
  });
}
