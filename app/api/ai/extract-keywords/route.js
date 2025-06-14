import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { question, answer, context } = await req.json();
    
    if (!question) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少问题参数' 
      }, { status: 400 });
    }

    // 构建提示词
    const prompt = `你是一个法律专业的关键词提取专家。请根据用户的问题和AI的回答，提取最相关的法律关键词用于在知识导图中搜索。

用户问题：${question}
${answer ? `AI回答摘要：${answer.substring(0, 500)}...` : ''}

要求：
1. 提取2-4个最核心的法律概念关键词
2. 优先提取法律术语、法律制度、法律原则等专业词汇
3. 避免提取无意义的词汇（如"考点"、"问题"等）
4. 如果问题涉及具体法律制度（如离婚、合同等），优先提取该制度的核心概念
5. 关键词要能在知识导图中找到相关内容

例如：
- "离婚考点" → "离婚 财产分割 子女抚养"
- "合同违约责任" → "合同 违约 损害赔偿"
- "正当防卫的条件" → "正当防卫 防卫过当 紧急避险"

请直接返回关键词，用空格分隔，不要有其他说明。`;

    // 使用简单的规则提取（如果没有配置 AI API）
    if (!process.env.DEEPSEEK_API_KEY) {
      // 降级到规则提取
      const keywords = extractKeywordsWithRules(question, answer);
      return NextResponse.json({ 
        success: true, 
        keywords,
        method: 'rule-based' 
      });
    }

    // 调用 DeepSeek API
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
              content: '你是一个专业的法律关键词提取助手。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 50
        })
      });

      if (!response.ok) {
        throw new Error('AI API 调用失败');
      }

      const data = await response.json();
      const keywords = data.choices[0].message.content.trim();
      
      return NextResponse.json({ 
        success: true, 
        keywords,
        method: 'ai-extracted' 
      });
    } catch (aiError) {
      console.error('AI关键词提取失败:', aiError);
      // 降级到规则提取
      const keywords = extractKeywordsWithRules(question, answer);
      return NextResponse.json({ 
        success: true, 
        keywords,
        method: 'rule-based-fallback' 
      });
    }
  } catch (error) {
    console.error('关键词提取错误:', error);
    return NextResponse.json({ 
      success: false, 
      message: '关键词提取失败' 
    }, { status: 500 });
  }
}

// 规则提取函数
function extractKeywordsWithRules(question, answer) {
  // 定义法律概念映射
  const conceptMappings = {
    '离婚': ['离婚', '财产分割', '子女抚养'],
    '合同': ['合同', '要约', '承诺', '违约'],
    '物权': ['物权', '所有权', '用益物权', '担保物权'],
    '侵权': ['侵权', '过错', '损害赔偿', '因果关系'],
    '犯罪': ['犯罪', '犯罪构成', '主观要件', '客观要件'],
    '继承': ['继承', '遗嘱', '法定继承', '遗产分割'],
    '担保': ['担保', '抵押', '质押', '保证'],
    '婚姻': ['婚姻', '结婚', '离婚', '夫妻财产'],
    '行政': ['行政行为', '行政许可', '行政处罚', '行政复议'],
    '诉讼': ['诉讼', '管辖', '证据', '判决']
  };

  const text = (question + ' ' + (answer || '')).toLowerCase();
  const foundConcepts = [];

  // 查找匹配的概念
  for (const [key, values] of Object.entries(conceptMappings)) {
    if (text.includes(key)) {
      // 添加相关概念，但过滤掉与问题完全相同的词
      const relevantConcepts = values.filter(v => 
        !question.toLowerCase().includes(v) || v.length > 2
      );
      foundConcepts.push(...relevantConcepts);
      break; // 只取第一个匹配的概念组
    }
  }

  // 如果找到概念，返回前3个
  if (foundConcepts.length > 0) {
    return [...new Set(foundConcepts)].slice(0, 3).join(' ');
  }

  // 否则提取问题中的关键词
  const keywords = question
    .replace(/[的了吗呢啊哦呀吧嘛么呢？?。，！、：；""''（）《》【】考点要点重点]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, 3);

  return keywords.join(' ') || '法律';
}