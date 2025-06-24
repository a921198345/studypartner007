// 客户端认证工具函数

// 获取存储的JWT token
export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// 获取存储的用户信息
export function getUserInfo() {
  if (typeof window === 'undefined') return null;
  const userInfo = localStorage.getItem('user_info');
  return userInfo ? JSON.parse(userInfo) : null;
}

// 检查用户是否已登录
export function isAuthenticated() {
  const token = getAuthToken();
  const user = getUserInfo();
  const isValid = isTokenValid(token);
  
  // 添加调试信息
  console.log('认证检查:', {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
    hasUser: !!user,
    userInfo: user ? { id: user.id, name: user.name } : 'null',
    isTokenValid: isValid,
    finalResult: !!(token && user && isValid)
  });
  
  return !!(token && user && isValid);
}

// 登出用户
export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  window.location.href = '/login';
}

// 验证JWT是否有效（简单的过期时间检查）
export function isTokenValid(token) {
  if (!token) return false;
  
  try {
    // 解析JWT payload（不验证签名，只检查过期时间）
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp > now;
  } catch (error) {
    console.error('Token解析失败:', error);
    return false;
  }
}

// 获取用于API请求的Authorization header
export function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// 检查认证状态，如果未登录则重定向到登录页
export function requireAuth() {
  if (typeof window === 'undefined') return true;
  
  const token = getAuthToken();
  const user = getUserInfo();
  
  if (!token || !user || !isTokenValid(token)) {
    logout();
    return false;
  }
  
  return true;
}