/**
 * 内存监控工具
 * 实时监控应用内存使用情况，防止内存泄漏
 */

interface MemoryInfo {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryHistory: MemoryInfo[] = [];
  private alertThreshold: number = 800 * 1024 * 1024; // 800MB警告阈值
  private criticalThreshold: number = 1024 * 1024 * 1024; // 1GB严重警告阈值
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly maxHistorySize = 100; // 最多保存100条历史记录

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * 开始内存监控
   * @param intervalMs 监控间隔，默认30秒
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitorInterval) {
      console.log('📊 内存监控已在运行');
      return;
    }

    console.log('📊 开始内存监控，间隔:', intervalMs / 1000, '秒');
    
    this.monitorInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);

    // 立即记录一次
    this.recordMemoryUsage();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('📊 内存监控已停止');
    }
  }

  /**
   * 记录内存使用情况
   */
  private recordMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const memoryInfo: MemoryInfo = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      timestamp: Date.now()
    };

    // 添加到历史记录
    this.memoryHistory.push(memoryInfo);

    // 限制历史记录大小
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // 检查内存使用情况
    this.checkMemoryThresholds(memoryInfo);
  }

  /**
   * 检查内存阈值
   */
  private checkMemoryThresholds(memoryInfo: MemoryInfo): void {
    const heapUsedMB = memoryInfo.heapUsed / (1024 * 1024);
    const rssMB = memoryInfo.rss / (1024 * 1024);

    if (memoryInfo.heapUsed > this.criticalThreshold) {
      console.error(`🚨 严重内存警告! 堆内存使用: ${heapUsedMB.toFixed(2)}MB, RSS: ${rssMB.toFixed(2)}MB`);
      this.triggerGarbageCollection();
    } else if (memoryInfo.heapUsed > this.alertThreshold) {
      console.warn(`⚠️ 内存警告! 堆内存使用: ${heapUsedMB.toFixed(2)}MB, RSS: ${rssMB.toFixed(2)}MB`);
    } else {
      console.log(`📊 内存正常: 堆内存: ${heapUsedMB.toFixed(2)}MB, RSS: ${rssMB.toFixed(2)}MB`);
    }
  }

  /**
   * 触发垃圾回收
   */
  private triggerGarbageCollection(): void {
    if (global.gc) {
      console.log('🗑️ 手动触发垃圾回收');
      global.gc();
      
      // 记录垃圾回收后的内存使用
      setTimeout(() => {
        const afterGC = process.memoryUsage();
        const heapUsedMB = afterGC.heapUsed / (1024 * 1024);
        console.log(`🗑️ 垃圾回收后堆内存: ${heapUsedMB.toFixed(2)}MB`);
      }, 1000);
    } else {
      console.warn('🗑️ 手动垃圾回收不可用，请使用 --expose-gc 参数启动');
    }
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryUsage(): MemoryInfo {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      timestamp: Date.now()
    };
  }

  /**
   * 获取内存使用历史
   */
  getMemoryHistory(): MemoryInfo[] {
    return [...this.memoryHistory];
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    current: MemoryInfo;
    peak: MemoryInfo;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const current = this.getCurrentMemoryUsage();
    const history = this.getMemoryHistory();
    
    if (history.length === 0) {
      return {
        current,
        peak: current,
        average: current.heapUsed,
        trend: 'stable'
      };
    }

    const peak = history.reduce((max, item) => 
      item.heapUsed > max.heapUsed ? item : max
    );

    const average = history.reduce((sum, item) => sum + item.heapUsed, 0) / history.length;

    // 分析趋势（基于最近10次记录）
    const recentHistory = history.slice(-10);
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (recentHistory.length >= 5) {
      const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
      const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, item) => sum + item.heapUsed, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, item) => sum + item.heapUsed, 0) / secondHalf.length;
      
      const threshold = 50 * 1024 * 1024; // 50MB阈值
      if (secondAvg - firstAvg > threshold) {
        trend = 'increasing';
      } else if (firstAvg - secondAvg > threshold) {
        trend = 'decreasing';
      }
    }

    return {
      current,
      peak,
      average,
      trend
    };
  }

  /**
   * 设置内存警告阈值
   */
  setThresholds(alertThreshold: number, criticalThreshold: number): void {
    this.alertThreshold = alertThreshold;
    this.criticalThreshold = criticalThreshold;
    console.log(`📊 内存阈值已更新: 警告=${alertThreshold / (1024 * 1024)}MB, 严重=${criticalThreshold / (1024 * 1024)}MB`);
  }
}

// 导出单例实例
export const memoryMonitor = MemoryMonitor.getInstance();

// 导出便捷函数
export function startMemoryMonitoring(intervalMs?: number): void {
  memoryMonitor.startMonitoring(intervalMs);
}

export function stopMemoryMonitoring(): void {
  memoryMonitor.stopMonitoring();
}

export function getMemoryStats() {
  return memoryMonitor.getMemoryStats();
}

export function getCurrentMemoryUsage() {
  return memoryMonitor.getCurrentMemoryUsage();
}