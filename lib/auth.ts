import type { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query, queryOne } from '@/lib/db';

// 这个authOptions是一个基础示例，你需要根据你的实际需求来配置和完善它，
// 特别是 CredentialsProvider 中的 authorize 函数和 session/jwt 回调。
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phone: { label: "手机号", type: "text", placeholder: "请输入手机号" },
        code: { label: "验证码", type: "text", placeholder: "请输入验证码" }
      },
      async authorize(credentials, req) {
        try {
          // 确保凭证存在
          if (!credentials?.phone || !credentials?.code) {
            console.log("凭证不完整");
            return null;
          }
          
          // 1. 验证验证码是否有效
          const now = new Date().toISOString();
          
          // 查询未使用且未过期的验证码
          const verificationCode = await queryOne(
            `SELECT * FROM verification_codes 
             WHERE phone_number = ? 
             AND code = ? 
             AND used = 0 
             AND expires_at > ? 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [credentials.phone, credentials.code, now]
          );
          
          if (!verificationCode) {
            console.log("验证码无效: 未找到有效验证码");
            return null;
          }
          
          // 标记验证码为已使用
          await query(
            'UPDATE verification_codes SET used = 1 WHERE id = ?',
            [verificationCode.id]
          );
          
          // 2. 查找或创建用户
          let userData;
          
          // 首先查找用户
          const existingUser = await queryOne(
            'SELECT * FROM users WHERE phone = ? LIMIT 1',
            [credentials.phone]
          );
          
          if (existingUser) {
            // 用户存在，使用现有用户
            userData = existingUser;
          } else {
            // 用户不存在，创建新用户
            const result = await query(
              `INSERT INTO users (phone, created_at, membership_status) 
               VALUES (?, ?, ?)`,
              [credentials.phone, now, 'free_user']
            );
            
            if (!result || !result.insertId) {
              console.error("创建用户错误");
              return null;
            }
            
            // 获取新创建的用户数据
            userData = await queryOne(
              'SELECT * FROM users WHERE id = ?',
              [result.insertId]
            );
            
            if (!userData) {
              console.error("无法获取新创建的用户");
              return null;
            }
          }
          
          // 3. 返回用户对象
          const user: User = {
            id: userData.id.toString(),
            name: userData.name || `用户${credentials.phone.substring(7)}`, // 如果没有名字，使用手机号后4位
            // email可选
            email: userData.email || undefined,
            // 添加会员状态等自定义字段
            // @ts-ignore - 允许添加自定义属性
            membership_status: userData.membership_status || 'free_user',
            // @ts-ignore
            phone: userData.phone
          };
          
          return user;
        } catch (e) {
          console.error("认证过程中发生错误:", e);
          return null;
        }
      }
    })
    // 你可以在这里添加其他的认证提供者，例如 OAuth providers (GitHub, Google, etc.)
  ],
  session: {
    strategy: 'jwt', // 推荐使用 JWT for sessions
    maxAge: 30 * 24 * 60 * 60, // Session 有效期，例如30天
  },
  jwt: {
    // secret: process.env.NEXTAUTH_JWT_SECRET, // 用于签发JWT的密钥，可以与NEXTAUTH_SECRET相同或不同
  },
  secret: process.env.NEXTAUTH_SECRET, // !! 非常重要：用于加密JWT和cookie的密钥，务必在.env文件中设置一个强随机字符串
  pages: {
    signIn: '/login', // 如果你有自定义的登录页面
    // signOut: '/auth/signout',
    error: '/login', // 用于显示认证错误的页面
    // verifyRequest: '/auth/verify-request', // 用于邮件验证流程
    // newUser: '/auth/new-user' // 如果适用，新用户注册后的页面
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      // 当用户登录时 (user 对象存在)，将自定义属性添加到JWT token
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.membership_status = user.membership_status; // 将自定义字段从 User 对象传递给 token
        // @ts-ignore
        token.phone = user.phone; // 添加手机号
      }
      return token;
    },
    async session({ session, token, user }) {
      // 将自定义属性从JWT token传递给客户端可见的session对象
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        // @ts-ignore
        session.user.membership_status = token.membership_status;
        // @ts-ignore
        session.user.phone = token.phone;
      }
      return session;
    },
  },
  // debug: process.env.NODE_ENV === 'development', // 开发模式下开启debug日志
}; 