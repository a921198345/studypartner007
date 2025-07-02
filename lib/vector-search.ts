"use client"

// 向量搜索功能
import EmbeddingService from './embeddings.ts';

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

// 简化的关键词搜索函数（用于向后兼容）
export async function searchByKeywords(keywords, subject = '', limit = 10, strictMatch = false, parentNodes = []) {
  try {
    console.log(`searchByKeywords被调用: ${keywords}, 学科: ${subject}, 限制: ${limit}`);
    
    // 这里应该实现真正的向量搜索逻辑
    // 目前返回空结果以避免错误
    return [];
  } catch (error) {
    console.error('关键词搜索失败:', error);
    return [];
  }
}

export default VectorSearchService;
