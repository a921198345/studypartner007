import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { question, answer, multipleKeywords = false } = await req.json();
    
    if (!question) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少问题参数' 
      }, { status: 400 });
    }

    // 修改提示词逻辑，默认只提取单个核心关键词
    const prompt = `你是一个法律知识导图搜索助手。用户提出了一个法律问题，你需要提取最核心的搜索关键词。

用户问题：${question}
${answer ? `AI回答摘要：${answer.substring(0, 200)}` : ''}

请分析这个问题，返回最核心的单个法律概念。要求：
1. 只返回一个词或词组，不要返回多个
2. 如果问题是"X的考点"或"什么是X"，直接返回X
3. 如果问题提到具体罪名或法律术语，优先返回该术语
4. 绝对不要返回逗号分隔的多个词
5. 如果是关于侵犯性权利的问题，优先返回具体罪名如"强奸"、"猥亵"等

例如：
- "侵犯性权利的考点" → "强奸"（返回具体罪名而不是抽象概念）
- "什么是正当防卫" → "正当防卫"
- "故意杀人罪的构成要件" → "故意杀人"
- "合同的保全制度" → "合同的保全"
- "有偿合同和无偿合同的区别" → "有偿合同"

只返回关键词本身，不要有其他解释。`;

    // 调用 DeepSeek API
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: '你是一个法律知识导图搜索助手，专门提取精确的法律概念关键词。只返回关键词，不要有任何解释。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,  // 降低温度以获得更稳定的结果
            max_tokens: 50     // 增加一些余量，但仍然限制输出长度
          })
        });

        if (response.ok) {
          const data = await response.json();
          let keyword = data.choices[0].message.content.trim();
          
          // 处理可能的多个关键词情况，只取第一个
          if (keyword.includes(',')) {
            keyword = keyword.split(',')[0].trim();
          }
          
          // 移除可能的引号
          keyword = keyword.replace(/["""'']/g, '');
          
          console.log('AI提取的关键词:', keyword);
          
          return NextResponse.json({ 
            success: true,
            keyword: keyword || question,
            keywords: [keyword || question],  // 始终返回单个关键词的数组
            method: 'ai'
          });
        }
      } catch (error) {
        console.error('AI API调用失败:', error);
      }
    }

    // 降级到规则提取 - 始终提取单个关键词
    const keyword = extractKeywordWithRules(question);
    
    return NextResponse.json({ 
      success: true,
      keyword,
      keywords: [keyword],  // 始终返回单个关键词的数组
      method: 'rule-based'
    });
    
  } catch (error) {
    console.error('关键词提取错误:', error);
    return NextResponse.json({ 
      success: false, 
      message: '关键词提取失败' 
    }, { status: 500 });
  }
}

// 规则提取函数 - 返回单个精确关键词
function extractKeywordWithRules(question) {
  // 精确法律术语列表
  const preciseLegalTerms = [
    // 合同分类
    '有偿合同', '无偿合同', '双务合同', '单务合同', '诺成合同', '实践合同',
    '要式合同', '不要式合同', '主合同', '从合同',
    // 合同制度
    '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权',
    '合同的订立', '合同的效力', '合同的履行', '合同的解除', '合同的变更',
    // 具体合同
    '承揽合同', '买卖合同', '租赁合同', '借款合同', '保证合同', '抵押合同',
    '赠与合同', '委托合同', '行纪合同', '居间合同', '仓储合同', '运输合同',
    // 物权
    '所有权', '用益物权', '担保物权', '抵押权', '质权', '留置权',
    // 侵权
    '侵权责任', '产品责任', '机动车交通事故责任', '医疗损害责任',
    // 婚姻家庭
    '结婚条件', '离婚条件', '夫妻财产', '离婚损害赔偿',
    // 刑法
    '正当防卫', '紧急避险', '犯罪构成', '共同犯罪',
    '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗',
    // 人格权相关
    '侵犯性权利', '性自主权', '人身自由', '人格尊严', '身体权', '健康权',
    '姓名权', '肖像权', '名誉权', '荣誉权', '隐私权', '个人信息保护',
    // 其他
    '诉讼时效', '代理制度', '法人制度'
  ];
  
  const text = question.toLowerCase();
  
  // 按长度排序，优先匹配更长的术语
  const sortedTerms = [...preciseLegalTerms].sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    if (text.includes(term.toLowerCase())) {
      return term;  // 直接返回精确术语
    }
  }

  // 提取最重要的单个词
  const cleanedQuestion = question
    .replace(/[的了吗呢啊哦呀吧嘛么呢？?。，！、：；""''（）《》【】考点要点重点问题是什么怎么如何]/g, '')
    .trim();
  
  // 查找最长的有意义的词
  const words = cleanedQuestion.split(/\s+/).filter(word => word.length >= 2);
  if (words.length > 0) {
    // 返回最长的词（通常是最核心的）
    return words.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  }

  return '法律';
}

// 规则提取多个关键词
function extractMultipleKeywordsWithRules(question) {
  const keywords = [];
  
  // 精确法律术语列表
  const preciseLegalTerms = [
    // 合同分类
    '有偿合同', '无偿合同', '双务合同', '单务合同', '诺成合同', '实践合同',
    '要式合同', '不要式合同', '主合同', '从合同',
    // 合同制度
    '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权',
    '合同的订立', '合同的效力', '合同的履行', '合同的解除', '合同的变更',
    // 具体合同
    '承揽合同', '买卖合同', '租赁合同', '借款合同', '保证合同', '抵押合同',
    '赠与合同', '委托合同', '行纪合同', '居间合同', '仓储合同', '运输合同',
    // 物权
    '所有权', '用益物权', '担保物权', '抵押权', '质权', '留置权',
    // 侵权
    '侵权责任', '产品责任', '机动车交通事故责任', '医疗损害责任',
    // 婚姻家庭
    '结婚条件', '离婚条件', '夫妻财产', '离婚损害赔偿',
    // 刑法
    '正当防卫', '紧急避险', '犯罪构成', '共同犯罪',
    '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗',
    // 人格权相关
    '侵犯性权利', '性自主权', '人身自由', '人格尊严', '身体权', '健康权',
    '姓名权', '肖像权', '名誉权', '荣誉权', '隐私权', '个人信息保护',
    // 其他
    '诉讼时效', '代理制度', '法人制度'
  ];
  
  const text = question.toLowerCase();
  
  // 按长度排序，优先匹配更长的术语
  const sortedTerms = [...preciseLegalTerms].sort((a, b) => b.length - a.length);
  
  // 查找所有匹配的术语
  for (const term of sortedTerms) {
    if (text.includes(term.toLowerCase())) {
      keywords.push(term);
      // 删除已匹配的部分，避免重复匹配
      text.replace(term.toLowerCase(), '');
    }
  }
  
  // 如果找到多个关键词，返回
  if (keywords.length > 0) {
    return keywords.join(',');
  }
  
  // 否则提取最重要的词
  const cleanedQuestion = question
    .replace(/[的了吗呢啊哦呀吧嘛么呢？?。，！、：；“”‘’（）《》【】考点要点重点问题是什么怎么如何和与及关系区别对比]/g, ' ')
    .trim();
  
  // 查找所有有意义的词
  const words = cleanedQuestion.split(/\s+/).filter(word => word.length >= 2);
  return words.slice(0, 3).join(',') || '法律';
}