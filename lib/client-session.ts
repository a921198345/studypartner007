"use client"

// 客户端会话管理
const CLIENT_SESSION_KEY = 'client_session_id';
const SESSION_DURATION = 365 * 24 * 60 * 60 * 1000; // 1年

export function getClientSessionId() {
  // 浏览器环境检查
  if (typeof window === 'undefined') {
    return null;
  }
  
  // 1. 先从 localStorage 获取
  let sessionId = localStorage.getItem(CLIENT_SESSION_KEY);
  
  // 2. 如果没有，检查 sessionStorage
  if (!sessionId) {
    sessionId = sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (sessionId) {
      // 迁移到 localStorage
      localStorage.setItem(CLIENT_SESSION_KEY, sessionId);
    }
  }
  
  // 3. 如果还是没有，生成新的
  if (!sessionId) {
    sessionId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(CLIENT_SESSION_KEY, sessionId);
    console.log('生成新的客户端会话ID:', sessionId);
  }
  
  return sessionId;
}

// 在API请求中自动添加客户端会话ID
export function addClientSessionHeader(headers = {}) {
  const sessionId = getClientSessionId();
  if (sessionId) {
    return {
      ...headers,
      'X-Client-Session-Id': sessionId
    };
  }
  return headers;
}