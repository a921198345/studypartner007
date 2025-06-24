'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, AlertTriangle, Zap, Clock } from 'lucide-react';

interface UsageLimitProps {
  featureType: 'ai_chat' | 'notes';
  usage: {
    used: number;
    limit: number;
    remainingToday?: number;
  };
  onUpgrade?: () => void;
  className?: string;
}

export default function UsageLimit({ 
  featureType, 
  usage, 
  onUpgrade,
  className = '' 
}: UsageLimitProps) {
  
  const getFeatureInfo = () => {
    switch (featureType) {
      case 'ai_chat':
        return {
          name: 'AI问答',
          icon: <Zap className="w-4 h-4" />,
          unit: '次',
          resetInfo: '每日零点重置'
        };
      case 'notes':
        return {
          name: '学习笔记',
          icon: <AlertTriangle className="w-4 h-4" />,
          unit: '条',
          resetInfo: '升级会员解除限制'
        };
      default:
        return {
          name: '功能',
          icon: <AlertTriangle className="w-4 h-4" />,
          unit: '次',
          resetInfo: ''
        };
    }
  };

  const featureInfo = getFeatureInfo();
  const progressPercentage = (usage.used / usage.limit) * 100;
  const isNearLimit = progressPercentage >= 80;
  const isAtLimit = usage.used >= usage.limit;

  // 如果是无限制（limit为-1），不显示组件
  if (usage.limit === -1) {
    return null;
  }

  return (
    <Alert className={`${className} ${isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-blue-500'}`}>
          {featureInfo.icon}
        </div>
        
        <div className="flex-1">
          <AlertDescription>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {featureInfo.name}使用情况
              </span>
              <span className={`text-sm font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-blue-600'}`}>
                {usage.used}/{usage.limit} {featureInfo.unit}
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className={`h-2 mb-2 ${isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : '[&>div]:bg-blue-500'}`}
            />
            
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {featureInfo.resetInfo}
              </div>
              
              {featureType === 'ai_chat' && usage.remainingToday !== undefined && (
                <span>
                  今日剩余: {usage.remainingToday}{featureInfo.unit}
                </span>
              )}
            </div>
            
            {(isAtLimit || isNearLimit) && (
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-sm ${isAtLimit ? 'text-red-600' : 'text-yellow-600'}`}>
                  {isAtLimit 
                    ? `${featureInfo.name}已达上限` 
                    : `${featureInfo.name}即将达到上限`
                  }
                </span>
                
                {onUpgrade && (
                  <Button
                    size="sm"
                    onClick={onUpgrade}
                    className="h-7 px-3 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    升级会员
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}