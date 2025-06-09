// 定义AI服务相关的接口和函数

export interface AskAIParams {
  question: string;
  imageBase64?: string;
  sessionId?: string;
}

export interface AskAIResponse {
  success: boolean;
  message?: string;
  data?: {
    answer: string;
    sessionId: string;
    chatId: string;
    relatedKnowledgePoints?: any[];
    usageInfo?: {
      dailyUsed: number;
      dailyLimit: number;
    };
  };
}

export interface AIStreamCallbacks {
  onStart?: () => void;
  onToken: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * 向AI发送问题并获取流式响应
 * @param params 请求参数
 * @param callbacks 流式回调函数
 */
export const askAIStream = async (params: AskAIParams, callbacks: AIStreamCallbacks) => {
  try {
    // 调用onStart回调
    callbacks.onStart?.();
    
    // 确保使用正确的端口，避免相对路径问题
    const host = window.location.origin;
    const API_BASE_URL = `${host}/api/ai/ask/stream`;
    
    console.log('流式请求参数:', JSON.stringify({
      question: params.question,
      hasImage: !!params.imageBase64,
      sessionId: params.sessionId
    }));
    
    // 准备请求参数
    const requestParams = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    };

    // 创建fetch请求
    try {
      console.log('发送API请求到:', API_BASE_URL);
      const response = await fetch(API_BASE_URL, requestParams);
      
      console.log('API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = '请求失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `服务器返回状态码: ${response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      // 检查是否支持流式响应
      if (!response.body) {
        throw new Error('您的浏览器不支持流式响应');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = ''; // 添加缓冲区处理不完整的行
      
      console.log('🚀 开始读取流式数据...');
      
      // 使用简单的while循环替代递归
      let done = false;
      while (!done) {
        try {
          const result = await reader.read();
          done = result.done;
          
          if (done) {
            // 处理缓冲区中剩余的数据
            if (buffer.trim() && buffer.startsWith('data: ')) {
              const content = buffer.substring(6).trim();
              if (content && content !== '[DONE]') {
                try {
                  const jsonData = JSON.parse(content);
                  if (jsonData.content) {
                    fullResponse += jsonData.content;
                    callbacks.onToken(jsonData.content);
                  }
                } catch (e) {
                  console.error('解析剩余数据失败:', e);
                }
              }
            }
            console.log('流式响应完成，总长度:', fullResponse.length);
            callbacks.onComplete?.(fullResponse);
            break;
          }
          
          const value = result.value;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          console.log('📦 收到数据块:', chunk.length, '字符');
          
          // 处理SSE格式的响应
          const lines = buffer.split('\n');
          // 保留最后一行（可能不完整）
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const content = line.substring(6).trim();
                
                // 检查是否是[DONE]标记
                if (content === '[DONE]') {
                  console.log('📍 客户端收到[DONE]标记');
                  continue;
                }
                
                // 立即尝试解析JSON
                try {
                  const jsonData = JSON.parse(content);
                  
                  // 优先处理我们自定义的格式 {content: "..."}
                  if (jsonData.content !== undefined) {
                    const tokenText = jsonData.content;
                    fullResponse += tokenText;
                    callbacks.onToken(tokenText);
                    console.log('✅ 处理自定义格式token:', tokenText.length, '字符');
                  }
                  // 处理DeepSeek原始格式 (备用)
                  else if (jsonData.choices && jsonData.choices.length > 0 && 
                           jsonData.choices[0].delta && jsonData.choices[0].delta.content !== undefined) {
                    const tokenText = jsonData.choices[0].delta.content;
                    fullResponse += tokenText;
                    callbacks.onToken(tokenText);
                    console.log('✅ 处理DeepSeek格式token:', tokenText.length, '字符');
                  } else {
                    console.log('⚠️ 未识别的数据格式:', JSON.stringify(jsonData));
                  }
                } catch (jsonError) {
                  // 如果JSON解析失败，检查是否是纯文本
                  if (content && content.length > 0 && !content.includes('{')) {
                    fullResponse += content;
                    callbacks.onToken(content);
                    console.log('✅ 收到纯文本:', content.substring(0, 50) + '...');
                  } else {
                    console.warn('⚠️ 解析失败的数据:', content.substring(0, 100));
                  }
                }
              } catch (parseError) {
                console.error('❌ 流数据处理错误:', parseError);
              }
            }
          }
          
        } catch (error) {
          console.error("流式数据读取错误:", error);
          callbacks.onError?.(error as Error);
          break;
        }
      }
      
      return () => {
        // 返回取消函数
        reader.cancel();
      };
    } catch (error) {
      console.error("Fetch调用错误:", error);
      callbacks.onError?.(error as Error);
    }
  } catch (error) {
    console.error("总体错误:", error);
    callbacks.onError?.(error as Error);
  }
};

/**
 * 向AI发送问题并获取完整响应（非流式）
 * @param params 请求参数
 * @returns 响应数据
 */
export const askAI = async (params: AskAIParams): Promise<AskAIResponse> => {
  const host = window.location.origin;
  const API_URL = `${host}/api/ai/ask`;
  
  console.log('发送API请求到:', API_URL);
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  
  return data;
}; 