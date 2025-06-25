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
    const userInfo = getUserInfo();
    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  const membershipPlans = [
    {
      id: '1month',
      title: '1个月会员',
      price: 39.9,
      duration_days: 30,
      popular: false
    },
    {
      id: '3month',
      title: '3个月会员',
      price: 99,
      duration_days: 90,
      popular: true
    }
  ];

  const handleUpgrade = async (planId) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "升级会员需要先登录账户",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    const selectedPlan = membershipPlans.find(plan => plan.id === planId);
    if (!selectedPlan) return;

    setIsLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/membership/simple-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membership_type: 'paid',
          duration_days: selectedPlan.duration_days
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "升级成功！",
          description: `恭喜您成为会员（${selectedPlan.title}），可以使用所有功能了！`,
        });
        
        // 更新本地用户信息
        const updatedUser = { ...user, membership_type: 'paid' };
        localStorage.setItem('user_info', JSON.stringify(updatedUser));
        
        // 清除知识导图缓存
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('mindmap_cache_')) {
            localStorage.removeItem(key);
          }
        });
        
        // 设置强制刷新标记，用于MindMapViewer重新加载
        localStorage.setItem('force_mindmap_refresh', 'true');
        
        // 跳转回知识导图
        setTimeout(() => {
          router.push('/knowledge-map');
        }, 2000);
      } else {
        throw new Error(data.message || '升级失败');
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

  const features = [
    { icon: <Crown className="w-5 h-5" />, text: "访问所有8个学科知识导图" },
    { icon: <Zap className="w-5 h-5" />, text: "无限制AI问答和聊天" },
    { icon: <Star className="w-5 h-5" />, text: "保存无限制学习笔记" },
    { icon: <Check className="w-5 h-5" />, text: "高级搜索和筛选功能" },
    { icon: <Check className="w-5 h-5" />, text: "学习进度跟踪" },
    { icon: <Check className="w-5 h-5" />, text: "专属客服支持" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <MainNav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              升级为会员
            </h1>
            <p className="text-xl text-gray-600">
              解锁所有功能，助力您的法考之路
            </p>
          </div>

          {/* 会员卡片 */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* 免费版 */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  免费版
                </CardTitle>
                <div className="text-3xl font-bold">￥0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>民法知识导图</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>每日5次AI问答</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>基础功能使用</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 会员版选项 */}
            {membershipPlans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative ${plan.popular ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1">
                      推荐
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className={`w-5 h-5 ${plan.popular ? 'text-yellow-500' : 'text-blue-500'}`} />
                    {plan.title}
                  </CardTitle>
                  <div className={`text-3xl font-bold ${plan.popular ? 'text-yellow-600' : 'text-blue-600'}`}>
                    ￥{plan.price}
                    <span className="text-sm font-normal text-gray-500">/{plan.id === '1month' ? '月' : '3个月'}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className={plan.popular ? 'text-yellow-500' : 'text-blue-500'}>{feature.icon}</div>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isLoading}
                    className={`w-full font-semibold py-3 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                    } text-white`}
                  >
                    {isLoading ? "处理中..." : "立即升级"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 临时说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🎯 开发测试阶段说明
            </h3>
            <p className="text-blue-700 mb-4">
              当前为开发测试阶段，点击"立即升级"将直接激活您的会员权限，无需实际支付。
            </p>
            <div className="bg-white rounded p-4 border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">升级后您将获得：</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 访问所有法考学科知识导图（民法、刑法、行政法等8个学科）</li>
                <li>• 无限制使用AI问答功能</li>
                <li>• 保存无限制数量的学习笔记</li>
                <li>• 会员权限根据所选套餐确定有效期</li>
              </ul>
            </div>
          </div>

          {/* 返回按钮 */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="px-8"
            >
              返回上一页
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}