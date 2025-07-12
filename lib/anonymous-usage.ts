/**
 * 匿名用户使用次数管理
 * 基于IP地址和User-Agent的简单限制机制
 */

interface AnonymousUsage {
  count: number;
  lastUsed: string; // 日期字符串，格式：YYYY-MM-DD
  ip: string;
  userAgent: string;
}

// 内存缓存存储匿名用户使用记录
const anonymousUsageCache = new Map<string, AnonymousUsage>();

// 匿名用户每日使用限制
const ANONYMOUS_DAILY_LIMIT = 2;

// 🔧 最大缓存条目数限制
const MAX_CACHE_ENTRIES = 10000;

// 🔧 自动清理定时器
let cleanupTimer: NodeJS.Timeout | null = null;

// 🔧 启动自动清理机制
function startAutoCleanup() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    cleanupExpiredAnonymousUsage();
    
    // 如果缓存过大，强制清理最旧的条目
    if (anonymousUsageCache.size > MAX_CACHE_ENTRIES) {
      const entriesToDelete = anonymousUsageCache.size - MAX_CACHE_ENTRIES;
      const keys = Array.from(anonymousUsageCache.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        anonymousUsageCache.delete(keys[i]);
      }
      console.log(`强制清理了 ${entriesToDelete} 个缓存条目，当前大小: ${anonymousUsageCache.size}`);
    }
  }, 60000); // 每分钟清理一次
}

// 🔧 立即启动清理机制
startAutoCleanup();

/**
 * 生成匿名用户标识符
 * @param ip IP地址
 * @param userAgent User-Agent
 * @returns 用户标识符
 */
function generateAnonymousId(ip: string, userAgent: string): string {
  // 简单的哈希函数，基于IP和UserAgent
  const combined = `${ip}_${userAgent}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

/**
 * 获取今天的日期字符串
 * @returns YYYY-MM-DD格式的日期
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 检查匿名用户是否可以使用
 * @param ip IP地址
 * @param userAgent User-Agent
 * @returns 使用限制信息
 */
export function checkAnonymousUsage(ip: string, userAgent: string) {
  const anonymousId = generateAnonymousId(ip, userAgent);
  const today = getTodayString();
  
  let usage = anonymousUsageCache.get(anonymousId);
  
  // 如果没有记录或者是新的一天，重置计数
  if (!usage || usage.lastUsed !== today) {
    usage = {
      count: 0,
      lastUsed: today,
      ip,
      userAgent
    };
  }
  
  const remaining = Math.max(0, ANONYMOUS_DAILY_LIMIT - usage.count);
  const canUse = remaining > 0;
  
  return {
    canUse,
    used: usage.count,
    remaining,
    limit: ANONYMOUS_DAILY_LIMIT,
    anonymousId
  };
}

/**
 * 增加匿名用户使用次数
 * @param ip IP地址
 * @param userAgent User-Agent
 * @returns 更新后的使用情况
 */
export function incrementAnonymousUsage(ip: string, userAgent: string) {
  const anonymousId = generateAnonymousId(ip, userAgent);
  const today = getTodayString();
  
  let usage = anonymousUsageCache.get(anonymousId);
  
  // 如果没有记录或者是新的一天，重置计数
  if (!usage || usage.lastUsed !== today) {
    usage = {
      count: 0,
      lastUsed: today,
      ip,
      userAgent
    };
  }
  
  // 增加使用次数
  usage.count += 1;
  usage.lastUsed = today;
  
  // 更新缓存
  anonymousUsageCache.set(anonymousId, usage);
  
  const remaining = Math.max(0, ANONYMOUS_DAILY_LIMIT - usage.count);
  
  console.log(`匿名用户 ${anonymousId} 使用次数: ${usage.count}/${ANONYMOUS_DAILY_LIMIT}`);
  
  return {
    canUse: remaining > 0,
    used: usage.count,
    remaining,
    limit: ANONYMOUS_DAILY_LIMIT,
    anonymousId
  };
}

/**
 * 清理过期的匿名用户记录（可选，定期清理）
 */
export function cleanupExpiredAnonymousUsage() {
  const today = getTodayString();
  let cleaned = 0;
  
  for (const [id, usage] of anonymousUsageCache.entries()) {
    if (usage.lastUsed !== today) {
      anonymousUsageCache.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`清理了 ${cleaned} 个过期的匿名用户记录`);
  }
}

/**
 * 获取匿名用户统计信息（调试用）
 */
export function getAnonymousUsageStats() {
  return {
    totalUsers: anonymousUsageCache.size,
    dailyLimit: ANONYMOUS_DAILY_LIMIT,
    cacheEntries: Array.from(anonymousUsageCache.values())
  };
}