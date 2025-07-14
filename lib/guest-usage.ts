import { NextRequest } from 'next/server';

// 在内存中存储访客使用记录 (生产环境建议使用Redis)
const guestUsageMap = new Map<string, {
  count: number;
  date: string;
}>();

/**
 * 获取访客标识符 (IP + User-Agent的hash)
 */
function getGuestIdentifier(req: NextRequest): string {
  // 获取真实IP
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.ip || 
             'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // 简单的标识符组合
  return `${ip}-${userAgent.substring(0, 50)}`;
}

/**
 * 检查访客用户的AI使用次数限制
 * @param req NextRequest对象
 * @returns 使用限制信息
 */
export async function checkGuestUsageLimit(req: NextRequest): Promise<{
  canUse: boolean;
  used: number;
  limit: number;
  remainingToday: number;
}> {
  const guestId = getGuestIdentifier(req);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const guestLimit = 2; // 访客限制2次
  
  const usage = guestUsageMap.get(guestId);
  
  if (!usage || usage.date !== today) {
    // 新用户或新的一天，重置计数
    return {
      canUse: true,
      used: 0,
      limit: guestLimit,
      remainingToday: guestLimit
    };
  }
  
  const canUse = usage.count < guestLimit;
  const remaining = Math.max(0, guestLimit - usage.count);
  
  return {
    canUse,
    used: usage.count,
    limit: guestLimit,
    remainingToday: remaining
  };
}

/**
 * 增加访客用户的AI使用次数
 * @param req NextRequest对象
 * @returns 是否成功
 */
export async function incrementGuestUsage(req: NextRequest): Promise<boolean> {
  try {
    const guestId = getGuestIdentifier(req);
    const today = new Date().toISOString().split('T')[0];
    
    const usage = guestUsageMap.get(guestId);
    
    if (!usage || usage.date !== today) {
      // 新用户或新的一天
      guestUsageMap.set(guestId, {
        count: 1,
        date: today
      });
    } else {
      // 增加计数
      guestUsageMap.set(guestId, {
        count: usage.count + 1,
        date: today
      });
    }
    
    // 清理过期数据（保留最近3天的数据）
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
    
    for (const [key, value] of guestUsageMap.entries()) {
      if (value.date < cutoffDate) {
        guestUsageMap.delete(key);
      }
    }
    
    console.log(`访客 ${guestId} 使用次数已更新`);
    return true;
    
  } catch (error) {
    console.error('增加访客使用次数失败:', error);
    return false;
  }
}

/**
 * 获取所有访客使用统计（用于调试和监控）
 */
export function getGuestUsageStats(): {
  totalGuests: number;
  todayGuests: number;
  todayUsage: number;
} {
  const today = new Date().toISOString().split('T')[0];
  let todayGuests = 0;
  let todayUsage = 0;
  
  for (const [_, usage] of guestUsageMap.entries()) {
    if (usage.date === today) {
      todayGuests++;
      todayUsage += usage.count;
    }
  }
  
  return {
    totalGuests: guestUsageMap.size,
    todayGuests,
    todayUsage
  };
}