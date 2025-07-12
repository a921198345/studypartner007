/**
 * 统一认证系统
 * 整合NextAuth.js和自定义JWT认证，提供一致的认证接口
 */

import type { NextAuthOptions, User, Session, JWT } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '@/lib/db';

// JWT配置
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';
const JWT_EXPIRES_IN = '30d'; // JWT有效期30天

// 用户类型定义
export interface AuthUser {
  user_id: number;
  phone_number: string;
  nickname?: string;
  membership_type: 'free' | 'paid';
  membership_expires_at?: string;
  created_at: string;
  last_login?: string;
}

// 扩展的Session类型
export interface ExtendedSession extends Session {
  user: {
    id: string;
    phone_number: string;
    nickname?: string;
    membership_type: 'free' | 'paid';
    membership_expires_at?: string;
  } & Session['user'];
}

// NextAuth配置
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'phone-verification',
      credentials: {
        phone: { label: "手机号", type: "text", placeholder: "请输入手机号" },
        code: { label: "验证码", type: "text", placeholder: "请输入验证码" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.phone || !credentials?.code) {
            console.log("登录凭证不完整");
            return null;
          }
          
          // 验证验证码
          const now = new Date().toISOString();
          const verificationCode = await queryOne(
            `SELECT * FROM sms_verification 
             WHERE phone_number = ? 
             AND verification_code = ? 
             AND is_used = 0 
             AND expire_at > ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [credentials.phone, credentials.code, now]
          );
          
          if (!verificationCode) {
            console.log("验证码无效或已过期");
            return null;
          }
          
          // 标记验证码为已使用
          await query(
            'UPDATE sms_verification SET is_used = 1 WHERE id = ?',
            [verificationCode.id]
          );
          
          // 查找或创建用户
          let userData: AuthUser;
          const existingUser = await queryOne(
            'SELECT * FROM users WHERE phone_number = ? LIMIT 1',
            [credentials.phone]
          );
          
          if (existingUser) {
            userData = existingUser;
            // 更新最后登录时间
            await query(
              'UPDATE users SET last_login = ? WHERE user_id = ?',
              [now, existingUser.user_id]
            );
          } else {
            // 创建新用户
            const result = await query(
              `INSERT INTO users (phone_number, created_at, membership_type, last_login) 
               VALUES (?, ?, ?, ?)`,
              [credentials.phone, now, 'free', now]
            );
            
            if (!result || !result.insertId) {
              console.error("创建用户失败");
              return null;
            }
            
            userData = await queryOne(
              'SELECT * FROM users WHERE user_id = ?',
              [result.insertId]
            );
            
            if (!userData) {
              console.error("获取新创建的用户失败");
              return null;
            }
          }
          
          // 返回NextAuth标准用户对象
          const user: User = {
            id: userData.user_id.toString(),
            name: userData.nickname || `用户${credentials.phone.substring(7)}`,
            email: `${userData.user_id}@law-exam.local`, // 内部邮箱格式
            // 扩展字段
            phone_number: userData.phone_number,
            membership_type: userData.membership_type,
            membership_expires_at: userData.membership_expires_at,
          } as User & {
            phone_number: string;
            membership_type: string;
            membership_expires_at?: string;
          };
          
          return user;
        } catch (error) {
          console.error("认证过程错误:", error);
          return null;
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      // 用户登录时，将用户信息存入token
      if (user) {
        token.user_id = user.id;
        token.phone_number = user.phone_number;
        token.membership_type = user.membership_type;
        token.membership_expires_at = user.membership_expires_at;
        token.nickname = user.name;
      }
      return token;
    },
    
    async session({ session, token }: { session: Session; token: JWT }) {
      // 将token信息传递给session
      if (session.user) {
        (session as ExtendedSession).user.id = token.user_id as string;
        (session as ExtendedSession).user.phone_number = token.phone_number as string;
        (session as ExtendedSession).user.membership_type = token.membership_type as 'free' | 'paid';
        (session as ExtendedSession).user.membership_expires_at = token.membership_expires_at as string;
        (session as ExtendedSession).user.nickname = token.nickname as string;
      }
      return session;
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
};

// ================================
// 统一认证工具函数
// ================================

/**
 * 生成JWT token（用于API认证）
 */
export function generateAuthToken(user: AuthUser): string {
  const payload = {
    user_id: user.user_id,
    phone_number: user.phone_number,
    membership_type: user.membership_type,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT token
 */
export function verifyAuthToken(token: string): { success: boolean; user?: AuthUser; error?: string } {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, JWT_SECRET) as any;
    
    return {
      success: true,
      user: {
        user_id: decoded.user_id,
        phone_number: decoded.phone_number,
        membership_type: decoded.membership_type,
        created_at: '', // 这些字段在JWT中不存储
        nickname: decoded.nickname,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
}

/**
 * 从NextAuth session获取用户信息
 */
export async function getUserFromSession(req: NextRequest): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user) return null;
    
    return {
      user_id: parseInt(session.user.id),
      phone_number: session.user.phone_number,
      nickname: session.user.nickname,
      membership_type: session.user.membership_type,
      membership_expires_at: session.user.membership_expires_at,
      created_at: '', // 需要时从数据库查询
    };
  } catch (error) {
    console.error('获取session用户信息失败:', error);
    return null;
  }
}

/**
 * 从JWT token获取用户信息
 */
export function getUserFromToken(authHeader: string): AuthUser | null {
  if (!authHeader) return null;
  
  const result = verifyAuthToken(authHeader);
  return result.success ? result.user! : null;
}

/**
 * 统一的用户信息获取函数（支持session和token）
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  // 优先尝试从NextAuth session获取
  const sessionUser = await getUserFromSession(req);
  if (sessionUser) return sessionUser;
  
  // 回退到JWT token
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    return getUserFromToken(authHeader);
  }
  
  return null;
}

// ================================
// 统一认证中间件
// ================================

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

/**
 * 统一认证中间件
 */
export function withUnifiedAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser(req);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: '未授权访问，请先登录' },
          { status: 401 }
        );
      }
      
      // 将用户信息附加到请求对象
      (req as AuthenticatedRequest).user = user;
      
      return await handler(req as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error('认证中间件错误:', error);
      return NextResponse.json(
        { success: false, error: '认证服务异常' },
        { status: 500 }
      );
    }
  };
}

/**
 * 会员权限检查中间件
 */
export function withMembershipAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return withUnifiedAuth(async (req: AuthenticatedRequest, ...args: T) => {
    // 检查会员状态
    if (req.user.membership_type !== 'paid') {
      return NextResponse.json(
        { success: false, error: '此功能需要会员权限', upgradeRequired: true },
        { status: 403 }
      );
    }
    
    // 检查会员是否过期
    if (req.user.membership_expires_at) {
      const expiresAt = new Date(req.user.membership_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: '会员已过期，请续费', upgradeRequired: true },
          { status: 403 }
        );
      }
    }
    
    return await handler(req, ...args);
  });
}

// ================================
// 向后兼容性支持（逐步迁移时使用）
// ================================

/**
 * @deprecated 使用 withUnifiedAuth 替代
 */
export const withAuth = withUnifiedAuth;

/**
 * @deprecated 使用 verifyAuthToken 替代
 */
export const verifyToken = verifyAuthToken;

/**
 * @deprecated 使用 getCurrentUser 替代
 */
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  return getUserFromToken(authHeader || '');
}

// 导出NextAuth配置用于app router
export { authOptions as default };