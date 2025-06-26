import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';

// 验证JWT token的辅助函数
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// API路由认证中间件
export function withAuth(handler) {
  return async (request, context) => {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    // 验证token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: '认证令牌无效或已过期' },
        { status: 401 }
      );
    }

    // 将用户信息添加到请求对象
    request.user = payload;

    // 调用实际的处理函数
    return handler(request, context);
  };
}

// 检查会员权限的中间件
export async function withMembership(handler) {
  return withAuth(async (request, context) => {
    // 检查用户是否是会员
    if (request.user.membership_type !== 'paid') {
      return NextResponse.json(
        { error: '此功能需要会员权限' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}