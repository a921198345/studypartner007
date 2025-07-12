import { useState, useEffect, useCallback } from 'react';
import { getAuthToken, getUserInfo, isTokenValid, logout, getAuthHeaders } from '@/lib/auth-utils';

interface User {
  user_id: number;
  phone_number: string;
  nickname?: string;
  membership_type: 'free' | 'paid';
  membership_expires_at?: string;
  created_at: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      // 确保只在客户端执行
      if (typeof window === 'undefined') {
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
        });
        return;
      }

      const token = getAuthToken();
      const user = getUserInfo();

      if (token && user && isTokenValid(token)) {
        setAuthState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      });
    }
  };

  const login = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));
    setAuthState({
      isAuthenticated: true,
      user,
      token,
      loading: false,
    });
  };

  const logoutUser = () => {
    logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  };

  // 验证当前session是否有效
  const validateSession = useCallback(async () => {
    const token = getAuthToken();
    
    if (!token || !isTokenValid(token)) {
      logoutUser();
      return false;
    }

    try {
      // 调用受保护的API验证token
      const response = await fetch('/api/auth/profile', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        logoutUser();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session验证失败:', error);
      logoutUser();
      return false;
    }
  }, []);

  // 定期检查session状态
  useEffect(() => {
    if (authState.isAuthenticated) {
      // 每5分钟检查一次session
      const interval = setInterval(validateSession, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, validateSession]);

  return {
    ...authState,
    login,
    logout: logoutUser,
    checkAuthStatus,
    validateSession,
  };
}