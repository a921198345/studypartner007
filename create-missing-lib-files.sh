#!/bin/bash

echo "🔧 创建缺失的lib文件..."

# 创建 lib/deepseek.js
cat > lib/deepseek.js << 'DEEPSEEK_EOF'
// DeepSeek API 集成
export class DeepSeekAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com/v1';
  }

  async chat(messages, options = {}) {
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
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    return response;
  }

  async streamChat(messages, onChunk) {
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
DEEPSEEK_EOF

# 创建 lib/embeddings.js
cat > lib/embeddings.js << 'EMBEDDINGS_EOF'
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

export default EmbeddingService;
EMBEDDINGS_EOF

# 创建 lib/vector-search.js
cat > lib/vector-search.js << 'VECTOR_EOF'
// 向量搜索功能
import EmbeddingService from './embeddings.js';

export class VectorSearchService {
  constructor(apiKey, provider = 'openai') {
    this.embeddingService = new EmbeddingService(apiKey, provider);
    this.documents = [];
    this.embeddings = [];
  }

  // 添加文档
  async addDocument(text, metadata = {}) {
    try {
      const embedding = await this.embeddingService.createEmbedding(text);
      
      this.documents.push({
        text,
        metadata,
        id: this.documents.length
      });
      
      this.embeddings.push(embedding);
      
      return this.documents.length - 1;
    } catch (error) {
      console.error('添加文档失败:', error);
      throw error;
    }
  }

  // 批量添加文档
  async addDocuments(documents) {
    try {
      const texts = documents.map(doc => doc.text);
      const embeddings = await this.embeddingService.createBatchEmbeddings(texts);
      
      for (let i = 0; i < documents.length; i++) {
        this.documents.push({
          text: documents[i].text,
          metadata: documents[i].metadata || {},
          id: this.documents.length
        });
        
        this.embeddings.push(embeddings[i]);
      }
      
      return this.documents.length;
    } catch (error) {
      console.error('批量添加文档失败:', error);
      throw error;
    }
  }

  // 搜索相似文档
  async search(query, topK = 5) {
    try {
      if (this.documents.length === 0) {
        return [];
      }

      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      
      const similarities = this.embeddings.map((embedding, index) => ({
        index,
        similarity: this.embeddingService.cosineSimilarity(queryEmbedding, embedding),
        document: this.documents[index]
      }));

      // 按相似度排序并返回前 topK 个结果
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .map(result => ({
          text: result.document.text,
          metadata: result.document.metadata,
          similarity: result.similarity,
          id: result.document.id
        }));
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }

  // 清空所有文档
  clear() {
    this.documents = [];
    this.embeddings = [];
  }

  // 获取文档数量
  getDocumentCount() {
    return this.documents.length;
  }

  // 通过ID获取文档
  getDocumentById(id) {
    return this.documents.find(doc => doc.id === id);
  }
}

export default VectorSearchService;
VECTOR_EOF

echo "✅ 所有缺失的lib文件已创建完成！"
