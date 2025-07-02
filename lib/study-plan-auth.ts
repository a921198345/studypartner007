/**
 * 学习计划功能专用认证工具
 * 为学习计划相关API提供统一的认证检查
 */

import { verifyAuthToken, getUserFromRequest } from './auth-middleware';
import { NextResponse } from 'next/server';

/**
 * 学习计划API认证中间件
 * 确保只有登录用户可以访问学习计划功能
 */
export function withStudyPlanAuth(handler) {
  return async (request, context) => {
    try {
      // 获取用户信息
      const user = getUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { 
            error: '请先登录才能使用学习计划功能',
            code: 'AUTH_REQUIRED'
          },
          { status: 401 }
        );
      }

      // 将用户信息添加到request对象，方便后续使用
      request.user = user;
      
      // 记录用户访问日志（可选）
      console.log(`用户 ${user.user_id} 访问学习计划功能`);
      
      // 调用原始处理器
      return await handler(request, context);
      
    } catch (error) {
      console.error('学习计划认证中间件错误:', error);
      return NextResponse.json(
        { 
          error: '认证服务异常，请稍后重试',
          code: 'AUTH_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * 检查用户是否有权限访问特定的学习计划数据
 * @param {Object} user - 用户信息
 * @param {string} planId - 学习计划ID
 * @param {Object} planData - 学习计划数据
 * @returns {boolean} - 是否有权限
 */
export function canAccessStudyPlan(user, planId, planData = null) {
  if (!user) {
    return false;
  }

  // 用户只能访问自己的学习计划
  if (planData && planData.user_id !== user.user_id) {
    return false;
  }

  return true;
}

/**
 * 检查用户是否有权限修改学习计划偏好
 * @param {Object} user - 用户信息
 * @param {string} targetUserId - 目标用户ID
 * @returns {boolean} - 是否有权限
 */
export function canModifyPreferences(user, targetUserId) {
  if (!user) {
    return false;
  }

  // 用户只能修改自己的偏好设置
  return user.user_id === targetUserId;
}

/**
 * 数据访问权限验证
 * 确保用户只能访问自己的学习数据
 */
export function validateDataAccess(user, dataOwnerId) {
  if (!user) {
    throw new Error('用户未登录');
  }

  if (user.user_id !== dataOwnerId) {
    throw new Error('无权访问其他用户的数据');
  }

  return true;
}

/**
 * 获取用户权限级别
 * @param {Object} user - 用户信息
 * @returns {string} - 权限级别 ('free', 'premium', 'vip')
 */
export function getUserPermissionLevel(user) {
  if (!user) {
    return 'none';
  }

  // 根据会员类型确定权限级别
  switch (user.membership_type) {
    case 'premium':
      return 'premium';
    case 'vip':
      return 'vip';
    default:
      return 'free';
  }
}

/**
 * 检查功能使用限制
 * @param {Object} user - 用户信息
 * @param {string} feature - 功能名称
 * @returns {Object} - 限制信息
 */
export function checkFeatureLimit(user, feature) {
  const permissionLevel = getUserPermissionLevel(user);
  
  const limits = {
    free: {
      plan_generation_daily: 3,
      plan_history_access: 7, // 天数
      advanced_features: false
    },
    premium: {
      plan_generation_daily: 10,
      plan_history_access: 30,
      advanced_features: true
    },
    vip: {
      plan_generation_daily: -1, // 无限制
      plan_history_access: -1,
      advanced_features: true
    }
  };

  return {
    level: permissionLevel,
    limits: limits[permissionLevel] || limits.free,
    canUse: permissionLevel !== 'none'
  };
}