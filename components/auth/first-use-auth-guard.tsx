'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { isAuthenticated } from '../../lib/auth-utils';

interface FirstUseAuthGuardProps {
  children: React.ReactNode;
  onAction?: () => void;  // 用户触发的操作
  feature?: string;  // 功能名称，用于跟踪
}

export function useFirstUseAuth(feature: string = 'default') {
  const router = useRouter();
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  const checkAuthOnAction = useCallback(() => {
    // 使用统一的认证检查函数
    if (isAuthenticated()) {
      return true; // 已登录，允许操作
    }
    
    // 未登录，检查是否已经显示过提示
    const promptKey = `firstUsePrompt_${feature}`;
    const hasShown = sessionStorage.getItem(promptKey) === 'true';
    
    if (!hasShown && !hasShownPrompt) {
      setHasShownPrompt(true);
      sessionStorage.setItem(promptKey, 'true');
      
      Modal.confirm({
        title: '登录享受更多功能',
        icon: <ExclamationCircleOutlined />,
        content: '登录后可保存进度并享受更多服务',
        okText: '立即登录',
        cancelText: '稍后再说',
        onOk() {
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          router.push('/login');
        },
        onCancel() {
          // 用户选择稍后再说，继续允许操作
        },
      });
    }
    
    return true; // 无论是否登录，都允许继续操作
  }, [feature, router, hasShownPrompt]);

  return { checkAuthOnAction };
}

export default function FirstUseAuthGuard({ children, onAction, feature = 'default' }: FirstUseAuthGuardProps) {
  const { checkAuthOnAction } = useFirstUseAuth(feature);
  
  // 如果有 onAction，包装它
  const wrappedAction = useCallback(() => {
    checkAuthOnAction();
    if (onAction) {
      onAction();
    }
  }, [checkAuthOnAction, onAction]);
  
  // 将包装的 action 传递给子组件
  if (typeof children === 'function') {
    return <>{children({ onAction: wrappedAction })}</>;
  }
  
  return <>{children}</>;
}