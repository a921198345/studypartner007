/**
 * 向量化模块 - embeddings.js
 * 用于调用DeepSeek API将文本转换为向量嵌入
 */

import axios from 'axios';

// 缓存已经处理过的文本，避免重复请求
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 100; // 最大缓存条目数

/**
 * 获取文本的向量嵌入表示
 * @param {string} text - 需要向量化的文本
 * @returns {Promise<number[]|null>} 向量表示，失败返回null
 */
export async function getTextEmbedding(text) {
  if (!text || typeof text !== 'string') {
    console.error('无效的输入文本');
    return null;
  }
  
  // 裁剪过长的文本
  const trimmedText = text.length > 8000 ? text.substring(0, 8000) : text;
  
  // 检查缓存
  const cacheKey = trimmedText;
  if (embeddingCache.has(cacheKey)) {
    console.log('使用缓存的向量嵌入');
    return embeddingCache.get(cacheKey);
  }
  
  
  try {
    // 使用DeepSeek API获取嵌入向量
    const embedding = await callDeepSeekEmbedding(trimmedText);
    
    // 缓存结果
    if (embedding) {
      // 如果缓存太大，删除最早的条目
      if (embeddingCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = embeddingCache.keys().next().value;
        embeddingCache.delete(oldestKey);
      }
      
      embeddingCache.set(cacheKey, embedding);
    }
    
    return embedding;
  } catch (error) {
    console.error('获取文本向量嵌入失败:', error);
    return null;
  }
}

/**
 * 调用DeepSeek API获取文本的嵌入向量
 * @param {string} text - 需要向量化的文本
 * @returns {Promise<number[]|null>} 嵌入向量，失败返回null
 */
async function callDeepSeekEmbedding(text) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('缺少DEEPSEEK_API_KEY环境变量');
  }
  
  const apiUrl = 'https://api.deepseek.com/v1/embeddings';
  
  console.log('正在调用API获取向量嵌入...');
  console.log(`API端点: ${apiUrl}`);
  console.log(`输入文本长度: ${text.length}字符`);
  console.log(`使用的API密钥后4位: ${apiKey.slice(-4)}`);
  
  try {
    const response = await axios.post(
      apiUrl,
      {
        model: 'deepseek-embeddings',
        input: text,
        encoding_format: 'float'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log('成功获取向量嵌入');
      console.log(`向量维度: ${response.data.data[0].embedding.length}`);
      return response.data.data[0].embedding;
    } else {
      console.error('API响应缺少向量数据:', response.data);
      throw new Error('API响应格式无效');
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
      throw new Error(`DeepSeek API错误 (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}


/**
 * 批量获取多个文本的向量嵌入
 * @param {string[]} texts - 文本数组
 * @returns {Promise<Array<number[]|null>>} 向量数组，对应位置处理失败为null
 */
export async function getBatchEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  
  // 并行处理每个文本
  const promises = texts.map(text => getTextEmbedding(text));
  const embeddings = await Promise.all(promises);
  
  return embeddings;
}

/**
 * DeepSeek API 向量化工具类
 */
class DeepSeekEmbeddings {
  /**
   * 初始化DeepSeek API配置
   * @param {string} apiKey - DeepSeek API密钥，如果不提供则尝试从环境变量获取
   */
  constructor(apiKey = null) {
    // 获取API密钥
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('未找到DeepSeek API密钥，请通过参数传入或设置DEEPSEEK_API_KEY环境变量');
    }
    
    // API配置
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/embeddings'; // 从环境变量获取API URL
    this.model = 'deepseek-embeddings'; // 使用的模型名称
    this.maxRetries = 3; // 最大重试次数
    this.retryDelay = 2000; // 重试间隔(毫秒)
  }

  /**
   * 获取文本的向量嵌入
   * @param {string} text - 要向量化的文本
   * @returns {Promise<Array<number>|null>} - 文本的向量表示，失败返回null
   */
  async getEmbedding(text) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        console.log(`尝试向量化文本 (尝试 ${retries + 1}/${this.maxRetries})`);
        
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            input: text
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30秒超时
          }
        );
        
        // 成功获取响应
        if (response.status === 200 && response.data) {
          return response.data.data?.[0]?.embedding || null;
        } else {
          throw new Error(`API响应格式错误: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        console.error('向量化API调用错误:', error.message);
        
        // 如果是速率限制错误，等待后重试
        if (error.response && error.response.status === 429) {
          console.log(`API速率限制，等待重试...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
        } else {
          // 对于网络错误也进行重试
          console.log(`网络错误，稍后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
      
      retries++;
    }
    
    console.error(`经过 ${this.maxRetries} 次重试后仍无法获取向量嵌入`);
    return null;
  }
}

// ES module格式导出
export default {
  getTextEmbedding,
  getBatchEmbeddings,
  DeepSeekEmbeddings
}; 