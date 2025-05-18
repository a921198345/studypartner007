'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';

interface PhoneVerificationProps {
  onVerificationSuccess?: (phoneNumber: string) => void;
  onVerificationError?: (error: string) => void;
}

export function PhoneVerification({ 
  onVerificationSuccess, 
  onVerificationError 
}: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  // 倒计时效果
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (data.success) {
        // 设置60秒倒计时
        setCountdown(60);
      } else {
        setError(data.message || '发送验证码失败，请稍后再试');
        if (onVerificationError) {
          onVerificationError(data.message);
        }
      }
    } catch (error) {
      setError('网络错误，请稍后再试');
      if (onVerificationError) {
        onVerificationError('网络错误');
      }
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, code }),
      });

      const data = await response.json();

      if (data.success) {
        if (onVerificationSuccess) {
          onVerificationSuccess(phoneNumber);
        }
      } else {
        setError(data.message || '验证码错误，请重新输入');
        if (onVerificationError) {
          onVerificationError(data.message);
        }
      }
    } catch (error) {
      setError('网络错误，请稍后再试');
      if (onVerificationError) {
        onVerificationError('网络错误');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="phone-number" className="text-sm font-medium">
          手机号码
        </label>
        <div className="flex gap-2">
          <Input
            id="phone-number"
            type="tel"
            placeholder="请输入手机号码"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={loading || countdown > 0}
          />
          <Button
            onClick={handleSendCode}
            disabled={loading || countdown > 0 || !phoneNumber}
            className="whitespace-nowrap"
          >
            {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="verification-code" className="text-sm font-medium">
          验证码
        </label>
        <Input
          id="verification-code"
          type="text"
          placeholder="请输入验证码"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={verifying}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button 
        onClick={handleVerifyCode} 
        disabled={verifying || !code || code.length !== 6 || !phoneNumber}
        className="mt-2"
      >
        {verifying ? '验证中...' : '验证'}
      </Button>
    </div>
  );
} 