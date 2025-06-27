"use client"

import { Button } from "../ui/button"
import { BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "../ui/use-toast"
import { useState } from "react"

interface RelatedQuestionsButtonProps {
  message: string
  answer?: string
}

export function RelatedQuestionsButton({ message, answer }: RelatedQuestionsButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  // 智能识别科目的函数（与MindMapButton保持一致）
  const detectSubject = (text: string): string => {
    const content = (message + ' ' + (answer || '')).toLowerCase()
    
    // 定义科目关键词映射
    const subjectKeywords = {
      '民法': ['民法', '合同', '物权', '债权', '侵权', '婚姻', '继承', '人格权', '担保', '买卖', '租赁', '借贷', '赠与', '委托', '无因管理', '不当得利', '离婚', '财产分割', '子女抚养'],
      '刑法': ['刑法', '犯罪', '刑罚', '故意', '过失', '正当防卫', '紧急避险', '犯罪构成', '主观', '客观', '共犯', '量刑', '死刑', '有期徒刑', '罚金', '诈骗', '盗窃', '抢劫', '贪污', '受贿'],
      '行政法': ['行政法', '行政许可', '行政处罚', '行政强制', '行政复议', '行政诉讼', '政府', '行政机关', '公务员', '行政行为'],
      '宪法': ['宪法', '基本权利', '国家机构', '立法', '司法', '行政权', '公民权利', '选举', '人大', '国务院'],
      '民事诉讼法': ['民事诉讼', '民诉', '原告', '被告', '起诉', '答辩', '证据', '判决', '执行', '管辖', '送达', '期限', '上诉', '再审'],
      '刑事诉讼法': ['刑事诉讼', '刑诉', '侦查', '起诉', '审判', '辩护', '证据', '强制措施', '逮捕', '拘留', '取保候审'],
      '经济法': ['经济法', '公司法', '证券', '票据', '保险', '破产', '反垄断', '反不正当竞争', '消费者', '产品质量'],
      '商法': ['商法', '公司', '股东', '董事', '监事', '股权', '并购', '融资', '上市', '证券', '票据', '保险', '海商', '破产'],
      '国际法': ['国际法', '国际公法', '国际私法', '国际经济法', '条约', '国际组织', '外交', '领事', '国际贸易', 'WTO'],
      '法理学': ['法理学', '法律原理', '法的概念', '法律关系', '法律体系', '法治', '立法', '司法', '执法', '法律解释']
    }
    
    // 统计每个科目的匹配次数
    const scores: Record<string, number> = {}
    
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      scores[subject] = 0
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          scores[subject] += keyword.length > 2 ? 2 : 1 // 长关键词权重更高
        }
      }
    }
    
    // 找出得分最高的科目
    let maxScore = 0
    let detectedSubject = '民法' // 默认民法
    
    for (const [subject, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score
        detectedSubject = subject
      }
    }
    
    return detectedSubject
  }

  // 智能关键词提取 - 精确术语原样搜索，抽象问题智能提取
  const extractSmartKeywords = (question: string, answer: string): string => {
    // 精确法律术语列表 - 这些词直接作为搜索关键词
    const preciseLegalTerms = [
      // 合同分类
      '有偿合同', '无偿合同', '双务合同', '单务合同', '诺成合同', '实践合同',
      '要式合同', '不要式合同', '主合同', '从合同',
      // 合同制度
      '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权',
      '合同的订立', '合同的效力', '合同的履行', '合同的解除', '合同的变更',
      // 具体合同
      '承揽合同', '买卖合同', '租赁合同', '借款合同', '保证合同', '抵押合同', '质押合同',
      '赠与合同', '委托合同', '行纪合同', '居间合同', '仓储合同', '运输合同', '技术合同',
      '保管合同', '建设工程合同', '承包经营合同', '融资租赁合同',
      // 物权相关
      '所有权', '用益物权', '担保物权', '抵押权', '质权', '留置权', '建设用地使用权',
      '宅基地使用权', '土地承包经营权', '地役权', '居住权',
      // 侵权相关
      '侵权责任', '产品责任', '机动车交通事故责任', '医疗损害责任', '环境污染责任',
      '高度危险责任', '饲养动物损害责任', '物件损害责任',
      // 婚姻家庭
      '结婚条件', '离婚条件', '夫妻财产', '离婚损害赔偿', '子女抚养权', '探望权',
      // 继承相关
      '法定继承', '遗嘱继承', '遗赠', '遗赠扶养协议', '继承权', '代位继承', '转继承',
      // 刑法罪名 - 简化罪名，去掉"罪"字以便更好匹配
      '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗', '抢夺',
      '职务侵占', '挪用资金', '敲诈勒索', '贪污', '受贿', '行贿',
      '交通肇事', '危险驾驶', '绑架', '非法拘禁',
      // 人格权相关
      '侵犯性权利', '性自主权', '人身自由', '人格尊严', '身体权', '健康权',
      '姓名权', '肖像权', '名誉权', '荣誉权', '隐私权', '个人信息保护',
      // 刑法概念
      '犯罪构成', '犯罪主体', '犯罪客体', '犯罪主观方面', '犯罪客观方面',
      '正当防卫', '紧急避险', '共同犯罪', '犯罪中止', '犯罪未遂', '犯罪预备',
      // 行政法
      '行政许可', '行政处罚', '行政强制', '行政复议', '行政诉讼', '行政赔偿',
      '行政征收', '行政征用', '行政确认', '行政裁决',
      // 诉讼法
      '起诉条件', '管辖权', '诉讼时效', '举证责任', '证据种类', '证明标准',
      '申请回避', '财产保全', '先予执行', '诉讼代理', '简易程序', '普通程序',
      '二审程序', '再审程序', '执行程序'
    ];
    
    const text = question.toLowerCase();
    
    // 首先检查是否包含精确法律术语
    // 按长度排序，优先匹配更长的术语
    const sortedTerms = [...preciseLegalTerms].sort((a, b) => b.length - a.length);
    
    for (const term of sortedTerms) {
      if (text.includes(term.toLowerCase()) || text.includes(term + '罪')) {
        console.log('找到精确法律术语:', term);
        return term;  // 直接返回精确术语
      }
    }
    
    // 如果没有找到精确术语，返回空字符串，让AI来提取
    return '';
  }

  const extractKeywords = async (question: string, answer: string): Promise<string[]> => {
    // 先尝试找到精确的法律术语
    const preciseTerm = extractSmartKeywords(question, answer);
    if (preciseTerm) {
      console.log('使用精确法律术语:', preciseTerm);
      // 直接返回精确术语，不再扩展相关词
      
      return [preciseTerm];
    }

    // 如果没有精确术语，使用AI提取单个关键词
    try {
      const response = await fetch('/api/ai/extract-single-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question,
          answer: answer || ''
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.keyword) {
          console.log('AI提取的关键词:', data.keyword)
          return [data.keyword]
        }
      }
    } catch (error) {
      console.error('关键词提取API调用失败:', error)
    }

    // 最后的降级方案：提取问题中最核心的词
    const cleanedQuestion = question
      .replace(/[？?。，！、：；""''（）《》【】]/g, '')
      .trim()
    const words = cleanedQuestion.split(/\s+/).filter(word => word.length >= 2)
    if (words.length > 0) {
      return [words.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      )]
    }
    
    return ['法律']
  }

  const handleNavigateToQuestions = async () => {
    setIsProcessing(true)
    
    try {
      // 提取关键词
      const keywords = await extractKeywords(message, answer || '')
      
      // 构建查询参数 - 不传递subject，让用户在题库页面自行选择科目
      const searchParams = new URLSearchParams({
        keywords: keywords.join(','),  // 多个关键词用逗号分隔
        source: 'ai-chat'  // 标记来源，便于追踪
      })
      
      // 显示提示
      toast({
        description: `正在搜索"${keywords.join('、')}"相关题目`,
        duration: 2000,
      })
      
      // 跳转到题库页面
      router.push(`/question-bank?${searchParams.toString()}`)
    } catch (error) {
      console.error('跳转失败:', error)
      toast({
        description: '跳转失败，请重试',
        variant: 'destructive',
        duration: 2000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleNavigateToQuestions}
      disabled={isProcessing}
      className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
    >
      <BookOpen className="h-3 w-3 mr-1" />
      {isProcessing ? '处理中...' : '相关真题'}
    </Button>
  )
}