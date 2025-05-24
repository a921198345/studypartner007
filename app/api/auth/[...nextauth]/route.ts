import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth'; // 从我们刚刚创建的 lib/auth.ts 导入配置

// NextAuth函数会根据authOptions处理所有对 /api/auth/* 的请求
const handler = NextAuth(authOptions);

// 导出GET和POST方法，这样Next.js的App Router就能将请求路由到NextAuth
export { handler as GET, handler as POST }; 