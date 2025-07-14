// 向量嵌入功能
export class EmbeddingService {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.baseURL = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com/v1';
  }

  async createEmbedding(text, model = 'text-embedding-ada-002') {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('创建嵌入向量失败:', error);
      throw error;
    }
  }

  async createBatchEmbeddings(texts, model = 'text-embedding-ada-002') {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          input: texts
        })
      });

      if (!response.ok) {
        throw new Error(`Batch embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map(item => item.embedding);
    } catch (error) {
      console.error('批量创建嵌入向量失败:', error);
      throw error;
    }
  }

  // 计算余弦相似度
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

// 简化的单函数导出，与API兼容
export async function getTextEmbedding(text, useDeepSeek = true) {
  try {
    if (!process.env.DEEPSEEK_API_KEY && useDeepSeek) {
      console.warn('DeepSeek API密钥未配置，跳过向量嵌入');
      return null;
    }

    const service = new EmbeddingService(
      process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      useDeepSeek ? 'deepseek' : 'openai'
    );
    
    return await service.createEmbedding(text);
  } catch (error) {
    console.error('获取文本嵌入失败:', error);
    return null;
  }
}

export default EmbeddingService;
