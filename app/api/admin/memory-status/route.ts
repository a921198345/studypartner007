import { NextRequest, NextResponse } from 'next/server';
import { memoryMonitor } from '@/lib/memory-monitor';

export const dynamic = 'force-dynamic';

/**
 * 获取内存使用状态的API端点
 * 仅供管理员使用
 */
export async function GET(req: NextRequest) {
  try {
    // 简单的访问控制（生产环境应该使用更严格的认证）
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取内存统计信息
    const memoryStats = memoryMonitor.getMemoryStats();
    const memoryHistory = memoryMonitor.getMemoryHistory();
    
    // 格式化数据
    const formatBytes = (bytes: number) => {
      return Math.round(bytes / (1024 * 1024) * 100) / 100; // MB，保留2位小数
    };

    const response = {
      current: {
        heapUsed: formatBytes(memoryStats.current.heapUsed),
        heapTotal: formatBytes(memoryStats.current.heapTotal),
        external: formatBytes(memoryStats.current.external),
        rss: formatBytes(memoryStats.current.rss),
        timestamp: new Date(memoryStats.current.timestamp).toISOString()
      },
      peak: {
        heapUsed: formatBytes(memoryStats.peak.heapUsed),
        heapTotal: formatBytes(memoryStats.peak.heapTotal),
        external: formatBytes(memoryStats.peak.external),
        rss: formatBytes(memoryStats.peak.rss),
        timestamp: new Date(memoryStats.peak.timestamp).toISOString()
      },
      statistics: {
        averageHeapUsed: formatBytes(memoryStats.average),
        trend: memoryStats.trend,
        historyPoints: memoryHistory.length
      },
      thresholds: {
        alertThresholdMB: 800,
        criticalThresholdMB: 1024
      },
      recommendations: getMemoryRecommendations(memoryStats)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('获取内存状态失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 根据内存使用情况提供建议
 */
function getMemoryRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  const currentMB = stats.current.heapUsed / (1024 * 1024);
  const peakMB = stats.peak.heapUsed / (1024 * 1024);

  if (currentMB > 800) {
    recommendations.push('当前内存使用过高，建议重启应用');
  }

  if (stats.trend === 'increasing') {
    recommendations.push('内存使用呈上升趋势，可能存在内存泄漏');
  }

  if (peakMB > 1000) {
    recommendations.push('峰值内存使用过高，需要优化代码');
  }

  if (currentMB > 500 && stats.trend === 'increasing') {
    recommendations.push('建议启用手动垃圾回收：node --expose-gc server.js');
  }

  if (recommendations.length === 0) {
    recommendations.push('内存使用正常');
  }

  return recommendations;
}

/**
 * 触发手动垃圾回收（需要管理员权限）
 */
export async function POST(req: NextRequest) {
  try {
    // 简单的访问控制
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const beforeGC = process.memoryUsage();
    
    if (global.gc) {
      global.gc();
      
      // 等待一下垃圾回收完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterGC = process.memoryUsage();
      
      return NextResponse.json({
        success: true,
        message: '垃圾回收已执行',
        before: {
          heapUsed: Math.round(beforeGC.heapUsed / (1024 * 1024) * 100) / 100,
          rss: Math.round(beforeGC.rss / (1024 * 1024) * 100) / 100
        },
        after: {
          heapUsed: Math.round(afterGC.heapUsed / (1024 * 1024) * 100) / 100,
          rss: Math.round(afterGC.rss / (1024 * 1024) * 100) / 100
        },
        freed: {
          heapUsed: Math.round((beforeGC.heapUsed - afterGC.heapUsed) / (1024 * 1024) * 100) / 100,
          rss: Math.round((beforeGC.rss - afterGC.rss) / (1024 * 1024) * 100) / 100
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '垃圾回收不可用，请使用 --expose-gc 参数启动应用'
      });
    }
  } catch (error) {
    console.error('执行垃圾回收失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}