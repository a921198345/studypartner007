"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainNav } from "@/components/main-nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAuthToken, getUserInfo } from '@/lib/auth-utils';

export default function MembershipPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('3month'); // 默认选择3个月

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }
      
      const userInfo = await getUserInfo();
      if (userInfo) {
        setUser(userInfo);
      }
    };
    
    checkAuth();
  }, [router]);

  // 会员套餐配置
  const membershipPlans = [
    {
      id: 'free',
      name: '免费版',
      price: 0,
      duration: '永久',
      features: [
        '民法知识导图',
        '每日5次AI问答',
        '基础功能使用'
      ],
      buttonText: '当前版本',
      isRecommended: false,
      disabled: true
    },
    {
      id: '1month',
      name: '1个月会员', 
      price: 39.9,
      duration: '月',
      features: [
        '访问所有8个学科知识导图',
        '无限制AI问答和聊天',
        '保存无限制学习笔记',
        '高级搜索和筛选功能',
        '学习进度跟踪',
        '专属客服支持'
      ],
      buttonText: '立即升级',
      isRecommended: false,
      disabled: false
    },
    {
      id: '3month',
      name: '3个月会员',
      price: 99,
      duration: '3个月',
      features: [
        '访问所有8个学科知识导图', 
        '无限制AI问答和聊天',
        '保存无限制学习笔记',
        '高级搜索和筛选功能',
        '学习进度跟踪',
        '专属客服支持'
      ],
      buttonText: '立即升级',
      isRecommended: true,
      disabled: false
    }
  ];

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      toast({
        title: "错误",
        description: "请先登录",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = getAuthToken();
      const plan = membershipPlans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error('无效的套餐');
      }

      // 根据套餐ID设置天数
      const durationDays = planId === '1month' ? 30 : 90;

      const response = await fetch('/api/membership/simple-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membership_type: 'paid',
          duration_days: durationDays
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 清除知识导图缓存
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('mindmap_cache_')) {
            localStorage.removeItem(key);
          }
        });
        
        // 设置强制刷新标记，用于MindMapViewer重新加载
        localStorage.setItem('force_mindmap_refresh', 'true');

        toast({
          title: "升级成功！",
          description: `您已成功升级为${plan.name}！`,
        });

        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          router.push('/knowledge-map');
        }, 1500);
      } else {
        throw new Error(result.error || '升级失败');
      }
    } catch (error) {
      console.error('升级失败:', error);
      toast({
        title: "升级失败",
        description: error.message || "升级过程中出现错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">升级为会员</h1>
            <p className="text-xl text-muted-foreground">解锁所有功能，助力您的法考之路</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {membershipPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.isRecommended ? 'border-primary shadow-lg scale-105' : ''} ${plan.disabled ? 'opacity-75' : ''}`}
              >
                {plan.isRecommended && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-400 to-orange-600">
                    推荐
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    {plan.id === 'free' && <Star className="w-12 h-12 mx-auto text-gray-400" />}
                    {plan.id === '1month' && <Zap className="w-12 h-12 mx-auto text-blue-500" />}
                    {plan.id === '3month' && <Crown className="w-12 h-12 mx-auto text-yellow-500" />}
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold">
                    ¥ {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/{plan.duration}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    disabled={plan.disabled || isLoading}
                    onClick={() => handleUpgrade(plan.id)}
                    variant={plan.isRecommended ? "default" : "outline"}
                  >
                    {isLoading ? "处理中..." : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="text-red-500 mt-1">
                    🔥
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">开发测试阶段说明</h3>
                    <p className="text-red-700 text-sm leading-relaxed">
                      当前为开发测试阶段，点击"立即升级"将直接激活您的会员权限，无需实际支付。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-4">升级后将获得：</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">• 访问所有法考学科知识导图</div>
                  <div className="text-muted-foreground">（民法、刑法、民事诉讼法、刑事诉讼法、行政法、商经知、三国法、理论法）</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">• 无限制使用AI问答功能</div>
                  <div className="text-muted-foreground">无限制AI问答和聊天</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">• 保存无限制学习笔记</div>
                  <div className="text-muted-foreground">高级搜索和筛选功能</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">• 学习进度跟踪</div>
                  <div className="text-muted-foreground">跟踪您的学习进度</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">• 专属客服支持</div>
                  <div className="text-muted-foreground">专业的客服支持</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}