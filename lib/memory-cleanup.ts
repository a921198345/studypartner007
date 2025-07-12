/**
 * 内存清理工具
 * 提供各种内存清理和监控功能
 */

import { cleanupExpiredAnonymousUsage, getAnonymousUsageStats } from './anonymous-usage';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

class MemoryCleanupService {
  private static instance: MemoryCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 800 * 1024 * 1024; // 800MB
  private criticalThreshold = 1024 * 1024 * 1024; // 1GB

  private constructor() {}

  static getInstance(): MemoryCleanupService {
    if (!MemoryCleanupService.instance) {
      MemoryCleanupService.instance = new MemoryCleanupService();
    }
    return MemoryCleanupService.instance;
  }

  /**
   * 启动自动清理
   */
  startAutoCleanup(intervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      console.log('🧹 内存清理已在运行');
      return;
    }

    console.log('🧹 启动自动内存清理，间隔:', intervalMs / 1000, '秒');
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);

    // 立即执行一次清理
    this.performCleanup();
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 自动内存清理已停止');
    }
  }

  /**
   * 执行内存清理
   */
  async performCleanup(): Promise<void> {
    const memoryBefore = this.getMemoryUsage();
    const heapUsedMB = memoryBefore.heapUsed / (1024 * 1024);

    console.log(`🧹 开始内存清理检查 - 当前堆内存: ${heapUsedMB.toFixed(2)}MB`);

    let cleaned = false;

    // 1. 清理匿名用户缓存
    try {
      cleanupExpiredAnonymousUsage();
      cleaned = true;
    } catch (error) {
      console.warn('清理匿名用户缓存失败:', error);
    }

    // 2. 如果内存使用超过阈值，强制垃圾回收
    if (memoryBefore.heapUsed > this.memoryThreshold) {
      if (global.gc) {
        console.log('🗑️ 内存超过阈值，执行强制垃圾回收');
        global.gc();
        cleaned = true;
      } else {
        console.warn('🗑️ 无法执行垃圾回收，请使用 --expose-gc 启动参数');
      }
    }

    // 3. 如果达到严重阈值，采取更激进的清理措施
    if (memoryBefore.heapUsed > this.criticalThreshold) {
      console.error('🚨 内存使用达到严重水平，执行紧急清理');
      await this.emergencyCleanup();
      cleaned = true;
    }

    if (cleaned) {
      const memoryAfter = this.getMemoryUsage();
      const heapAfterMB = memoryAfter.heapUsed / (1024 * 1024);
      const freed = (memoryBefore.heapUsed - memoryAfter.heapUsed) / (1024 * 1024);
      console.log(`🧹 清理完成 - 当前堆内存: ${heapAfterMB.toFixed(2)}MB, 释放: ${freed.toFixed(2)}MB`);
    }
  }

  /**
   * 紧急内存清理
   */
  private async emergencyCleanup(): Promise<void> {
    console.log('🚨 执行紧急内存清理');

    // 1. 多次垃圾回收
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 2. 清理所有可能的缓存
    try {
      cleanupExpiredAnonymousUsage();
    } catch (e) {
      console.warn('紧急清理匿名缓存失败:', e);
    }

    // 3. 提醒管理员
    console.error('🚨 紧急清理完成，建议检查应用内存使用情况');
  }

  /**
   * 获取当前内存使用情况
   */
  getMemoryUsage(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      timestamp: Date.now()
    };
  }

  /**
   * 获取内存清理统计
   */
  getCleanupStats(): {
    memoryUsage: MemoryStats;
    anonymousUsage: any;
    thresholds: {
      warning: number;
      critical: number;
    };
    gcAvailable: boolean;
  } {
    return {
      memoryUsage: this.getMemoryUsage(),
      anonymousUsage: getAnonymousUsageStats(),
      thresholds: {
        warning: this.memoryThreshold,
        critical: this.criticalThreshold
      },
      gcAvailable: !!global.gc
    };
  }

  /**
   * 设置内存阈值
   */
  setThresholds(warningMB: number, criticalMB: number): void {
    this.memoryThreshold = warningMB * 1024 * 1024;
    this.criticalThreshold = criticalMB * 1024 * 1024;
    console.log(`🧹 内存阈值已更新: 警告=${warningMB}MB, 严重=${criticalMB}MB`);
  }
}

// 导出单例实例
export const memoryCleanup = MemoryCleanupService.getInstance();

// 导出便捷函数
export function startMemoryCleanup(intervalMs?: number): void {
  memoryCleanup.startAutoCleanup(intervalMs);
}

export function stopMemoryCleanup(): void {
  memoryCleanup.stopAutoCleanup();
}

export function performManualCleanup(): Promise<void> {
  return memoryCleanup.performCleanup();
}

export function getMemoryCleanupStats() {
  return memoryCleanup.getCleanupStats();
}

// 进程退出时清理
process.on('exit', () => {
  memoryCleanup.stopAutoCleanup();
});

process.on('SIGTERM', () => {
  memoryCleanup.stopAutoCleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  memoryCleanup.stopAutoCleanup();
  process.exit(0);
});