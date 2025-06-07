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
    
    // 确保使用绝对路径，避免相对路径问题
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
      
      // 读取流式数据
      const readChunk = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('流式响应完成');
            callbacks.onComplete?.(fullResponse);
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          
          // 处理SSE格式的响应
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const content = line.substring(6);
                
                // 检查是否是[DONE]标记
                if (content.trim() === '[DONE]') {
                  continue;
                }
                
                // 尝试解析JSON格式的内容
                try {
                  const jsonData = JSON.parse(content);
                  if (jsonData.choices && jsonData.choices.length > 0 && 
                      jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                    const tokenText = jsonData.choices[0].delta.content;
                    fullResponse += tokenText;
                    callbacks.onToken(tokenText);
                  } else if (jsonData.content) {
                    // 兼容其他格式的API响应
                    fullResponse += jsonData.content;
                    callbacks.onToken(jsonData.content);
                  }
                } catch (jsonError) {
                  // 如果不是JSON格式，直接使用内容
                  fullResponse += content;
                  callbacks.onToken(content);
                }
              } catch (parseError) {
                console.error('解析流数据错误:', parseError);
              }
            }
          }
          
          // 继续读取下一个数据块
          readChunk();
        } catch (error) {
          console.error("流式数据读取错误:", error);
          callbacks.onError?.(error as Error);
        }
      };
      
      readChunk();
      
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