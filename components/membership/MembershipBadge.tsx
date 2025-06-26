'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, Zap } from 'lucide-react';

interface MembershipBadgeProps {
  membershipType: 'free_user' | 'active_member';
  expiresAt?: string | null;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export default function MembershipBadge({ 
  membershipType, 
  expiresAt,
  variant = 'default',
  className = '' 
}: MembershipBadgeProps) {
  
  const isActive = membershipType === 'active_member';
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  
  // 计算剩余天数
  const getDaysRemaining = () => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };
  
  const daysRemaining = getDaysRemaining();
  
  if (variant === 'compact') {
    return (
      <Badge 
        variant={isActive && !isExpired ? 'default' : 'secondary'} 
        className={`${className} ${isActive && !isExpired ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : ''}`}
      >
        {isActive && !isExpired ? (
          <>
            <Crown className="w-3 h-3 mr-1" />
            会员
          </>
        ) : (
          <>
            <Zap className="w-3 h-3 mr-1" />
            免费
          </>
        )}
      </Badge>
    );
  }
  
  if (variant === 'detailed') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={isActive && !isExpired ? 'default' : 'secondary'}
          className={`${isActive && !isExpired ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : ''}`}
        >
          {isActive && !isExpired ? (
            <>
              <Crown className="w-3 h-3 mr-1" />
              会员用户
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 mr-1" />
              免费用户
            </>
          )}
        </Badge>
        
        {isActive && expiresAt && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {isExpired ? (
              <span className="text-red-500">已过期</span>
            ) : daysRemaining !== null ? (
              <span>
                {daysRemaining === 0 ? '今日到期' : `${daysRemaining}天后到期`}
              </span>
            ) : (
              <span>永久有效</span>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // default variant
  return (
    <Badge 
      variant={isActive && !isExpired ? 'default' : 'secondary'}
      className={`${className} ${isActive && !isExpired ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : ''}`}
    >
      {isActive && !isExpired ? (
        <>
          <Crown className="w-3 h-3 mr-1" />
          会员
          {daysRemaining !== null && daysRemaining <= 7 && (
            <span className="ml-1 text-xs">
              ({daysRemaining}天)
            </span>
          )}
        </>
      ) : (
        <>
          <Zap className="w-3 h-3 mr-1" />
          免费用户
        </>
      )}
    </Badge>
  );
}