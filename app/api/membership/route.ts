/**
 * 标准化会员管理API端点
 * GET /api/membership - 获取会员状态
 * PATCH /api/membership - 更新会员状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { withUnifiedAuth } from '@/lib/unified-auth';
import { query, queryOne } from '@/lib/db';

// GET /api/membership - 获取会员状态
export const GET = withUnifiedAuth(async (request: NextRequest) => {
  try {
    const user_id = request.user.user_id;

    // 获取用户详细信息
    const user = await queryOne(
      `SELECT user_id, phone_number, nickname, membership_type, membership_expires_at, created_at, last_login
       FROM users WHERE user_id = ?`,
      [user_id]
    );

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 获取使用统计
    const today = new Date().toISOString().split('T')[0];
    const usageStats = await queryOne(
      `SELECT 
         COUNT(*) as daily_usage,
         SUM(CASE WHEN feature_type = 'ai_chat' THEN 1 ELSE 0 END) as ai_chat_usage,
         SUM(CASE WHEN feature_type = 'notes' THEN 1 ELSE 0 END) as notes_usage
       FROM user_usage_logs 
       WHERE user_id = ? AND DATE(created_at) = ?`,
      [user_id, today]
    );

    // 检查会员状态
    const isPremium = user.membership_type === 'paid';
    const isExpired = isPremium && user.membership_expires_at && 
                     new Date(user.membership_expires_at) < new Date();

    // 计算剩余天数
    let daysRemaining = null;
    if (isPremium && user.membership_expires_at) {
      const expiryDate = new Date(user.membership_expires_at);
      const today = new Date();
      daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          phone_number: user.phone_number,
          nickname: user.nickname,
          created_at: user.created_at,
          last_login: user.last_login
        },
        membership: {
          type: user.membership_type,
          status: isExpired ? 'expired' : (isPremium ? 'active' : 'free'),
          expires_at: user.membership_expires_at,
          days_remaining: daysRemaining
        },
        usage: {
          today: {
            total: usageStats?.daily_usage || 0,
            ai_chat: usageStats?.ai_chat_usage || 0,
            notes: usageStats?.notes_usage || 0
          },
          limits: {
            ai_chat_daily: isPremium && !isExpired ? 100 : 5,
            notes_total: isPremium && !isExpired ? 1000 : 10
          }
        }
      }
    });

  } catch (error) {
    console.error('获取会员状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
});

// PATCH /api/membership - 更新会员状态（管理员或系统调用）
export const PATCH = withUnifiedAuth(async (request: NextRequest) => {
  try {
    const user_id = request.user.user_id;
    const body = await request.json();
    const { membership_type, expires_at, admin_action = false } = body;

    // 验证会员类型
    if (!['free', 'paid'].includes(membership_type)) {
      return NextResponse.json({
        success: false,
        error: '无效的会员类型'
      }, { status: 400 });
    }

    // 如果是升级到付费会员，设置过期时间
    let expiryDate = null;
    if (membership_type === 'paid') {
      if (expires_at) {
        expiryDate = new Date(expires_at);
      } else {
        // 默认一年会员
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
    }

    // 更新数据库
    await query(
      `UPDATE users 
       SET membership_type = ?, membership_expires_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [membership_type, expiryDate ? expiryDate.toISOString() : null, user_id]
    );

    // 记录会员变更日志
    await query(
      `INSERT INTO user_usage_logs (user_id, feature_type, action_type, details, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        user_id, 
        'membership', 
        'update', 
        JSON.stringify({
          old_type: request.user.membership_type,
          new_type: membership_type,
          expires_at: expiryDate?.toISOString(),
          admin_action
        })
      ]
    );

    return NextResponse.json({
      success: true,
      message: '会员状态更新成功',
      data: {
        membership_type,
        expires_at: expiryDate?.toISOString()
      }
    });

  } catch (error) {
    console.error('更新会员状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
});