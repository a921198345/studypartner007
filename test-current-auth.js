import { getAuthToken, getUserInfo, isAuthenticated } from './lib/auth-utils.js';

console.log('🔍 检查当前认证状态...');

// 模拟浏览器环境
global.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};

console.log('Token:', getAuthToken());
console.log('User Info:', getUserInfo());
console.log('Is Authenticated:', isAuthenticated());

console.log('\n📝 说明: 这个测试在Node.js环境中运行，无法访问浏览器的localStorage');
console.log('需要在浏览器控制台中运行以下代码来检查实际状态:');
console.log(`
// 在浏览器控制台中运行:
console.log('Token:', localStorage.getItem('auth_token'));
console.log('User Info:', localStorage.getItem('user_info'));

// 检查token是否有效
const token = localStorage.getItem('auth_token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    console.log('Token payload:', payload);
    console.log('Token expired:', payload.exp < now);
    console.log('User membership_type:', payload.membership_type);
  } catch (e) {
    console.error('Token解析失败:', e);
  }
}
`);