/**
 * AI服务响应时间优化
 * 包含缓存、请求池、响应优化等功能
 */

const crypto = require('crypto');

// ================================
// 1. AI响应缓存系统
// ================================

class AIResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24小时
    this.hitCount = 0;
    this.missCount = 0;
  }

  // 生成缓存键
  generateKey(prompt, context = {}) {
    const data = JSON.stringify({ prompt, context });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // 获取缓存
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.missCount++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    item.accessCount++;
    item.lastAccess = Date.now();
    return item.data;
  }

  // 设置缓存
  set(key, data) {
    // 如果缓存已满，删除最少使用的项目
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      expireAt: Date.now() + this.ttl,
      accessCount: 1,
      lastAccess: Date.now()
    });
  }

  // 删除最少使用的缓存项
  evictLeastUsed() {
    let leastUsedKey = null;
    let minAccessCount = Infinity;
    let oldestAccess = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < minAccessCount || 
          (item.accessCount === minAccessCount && item.lastAccess < oldestAccess)) {
        minAccessCount = item.accessCount;
        oldestAccess = item.lastAccess;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  // 获取缓存统计
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
      cacheSize: this.cache.size,
      maxSize: this.maxSize
    };
  }

  // 清空缓存
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// ================================
// 2. AI请求优化器
// ================================

class AIRequestOptimizer {
  constructor(options = {}) {
    this.cache = new AIResponseCache(options.cache);
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.requestTimeout = options.requestTimeout || 30000;
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 1000;
  }

  // 优化学习计划生成请求
  async generateStudyPlan(prompt, context = {}, options = {}) {
    const cacheKey = this.cache.generateKey(prompt, context);
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached && !options.skipCache) {
      console.log('AI缓存命中，返回缓存结果');
      return {
        success: true,
        data: cached,
        fromCache: true,
        responseTime: 0
      };
    }

    // 检查是否有相同请求正在进行
    if (this.activeRequests.has(cacheKey)) {
      console.log('相同请求正在处理，等待结果');
      return await this.activeRequests.get(cacheKey);
    }

    // 创建新请求
    const requestPromise = this.executeRequest(prompt, context, options);
    this.activeRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // 缓存成功的结果
      if (result.success && !options.skipCache) {
        this.cache.set(cacheKey, result.data);
      }
      
      return result;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  // 执行AI请求
  async executeRequest(prompt, context, options) {
    const startTime = Date.now();
    let lastError = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`AI请求重试 ${attempt}/${this.retryAttempts}`);
          await this.delay(this.retryDelay * attempt);
        }

        const result = await this.makeAIRequest(prompt, context, options);
        const responseTime = Date.now() - startTime;

        return {
          success: true,
          data: result,
          responseTime,
          attempt: attempt + 1
        };

      } catch (error) {
        lastError = error;
        console.error(`AI请求失败 (尝试 ${attempt + 1}):`, error.message);

        // 如果是超时或网络错误，可以重试
        if (this.isRetryableError(error) && attempt < this.retryAttempts) {
          continue;
        }

        break;
      }
    }

    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError.message,
      responseTime,
      attempt: this.retryAttempts + 1
    };
  }

  // 实际发送AI请求
  async makeAIRequest(prompt, context, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      // 优化的prompt，减少token使用
      const optimizedPrompt = this.optimizePrompt(prompt, context);

      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: optimizedPrompt,
          context,
          options: {
            ...options,
            maxTokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      
      throw error;
    }
  }

  // 优化prompt以减少token使用
  optimizePrompt(prompt, context) {
    // 移除多余的空白字符
    let optimized = prompt.replace(/\s+/g, ' ').trim();

    // 使用更简洁的指令
    const optimizations = [
      {
        pattern: /请根据以下信息生成/g,
        replacement: '基于:'
      },
      {
        pattern: /详细的学习计划/g,
        replacement: '学习计划'
      },
      {
        pattern: /请注意以下要求/g,
        replacement: '要求:'
      }
    ];

    optimizations.forEach(({ pattern, replacement }) => {
      optimized = optimized.replace(pattern, replacement);
    });

    // 如果有上下文，合并优化
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join(',');
      optimized = `${optimized}\n上下文:${contextStr}`;
    }

    return optimized;
  }

  // 判断错误是否可重试
  isRetryableError(error) {
    const retryableErrors = [
      '请求超时',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EAI_AGAIN'
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError)
    );
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取优化器统计信息
  getStats() {
    return {
      cache: this.cache.getStats(),
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// ================================
// 3. AI响应流优化
// ================================

class StreamOptimizer {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 50;
    this.buffer = '';
    this.listeners = new Set();
  }

  // 优化流式响应
  optimizeStream(reader, onChunk, onComplete, onError) {
    const decoder = new TextDecoder();
    let buffer = '';
    let lastFlush = Date.now();

    const processChunk = async () => {
      try {
        const { done, value } = await reader.read();

        if (done) {
          // 处理剩余数据
          if (buffer.trim()) {
            onChunk(buffer);
          }
          onComplete();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 智能缓冲：基于内容长度和时间间隔
        const shouldFlush = 
          buffer.length >= this.bufferSize ||
          Date.now() - lastFlush >= this.flushInterval ||
          buffer.includes('\n') ||
          buffer.includes('。') ||
          buffer.includes('！') ||
          buffer.includes('？');

        if (shouldFlush) {
          onChunk(buffer);
          buffer = '';
          lastFlush = Date.now();
        }

        // 继续处理下一个chunk
        processChunk();

      } catch (error) {
        onError(error);
      }
    };

    processChunk();
  }

  // 批处理多个更新
  batchUpdates(updateFn, batchSize = 10) {
    let updates = [];
    let timeoutId = null;

    return (update) => {
      updates.push(update);

      if (updates.length >= batchSize) {
        this.flushUpdates(updates, updateFn);
        updates = [];
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          this.flushUpdates(updates, updateFn);
          updates = [];
          timeoutId = null;
        }, this.flushInterval);
      }
    };
  }

  flushUpdates(updates, updateFn) {
    if (updates.length > 0) {
      const batchedUpdate = updates.join('');
      updateFn(batchedUpdate);
    }
  }
}

// ================================
// 4. 预计算和预缓存
// ================================

class PrecomputeService {
  constructor(options = {}) {
    this.optimizer = new AIRequestOptimizer(options);
    this.commonTemplates = new Map();
    this.precomputeInterval = options.precomputeInterval || 60000; // 1分钟
    this.isRunning = false;
  }

  // 启动预计算服务
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.precomputeCommonPlans();
    
    // 定期预计算
    this.intervalId = setInterval(() => {
      this.precomputeCommonPlans();
    }, this.precomputeInterval);

    console.log('AI预计算服务已启动');
  }

  // 停止预计算服务
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    console.log('AI预计算服务已停止');
  }

  // 预计算常见学习计划
  async precomputeCommonPlans() {
    const commonScenarios = [
      {
        subjects: ['民法', '刑法'],
        dailyHours: 3,
        weeklyDays: 5,
        orderMethod: 'ai'
      },
      {
        subjects: ['民法', '刑法', '行政法'],
        dailyHours: 4,
        weeklyDays: 6,
        orderMethod: 'ai'
      },
      {
        subjects: ['民法'],
        dailyHours: 2,
        weeklyDays: 5,
        orderMethod: 'manual'
      }
    ];

    for (const scenario of commonScenarios) {
      try {
        const prompt = this.generatePromptForScenario(scenario);
        await this.optimizer.generateStudyPlan(prompt, scenario, { skipCache: false });
        console.log('预计算完成:', scenario);
      } catch (error) {
        console.error('预计算失败:', scenario, error.message);
      }
    }
  }

  generatePromptForScenario(scenario) {
    return `生成法考学习计划:
科目: ${scenario.subjects.join(', ')}
每日学习: ${scenario.dailyHours}小时
每周天数: ${scenario.weeklyDays}天
排序方式: ${scenario.orderMethod}
要求: 具体可执行的学习计划`;
  }
}

// ================================
// 5. 导出和使用示例
// ================================

// 创建全局优化器实例
const globalAIOptimizer = new AIRequestOptimizer({
  cache: {
    maxSize: 500,
    ttl: 12 * 60 * 60 * 1000 // 12小时
  },
  maxConcurrent: 2,
  requestTimeout: 25000,
  retryAttempts: 2
});

const streamOptimizer = new StreamOptimizer({
  bufferSize: 50,
  flushInterval: 100
});

const precomputeService = new PrecomputeService();

// 启动预计算服务（在生产环境中）
if (process.env.NODE_ENV === 'production') {
  precomputeService.start();
}

module.exports = {
  AIResponseCache,
  AIRequestOptimizer,
  StreamOptimizer,
  PrecomputeService,
  globalAIOptimizer,
  streamOptimizer,
  precomputeService
};

// 使用示例
/*
// 1. 基本使用
const result = await globalAIOptimizer.generateStudyPlan(prompt, context);

// 2. 流式响应优化
streamOptimizer.optimizeStream(
  response.body.getReader(),
  (chunk) => updateUI(chunk),
  () => completeGeneration(),
  (error) => handleError(error)
);

// 3. 批量更新
const batchUpdater = streamOptimizer.batchUpdates((batchedContent) => {
  updateMessage(batchedContent);
});

// 4. 获取性能统计
const stats = globalAIOptimizer.getStats();
console.log('缓存命中率:', stats.cache.hitRate);
*/