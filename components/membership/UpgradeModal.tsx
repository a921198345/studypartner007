'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Crown, Check, Zap, BookOpen, Globe, FileText, Clock } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerFeature?: 'ai_chat' | 'mindmap' | 'question_bank' | 'notes';
  currentUsage?: {
    limit: number;
    used: number;
    remainingToday?: number;
  };
  onUpgrade?: () => void;
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  triggerFeature = 'ai_chat',
  currentUsage,
  onUpgrade
}: UpgradeModalProps) {
  
  // 根据触发功能显示不同的提示信息
  const getFeatureInfo = () => {
    switch (triggerFeature) {
      case 'ai_chat':
        return {
          title: 'AI问答次数已用完',
          description: `今日免费AI问答次数已达上限（${currentUsage?.limit || 3}次）`,
          icon: <Zap className="w-6 h-6 text-yellow-500" />,
          limitation: '每日仅限3次AI问答'
        };
      case 'mindmap':
        return {
          title: '知识导图需要会员',
          description: '查看完整8大学科知识导图需要升级会员',
          icon: <Globe className="w-6 h-6 text-blue-500" />,
          limitation: '仅可查看民法知识导图'
        };
      case 'question_bank':
        return {
          title: '历年真题需要会员',
          description: '查看全部年份真题需要升级会员',
          icon: <BookOpen className="w-6 h-6 text-green-500" />,
          limitation: '仅可查看2022年真题'
        };
      case 'notes':
        return {
          title: '笔记数量已达上限',
          description: `免费用户最多创建${currentUsage?.limit || 10}条笔记`,
          icon: <FileText className="w-6 h-6 text-purple-500" />,
          limitation: `已创建${currentUsage?.used || 0}/${currentUsage?.limit || 10}条笔记`
        };
      default:
        return {
          title: '升级会员解锁更多功能',
          description: '享受完整的法考学习体验',
          icon: <Crown className="w-6 h-6 text-gold-500" />,
          limitation: '功能受限'
        };
    }
  };

  const featureInfo = getFeatureInfo();

  const membershipPlans = [
    {
      name: '月度会员',
      price: '¥19.9',
      period: '/月',
      popular: false,
      features: [
        'AI问答无限次数',
        '全部8大学科知识导图',
        '全年份历年真题',
        '无限笔记创建',
        'AI督学功能'
      ]
    },
    {
      name: '季度会员',
      price: '¥49.9',
      period: '/季',
      popular: true,
      originalPrice: '¥59.7',
      features: [
        'AI问答无限次数',
        '全部8大学科知识导图', 
        '全年份历年真题',
        '无限笔记创建',
        'AI督学功能',
        '智能学习计划调整'
      ]
    },
    {
      name: '年度会员',
      price: '¥159.9',
      period: '/年',
      popular: false,
      originalPrice: '¥238.8',
      features: [
        'AI问答无限次数',
        '全部8大学科知识导图',
        '全年份历年真题', 
        '无限笔记创建',
        'AI督学功能',
        '智能学习计划调整',
        '专属客服支持'
      ]
    }
  ];

  const handlePlanSelect = (plan: any) => {
    // 这里可以调用支付接口
    console.log('选择套餐:', plan);
    if (onUpgrade) {
      onUpgrade();
    }
    // 暂时关闭弹窗
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {featureInfo.icon}
              <DialogTitle className="text-xl font-semibold">
                {featureInfo.title}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">
            {featureInfo.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-3 h-3 mr-1" />
              当前限制: {featureInfo.limitation}
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">
              升级会员，解锁全部功能
            </h3>
            <p className="text-gray-600">
              选择适合您的会员套餐，享受完整的法考学习体验
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {membershipPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative border rounded-lg p-6 ${
                  plan.popular 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-3 py-1">
                      最受欢迎
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="font-semibold text-lg mb-2">{plan.name}</h4>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {plan.price}
                    </span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="text-sm text-gray-500 line-through mt-1">
                      原价 {plan.originalPrice}
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePlanSelect(plan)}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  立即升级
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              会员特权对比
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium mb-1">AI问答</div>
                <div className="text-gray-500">免费: 每日3次</div>
                <div className="text-blue-600">会员: 无限次数</div>
              </div>
              <div>
                <div className="font-medium mb-1">知识导图</div>
                <div className="text-gray-500">免费: 仅民法</div>
                <div className="text-blue-600">会员: 全部8科</div>
              </div>
              <div>
                <div className="font-medium mb-1">历年真题</div>
                <div className="text-gray-500">免费: 2022年</div>
                <div className="text-blue-600">会员: 全年份</div>
              </div>
              <div>
                <div className="font-medium mb-1">学习笔记</div>
                <div className="text-gray-500">免费: 最多10条</div>
                <div className="text-blue-600">会员: 无限条数</div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              ✨ 支持支付宝、微信支付 | 📞 遇到问题可联系客服
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}