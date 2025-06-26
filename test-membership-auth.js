import { getUserFromRequest } from './lib/auth-middleware.js';

// 模拟请求头
const mockRequest = {
  headers: {
    get(key) {
      if (key.toLowerCase() === 'authorization') {
        // 这里需要实际的JWT token，从浏览器开发者工具中获取
        // 你需要在登录后从网络请求中复制Authorization头的值
        return 'Bearer YOUR_JWT_TOKEN_HERE';
      }
      return null;
    }
  }
};

console.log('🔍 测试会员权限检查...');

const user = getUserFromRequest(mockRequest);
const valid_member_types = ['active_member', 'premium', 'vip', 'paid'];
const isMember = valid_member_types.includes(user?.membership_type) || user?.membership_type === 'admin';

console.log('用户信息:', user);
console.log('是否为会员:', isMember);
console.log('有效会员类型:', valid_member_types);

if (user) {
  console.log('✅ 用户已认证');
  if (isMember) {
    console.log('✅ 用户是会员，可以访问所有年份题目');
  } else {
    console.log('❌ 用户不是会员，只能访问2022年题目');
    console.log('用户当前会员类型:', user.membership_type);
  }
} else {
  console.log('❌ 用户未认证，需要登录');
}