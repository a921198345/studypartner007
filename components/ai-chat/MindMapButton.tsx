"use client"

import { Button } from "@/components/ui/button"
import { Brain } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

interface MindMapButtonProps {
  message: string
  answer?: string
}

export function MindMapButton({ message, answer }: MindMapButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  // 智能识别科目的函数
  const detectSubject = (text: string): string => {
    const content = (message + ' ' + (answer || '')).toLowerCase()
    
    // 定义科目关键词映射 - 使用中文名称作为键
    const subjectKeywords = {
      '民法': ['民法', '合同', '物权', '债权', '侵权', '婚姻', '继承', '人格权', '担保', '买卖', '租赁', '借贷', '赠与', '委托', '无因管理', '不当得利', '离婚', '财产分割', '子女抚养'],
      '刑法': ['刑法', '犯罪', '刑罚', '故意', '过失', '正当防卫', '紧急避险', '犯罪构成', '主观', '客观', '共犯', '量刑', '死刑', '有期徒刑', '罚金', '诈骗', '盗窃', '抢劫', '贪污', '受贿'],
      '行政法': ['行政法', '行政许可', '行政处罚', '行政强制', '行政复议', '行政诉讼', '政府', '行政机关', '公务员', '行政行为'],
      '刑事诉讼法': ['刑事诉讼', '刑诉', '侦查', '起诉', '审判', '辩护', '证据', '强制措施', '逮捕', '拘留', '取保候审'],
      '民事诉讼法': ['民事诉讼', '民诉', '原告', '被告', '起诉', '答辩', '证据', '判决', '执行', '管辖', '送达', '期限', '上诉', '再审'],
      '商经知': ['经济法', '公司法', '证券', '票据', '保险', '破产', '反垄断', '反不正当竞争', '消费者', '产品质量', '商法', '公司', '股东', '董事', '监事', '股权', '并购', '融资', '上市', '海商', '知识产权', '劳动法', '环境法'],
      '三国法': ['国际法', '国际公法', '国际私法', '国际经济法', '条约', '国际组织', '外交', '领事', '国际贸易', 'WTO'],
      '理论法': ['法理学', '法律原理', '法的概念', '法律关系', '法律体系', '法治', '立法', '司法', '执法', '法律解释', '宪法', '基本权利', '国家机构', '立法', '司法', '行政权', '公民权利', '选举', '人大', '国务院']
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
    let detectedSubject = '民法' // 默认民法（中文）
    
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
      // 合同分类 - 增加更多分类
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
      // 刑法罪名
      '故意杀人罪', '故意伤害罪', '强奸罪', '抢劫罪', '盗窃罪', '诈骗罪', '抢夺罪',
      '职务侵占罪', '挪用资金罪', '敲诈勒索罪', '贪污罪', '受贿罪', '行贿罪',
      '交通肇事罪', '危险驾驶罪', '绑架罪', '非法拘禁罪',
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
    
    // 首先检查是否包含精确法律术语 - 优先匹配长词
    // 按长度排序，优先匹配更长的术语
    const sortedTerms = [...preciseLegalTerms].sort((a, b) => b.length - a.length);
    
    for (const term of sortedTerms) {
      if (text.includes(term.toLowerCase())) {
        console.log('找到精确法律术语:', term);
        return term;  // 直接返回精确术语
      }
    }
    
    // 如果没有精确术语，使用概念映射
    const conceptMapping: Record<string, string> = {
      // 增加更多合同相关的映射
      '合同保全': '合同的保全',
      '债权保全': '合同的保全',
      // 民法
      '离婚考点': '离婚',
      '离婚纠纷': '离婚',
      '财产分割': '离婚',
      '子女抚养': '离婚',
      '婚姻家庭': '婚姻',
      '合同违约': '合同',
      '违约责任': '合同',
      '买卖合同': '买卖',
      '租赁合同': '租赁',
      '借款合同': '借贷',
      '保证合同': '保证',
      '抵押担保': '抵押',
      '质押担保': '质押',
      '侵权责任': '侵权',
      '损害赔偿': '侵权',
      '继承权': '继承',
      '遗嘱继承': '继承',
      '法定继承': '继承',
      '所有权': '物权',
      '用益物权': '物权',
      '担保物权': '物权',
      // 刑法
      '诈骗罪': '诈骗',
      '盗窃罪': '盗窃',
      '抢劫罪': '抢劫',
      '正当防卫': '防卫',
      '紧急避险': '避险',
      '犯罪构成': '犯罪',
      '共同犯罪': '共犯',
      '贪污罪': '贪污',
      '受贿罪': '受贿',
      // 行政法
      '行政许可': '许可',
      '行政处罚': '处罚',
      '行政强制': '强制',
      '行政复议': '复议',
      '行政诉讼': '诉讼',
      // 诉讼法
      '民事诉讼': '诉讼',
      '刑事诉讼': '诉讼',
      '证据规则': '证据',
      '管辖权': '管辖',
      '上诉程序': '上诉',
      '审判程序': '审判'
    }

    // 核心法律术语库（单个词）
    const coreLegalTerms = [
      // 民法核心概念
      '合同', '物权', '债权', '侵权', '婚姻', '继承', '离婚', '保证',
      '买卖', '租赁', '借贷', '赠与', '委托', '承揽', '运输', '保管',
      '抵押', '质押', '留置',
      // 刑法核心概念 
      '犯罪', '刑罚', '故意', '过失', '防卫', '避险', '共犯', '量刑',
      '诈骗', '盗窃', '抢劫', '杀人', '伤害', '绑架', '贪污', '受贿',
      // 行政法核心概念
      '许可', '处罚', '强制', '复议',
      // 诉讼法核心概念
      '诉讼', '原告', '被告', '证据', '判决', '执行', '管辖', '上诉', '再审'
    ]

    const combinedText = question + ' ' + (answer || '')
    
    // 检查概念映射
    for (const [phrase, concept] of Object.entries(conceptMapping)) {
      if (combinedText.toLowerCase().includes(phrase)) {
        console.log('匹配到概念映射:', phrase, '->', concept);
        return concept
      }
    }
    
    // 寻找最重要的单个核心术语
    for (const term of coreLegalTerms) {
      if (text.includes(term)) {
        return term
      }
    }

    // 从问题中提取最核心的词
    const cleanedQuestion = question
      .replace(/[？?。，！、：；""''（）《》【】考点要点重点分析详细讲解说明解释问题问答解答内容知识点是什么怎么如何]/g, '')
      .trim()
    
    // 找到最长的有意义的词
    const words = cleanedQuestion.split(/\s+/).filter(word => word.length >= 2)
    if (words.length > 0) {
      // 返回最长的词（通常是最核心的）
      return words.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      )
    }
    
    // 默认返回
    return '法律'
  }

  const handleNavigateToMindMap = async () => {
    setIsProcessing(true)
    
    try {
      // 智能识别科目
      const subject = detectSubject(message + ' ' + (answer || ''))
      
      let keywords = ''
      
      try {
        // 使用新的关键词提取 API，支持多关键词
        const response = await fetch('/api/ai/extract-single-keyword', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            question: message,
            answer: answer || '',
            multipleKeywords: true  // 请求多个关键词
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.keywords && data.keywords.length > 0) {
            // 如果返回多个关键词，用逗号连接
            keywords = data.keywords.join(',')
            console.log(`使用${data.method === 'ai' ? 'AI' : '规则'}提取的关键词:`, data.keywords)
          } else if (data.success && data.keyword) {
            // 单个关键词的情况
            keywords = data.keyword
            console.log(`使用${data.method === 'ai' ? 'AI' : '规则'}提取的关键词:`, keywords)
          } else {
            // 如果 API 失败，使用本地规则
            keywords = extractSmartKeywords(message, answer || '')
            console.log('使用本地规则提取:', keywords)
          }
        } else {
          // API 调用失败，使用本地规则
          keywords = extractSmartKeywords(message, answer || '')
          console.log('使用本地规则提取:', keywords)
        }
      } catch (error) {
        // 网络错误，使用本地规则
        console.error('关键词提取API调用失败:', error)
        keywords = extractSmartKeywords(message, answer || '')
      }
      
      // 导航到思维导图
      const searchParams = new URLSearchParams({
        subject: subject,
        search: keywords
      })
      
      // 显示提示 - 科目名称已经是中文，不需要映射
      
      toast({
        description: `正在跳转到${subject}知识导图，关键词：${keywords}`,
        duration: 2000,
      })
      
      router.push(`/knowledge-map?${searchParams.toString()}`)
    } catch (error) {
      console.error('导图跳转失败:', error)
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
      onClick={handleNavigateToMindMap}
      disabled={isProcessing}
      className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
    >
      <Brain className="h-3 w-3 mr-1" />
      {isProcessing ? '处理中...' : '查看导图'}
    </Button>
  )
}