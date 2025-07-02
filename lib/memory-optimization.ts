"use client"

/**
 * 内存使用优化
 * 包含内存监控、清理、泄漏检测等功能
 */

// ================================
// 1. 内存监控器
// ================================

class MemoryMonitor {
  constructor(options = {}) {
    this.thresholds = {
      warning: options.warningThreshold || 100 * 1024 * 1024, // 100MB
      critical: options.criticalThreshold || 200 * 1024 * 1024, // 200MB
    };
    this.checkInterval = options.checkInterval || 30000; // 30秒
    this.listeners = new Set();
    this.isMonitoring = false;
    this.memoryHistory = [];
    this.maxHistoryLength = 50;
  }

  // 开始监控
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    console.log('内存监控已启动');
  }

  // 停止监控
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    console.log('内存监控已停止');
  }

  // 检查内存使用情况
  checkMemoryUsage() {
    if (typeof window === 'undefined') return; // Node.js环境

    const memoryInfo = this.getMemoryInfo();
    this.memoryHistory.push({
      ...memoryInfo,
      timestamp: Date.now()
    });

    // 保持历史记录长度
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }

    // 检查阈值
    if (memoryInfo.usedJSHeapSize > this.thresholds.critical) {
      this.notifyListeners('critical', memoryInfo);
      this.triggerMemoryCleanup();
    } else if (memoryInfo.usedJSHeapSize > this.thresholds.warning) {
      this.notifyListeners('warning', memoryInfo);
    }
  }

  // 获取内存信息
  getMemoryInfo() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      return {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
        usagePercentage: Math.round((window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit) * 100)
      };
    }

    // 降级方案
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercentage: 0
    };
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.add(callback);
  }

  // 移除监听器
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // 通知监听器
  notifyListeners(level, memoryInfo) {
    this.listeners.forEach(callback => {
      try {
        callback(level, memoryInfo);
      } catch (error) {
        console.error('内存监控回调错误:', error);
      }
    });
  }

  // 触发内存清理
  triggerMemoryCleanup() {
    console.warn('内存使用过高，触发清理机制');
    
    // 清理各种缓存
    memoryManager.clearCaches();
    
    // 强制垃圾回收（如果可用）
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  }

  // 获取内存历史
  getMemoryHistory() {
    return this.memoryHistory.slice();
  }

  // 获取内存统计
  getMemoryStats() {
    if (this.memoryHistory.length === 0) return null;

    const latest = this.memoryHistory[this.memoryHistory.length - 1];
    const usage = this.memoryHistory.map(item => item.usedJSHeapSize);
    
    return {
      current: latest,
      average: Math.round(usage.reduce((a, b) => a + b, 0) / usage.length),
      peak: Math.max(...usage),
      trend: this.calculateTrend()
    };
  }

  // 计算内存使用趋势
  calculateTrend() {
    if (this.memoryHistory.length < 10) return 'stable';

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, item) => sum + item.usedJSHeapSize, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.usedJSHeapSize, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
}

// ================================
// 2. 内存管理器
// ================================

class MemoryManager {
  constructor() {
    this.caches = new Map();
    this.timers = new Set();
    this.observers = new Set();
    this.eventListeners = new Map();
    this.imageCache = new Map();
    this.componentCache = new Map();
  }

  // 注册缓存
  registerCache(name, cache) {
    this.caches.set(name, cache);
  }

  // 清理所有缓存
  clearCaches() {
    console.log('开始清理内存缓存...');
    
    let clearedCount = 0;
    for (const [name, cache] of this.caches.entries()) {
      try {
        if (typeof cache.clear === 'function') {
          cache.clear();
          clearedCount++;
          console.log(`已清理缓存: ${name}`);
        } else if (cache instanceof Map) {
          cache.clear();
          clearedCount++;
          console.log(`已清理Map缓存: ${name}`);
        }
      } catch (error) {
        console.error(`清理缓存失败 ${name}:`, error);
      }
    }

    // 清理图片缓存
    this.clearImageCache();
    
    // 清理组件缓存
    this.clearComponentCache();

    console.log(`内存清理完成，共清理 ${clearedCount} 个缓存`);
  }

  // 清理图片缓存
  clearImageCache() {
    this.imageCache.clear();
    
    // 清理DOM中的图片
    if (typeof document !== 'undefined') {
      const images = document.querySelectorAll('img[data-cached="true"]');
      images.forEach(img => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
    }
  }

  // 清理组件缓存
  clearComponentCache() {
    this.componentCache.clear();
  }

  // 注册定时器
  registerTimer(timerId) {
    this.timers.add(timerId);
  }

  // 清理所有定时器
  clearTimers() {
    this.timers.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    this.timers.clear();
  }

  // 注册观察者
  registerObserver(observer) {
    this.observers.add(observer);
  }

  // 清理所有观察者
  clearObservers() {
    this.observers.forEach(observer => {
      try {
        if (typeof observer.disconnect === 'function') {
          observer.disconnect();
        }
      } catch (error) {
        console.error('清理观察者失败:', error);
      }
    });
    this.observers.clear();
  }

  // 注册事件监听器
  registerEventListener(element, event, handler, options) {
    const key = `${element.toString()}-${event}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({ handler, options });
    element.addEventListener(event, handler, options);
  }

  // 清理事件监听器
  clearEventListeners() {
    for (const [key, listeners] of this.eventListeners.entries()) {
      const [elementStr, event] = key.split('-');
      // 注意：这里简化了元素查找，实际使用中需要更完善的映射
      listeners.forEach(({ handler, options }) => {
        // 实际清理需要保存元素引用
        console.log(`清理事件监听器: ${event}`);
      });
    }
    this.eventListeners.clear();
  }

  // 智能内存清理
  smartCleanup() {
    const memoryInfo = memoryMonitor.getMemoryInfo();
    const usagePercentage = memoryInfo.usagePercentage;

    console.log(`当前内存使用率: ${usagePercentage}%`);

    if (usagePercentage > 80) {
      // 高内存使用，激进清理
      this.clearCaches();
      this.clearTimers();
      this.clearObservers();
      console.log('执行激进内存清理');
    } else if (usagePercentage > 60) {
      // 中等内存使用，选择性清理
      this.clearOldCaches();
      console.log('执行选择性内存清理');
    }
  }

  // 清理旧缓存
  clearOldCaches() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [name, cache] of this.caches.entries()) {
      if (cache.lastCleanup && cache.lastCleanup < oneHourAgo) {
        try {
          if (typeof cache.clear === 'function') {
            cache.clear();
            cache.lastCleanup = Date.now();
            console.log(`清理旧缓存: ${name}`);
          }
        } catch (error) {
          console.error(`清理旧缓存失败 ${name}:`, error);
        }
      }
    }
  }

  // 获取内存使用报告
  getMemoryReport() {
    const memoryInfo = memoryMonitor.getMemoryInfo();
    const stats = memoryMonitor.getMemoryStats();
    
    return {
      current: memoryInfo,
      history: stats,
      caches: {
        count: this.caches.size,
        names: Array.from(this.caches.keys())
      },
      resources: {
        timers: this.timers.size,
        observers: this.observers.size,
        eventListeners: this.eventListeners.size,
        images: this.imageCache.size,
        components: this.componentCache.size
      }
    };
  }
}

// ================================
// 3. 智能缓存系统
// ================================

class SmartCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.maxAge = options.maxAge || 30 * 60 * 1000; // 30分钟
    this.cache = new Map();
    this.accessTimes = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5分钟
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.delete(key);
      return null;
    }

    // 更新访问时间
    this.accessTimes.set(key, Date.now());
    return item.value;
  }

  set(key, value) {
    // 定期清理
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
    }

    // 如果达到最大容量，删除最少使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    this.accessTimes.set(key, Date.now());
  }

  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    this.lastCleanup = now;

    if (keysToDelete.length > 0) {
      console.log(`清理过期缓存项: ${keysToDelete.length}个`);
    }
  }

  evictLeastUsed() {
    let leastUsedKey = null;
    let leastUsedTime = Infinity;

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < leastUsedTime) {
        leastUsedTime = time;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: `${this.cache.size}/${this.maxSize}`,
      lastCleanup: new Date(this.lastCleanup).toLocaleString()
    };
  }
}

// ================================
// 4. React组件内存优化工具
// ================================

const ReactMemoryUtils = {
  // 创建内存优化的hook
  useMemoryOptimizedState: (initialValue) => {
    const [state, setState] = useState(initialValue);
    
    useEffect(() => {
      return () => {
        // 组件卸载时清理
        if (typeof state === 'object' && state !== null) {
          // 清理对象引用
          Object.keys(state).forEach(key => {
            if (state[key] && typeof state[key].dispose === 'function') {
              state[key].dispose();
            }
          });
        }
      };
    }, []);

    return [state, setState];
  },

  // 创建自动清理的Effect
  useAutoCleanupEffect: (effect, deps, cleanup) => {
    useEffect(() => {
      const result = effect();
      
      return () => {
        if (cleanup) cleanup();
        if (result && typeof result.cleanup === 'function') {
          result.cleanup();
        }
      };
    }, deps);
  },

  // 创建内存安全的事件监听器
  useMemorySafeEventListener: (element, event, handler, options) => {
    useEffect(() => {
      if (!element) return;

      const safeHandler = (...args) => {
        try {
          handler(...args);
        } catch (error) {
          console.error('事件处理器错误:', error);
        }
      };

      element.addEventListener(event, safeHandler, options);
      memoryManager.registerEventListener(element, event, safeHandler, options);

      return () => {
        element.removeEventListener(event, safeHandler, options);
      };
    }, [element, event, handler, options]);
  },

  // 创建带清理的定时器
  useCleanupTimer: (callback, delay, deps = []) => {
    useEffect(() => {
      if (delay === null) return;

      const timerId = setTimeout(callback, delay);
      memoryManager.registerTimer(timerId);

      return () => {
        clearTimeout(timerId);
      };
    }, deps);
  }
};

// ================================
// 5. 全局实例和初始化
// ================================

const memoryMonitor = new MemoryMonitor({
  warningThreshold: 80 * 1024 * 1024, // 80MB
  criticalThreshold: 150 * 1024 * 1024, // 150MB
  checkInterval: 30000
});

const memoryManager = new MemoryManager();

// 注册常用缓存
memoryManager.registerCache('aiCache', new SmartCache({ maxSize: 50, maxAge: 20 * 60 * 1000 }));
memoryManager.registerCache('imageCache', new SmartCache({ maxSize: 30, maxAge: 60 * 60 * 1000 }));
memoryManager.registerCache('componentCache', new SmartCache({ maxSize: 20, maxAge: 10 * 60 * 1000 }));

// 在生产环境中启动监控
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  memoryMonitor.start();
  
  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    memoryManager.clearCaches();
    memoryMonitor.stop();
  });

  // 监听内存警告
  memoryMonitor.addListener((level, memoryInfo) => {
    if (level === 'critical') {
      console.warn('内存使用严重不足，建议刷新页面');
      // 可以显示用户提示
    }
  });
}

// ================================
// 6. 导出
// ================================

module.exports = {
  MemoryMonitor,
  MemoryManager,
  SmartCache,
  ReactMemoryUtils,
  memoryMonitor,
  memoryManager
};

// 使用示例
/*
// 1. 监控内存使用
memoryMonitor.addListener((level, info) => {
  console.log(`内存${level}: ${info.usagePercentage}%`);
});

// 2. 使用智能缓存
const cache = new SmartCache({ maxSize: 100 });
cache.set('key', 'value');
const value = cache.get('key');

// 3. React组件中使用
const MyComponent = () => {
  const [data, setData] = ReactMemoryUtils.useMemoryOptimizedState([]);
  
  ReactMemoryUtils.useCleanupTimer(() => {
    console.log('定时任务');
  }, 5000);

  return <div>Component</div>;
};

// 4. 获取内存报告
const report = memoryManager.getMemoryReport();
console.log('内存使用报告:', report);
*/