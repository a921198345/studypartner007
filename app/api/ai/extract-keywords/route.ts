import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, context = '法律考试' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '缺少文本参数' }, { status: 400 });
    }

    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('未设置DEEPSEEK_API_KEY环境变量');
    }

    const prompt = `请从以下法律知识点名称中提取核心关键词，用于题库搜索。

知识点名称：${text}
上下文：${context}

要求：
1. 去除序号、括号等格式标记
2. 提取最核心的法律概念和术语
3. 如果是复合概念，提取主要关键词
4. 返回2-3个最相关的搜索关键词
5. 只返回关键词，用逗号分隔，不要其他解释

示例：
输入：（31）继承
输出：继承

输入：第三章 合同的效力
输出：合同,效力

请处理：`;

    // 调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API错误:', errorData);
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    const keywords = aiResponse.split(/[,，\s]+/).filter(k => k.length > 0);

    return NextResponse.json({
      success: true,
      keywords,
      original: text
    });

  } catch (error) {
    console.error('关键词提取失败:', error);
    
    // 降级处理：简单的文本清理
    try {
      const { text } = await request.json();
      const fallbackKeywords = text
        .replace(/[（）()【】\[\]]/g, '') // 去除括号
        .replace(/[0-9]+[、\.]/g, '') // 去除序号
        .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
        .trim()
        .split(/[,，\s]+/)
        .filter(k => k.length > 1);

      return NextResponse.json({
        success: true,
        keywords: fallbackKeywords.length > 0 ? fallbackKeywords : [text],
        original: text,
        fallback: true
      });
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        error: '关键词提取失败',
        fallback: true,
        keywords: [text || ''],
        original: text || ''
      }, { status: 500 });
    }
  }
}