import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';

// 验证JWT token并返回用户信息
export function verifyAuthToken(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // 移除 Bearer 前缀（如果存在）
    const cleanToken = token.replace('Bearer ', '');
    
    // 验证并解码JWT
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    
    return {
      success: true,
      user: {
        user_id: decoded.user_id,
        phone_number: decoded.phone_number,
        membership_type: decoded.membership_type
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// API路由认证中间件
export function withAuth(handler) {
  return async (request, context) => {
    try {
      // 从请求头获取token
      const authHeader = request.headers.get('authorization');
      const token = authHeader || request.headers.get('Authorization');
      
      if (!token) {
        return NextResponse.json(
          { error: '未提供认证token' },
          { status: 401 }
        );
      }

      // 验证token
      const authResult = verifyAuthToken(token);
      
      if (!authResult.success) {
        return NextResponse.json(
          { error: '无效的认证token' },
          { status: 401 }
        );
      }

      // 将用户信息添加到request对象
      request.user = authResult.user;
      
      // 调用原始处理器
      return await handler(request, context);
      
    } catch (error) {
      console.error('认证中间件错误:', error);
      return NextResponse.json(
        { error: '服务器内部错误' },
        { status: 500 }
      );
    }
  };
}

// 从请求中提取用户信息
export function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || 
                    request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  const authResult = verifyAuthToken(authHeader);
  return authResult.success ? authResult.user : null;
}