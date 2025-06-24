'use client';

import { useState, useEffect, useCallback } from 'react';

interface MembershipData {
  user: {
    user_id: number;
    phone_number: string;
    nickname?: string;
    avatar_url?: string;
  };
  membership: {
    type: 'free_user' | 'active_member';
    isActive: boolean;
    expiresAt?: string;
    daysRemaining?: number;
  };
  limits: {
    ai_chat: {
      daily_limit: number;
      used_today: number;
      remaining_today: number;
      can_use: boolean;
    };
    mindmap: {
      available_subjects: string[];
    };
    question_bank: {
      available_years: string[];
    };
    notes: {
      limit: number;
      count: number;
      can_create: boolean;
    };
  };
  usage_today: {
    ai_chat: number;
    mindmap: number;
    question_bank: number;
    notes: number;
  };
  recent_orders: any[];
}

interface UseMembershipReturn {
  membershipData: MembershipData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isLoggedIn: boolean;
  isMember: boolean;
  canUseFeature: (feature: keyof MembershipData['limits']) => boolean;
  getFeatureLimit: (feature: keyof MembershipData['limits']) => any;
}

export function useMembership(): UseMembershipReturn {
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchMembershipData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoggedIn(false);
        setMembershipData(null);
        return;
      }

      const response = await fetch('/api/membership/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token无效，清除本地存储
        localStorage.removeItem('auth_token');
        setIsLoggedIn(false);
        setMembershipData(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`获取会员状态失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMembershipData(result.data);
        setIsLoggedIn(true);
      } else {
        throw new Error(result.message || '获取会员状态失败');
      }
    } catch (err) {
      console.error('获取会员状态失败:', err);
      setError(err instanceof Error ? err.message : '获取会员状态失败');
      setIsLoggedIn(false);
      setMembershipData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembershipData();
  }, [fetchMembershipData]);

  const isMember = membershipData?.membership?.isActive || false;

  const canUseFeature = useCallback((feature: keyof MembershipData['limits']) => {
    if (!membershipData) return false;
    
    switch (feature) {
      case 'ai_chat':
        return membershipData.limits.ai_chat.can_use;
      case 'mindmap':
        return isMember || membershipData.limits.mindmap.available_subjects.length > 0;
      case 'question_bank':
        return isMember || membershipData.limits.question_bank.available_years.length > 0;
      case 'notes':
        return membershipData.limits.notes.can_create;
      default:
        return false;
    }
  }, [membershipData, isMember]);

  const getFeatureLimit = useCallback((feature: keyof MembershipData['limits']) => {
    if (!membershipData) return null;
    return membershipData.limits[feature];
  }, [membershipData]);

  return {
    membershipData,
    loading,
    error,
    refetch: fetchMembershipData,
    isLoggedIn,
    isMember,
    canUseFeature,
    getFeatureLimit,
  };
}

// 用于检查特定功能限制的Hook
export function useFeatureLimit(feature: keyof MembershipData['limits']) {
  const { membershipData, isMember, canUseFeature, getFeatureLimit } = useMembership();
  
  return {
    canUse: canUseFeature(feature),
    limit: getFeatureLimit(feature),
    isMember,
    membershipData,
  };
}

// 用于AI聊天功能的专用Hook
export function useAIChatLimit() {
  const { membershipData, isMember, refetch } = useMembership();
  
  return {
    canUse: membershipData?.limits.ai_chat.can_use || false,
    used: membershipData?.limits.ai_chat.used_today || 0,
    limit: membershipData?.limits.ai_chat.daily_limit || 3,
    remaining: membershipData?.limits.ai_chat.remaining_today || 0,
    isMember,
    refetch,
  };
}

// 用于笔记功能的专用Hook
export function useNotesLimit() {
  const { membershipData, isMember, refetch } = useMembership();
  
  return {
    canCreate: membershipData?.limits.notes.can_create || false,
    count: membershipData?.limits.notes.count || 0,
    limit: membershipData?.limits.notes.limit || 10,
    isMember,
    refetch,
  };
}