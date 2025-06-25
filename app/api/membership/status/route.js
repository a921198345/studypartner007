import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getConnection } from '@/lib/db';
import { checkAIUsageLimit, checkNotesLimit } from '@/lib/membership-middleware';

export async function GET(request) {
  let connection;
  
  try {
    // 验证用户身份
    const auth_result = await verifyAuth(request);
    if (!auth_result.success) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }
    
    const user_id = auth_result.user.user_id;
    connection = await getConnection();
    
    // 获取用户详细信息
    const [users] = await connection.execute(
      `SELECT 
        user_id,
        phone_number,
        nickname,
        avatar_url,
        membership_type,
        membership_expires_at,
        daily_ai_queries_used,
        last_ai_query_date,
        notes_count
      FROM users 
      WHERE user_id = ?`,
      [user_id]
    );
    
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }
    
    const user = users[0];
    
    // 检查AI使用限制
    const ai_usage = await checkAIUsageLimit(user_id, connection);
    
    // 检查笔记限制
    const notes_limit = await checkNotesLimit(user_id, connection);
    
    // 获取会员订单历史
    const [orders] = await connection.execute(
      `SELECT 
        order_id,
        membership_plan,
        price,
        payment_status,
        payment_time,
        membership_start_date,
        membership_end_date
      FROM membership_orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5`,
      [user_id]
    );
    
    // 计算会员状态
    const valid_member_types = ['active_member', 'premium', 'vip', 'paid'];
    const is_active_member = valid_member_types.includes(user.membership_type);
    const is_expired = user.membership_expires_at && 
                      new Date(user.membership_expires_at) < new Date();
    
    // 获取今日各功能使用统计
    const today = new Date().toISOString().split('T')[0];
    const [usage_stats] = await connection.execute(
      `SELECT 
        feature_type,
        COUNT(*) as count
      FROM user_usage_logs 
      WHERE user_id = ? AND usage_date = ?
      GROUP BY feature_type`,
      [user_id, today]
    );
    
    // 转换使用统计为对象
    const usage_today = {};
    usage_stats.forEach(stat => {
      usage_today[stat.feature_type] = stat.count;
    });
    
    // 构建响应数据
    const membership_info = {
      // 基本信息
      user: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      },
      
      // 会员状态
      membership: {
        type: user.membership_type,
        isActive: is_active_member && !is_expired,
        expiresAt: user.membership_expires_at,
        daysRemaining: user.membership_expires_at ? 
          Math.max(0, Math.ceil((new Date(user.membership_expires_at) - new Date()) / (1000 * 60 * 60 * 24))) : 
          null
      },
      
      // 功能限制和使用情况
      limits: {
        ai_chat: {
          daily_limit: ai_usage.limit,
          used_today: ai_usage.used,
          remaining_today: ai_usage.remainingToday,
          can_use: ai_usage.canUse
        },
        mindmap: {
          available_subjects: is_active_member ? 
            ['民法', '刑法', '行政法', '民诉', '刑诉', '商法', '理论法', '三国法'] : 
            ['民法']
        },
        question_bank: {
          available_years: is_active_member ? 
            ['2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'] : 
            ['2022']
        },
        notes: {
          limit: notes_limit.limit,
          count: notes_limit.count,
          can_create: notes_limit.canCreate
        }
      },
      
      // 今日使用统计
      usage_today: {
        ai_chat: usage_today.ai_chat || 0,
        mindmap: usage_today.mindmap || 0,
        question_bank: usage_today.question_bank || 0,
        notes: usage_today.notes || 0
      },
      
      // 订单历史
      recent_orders: orders.map(order => ({
        order_id: order.order_id,
        plan: order.membership_plan,
        price: order.price,
        status: order.payment_status,
        payment_time: order.payment_time,
        start_date: order.membership_start_date,
        end_date: order.membership_end_date
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: membership_info
    });
    
  } catch (error) {
    console.error('获取会员状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '获取会员状态失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}