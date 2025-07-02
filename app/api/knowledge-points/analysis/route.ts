import { NextRequest, NextResponse } from 'next/server';
import { generateAnswerStream, buildPrompt } from '@/lib/deepseek';

export async function POST(req: NextRequest) {
  try {
    const { knowledgePoint, subject, parentNodes = [] } = await req.json();
    
    if (!knowledgePoint) {
      return NextResponse.json(
        { success: false, message: '缺少知识点名称' },
        { status: 400 }
      );
    }

    // 构建专业的法考重难点解析提示词
    const analysisPrompt = buildAnalysisPrompt(knowledgePoint, subject, parentNodes);
    
    // 直接调用DeepSeek进行分析
    const fullPrompt = buildPrompt(analysisPrompt, []);
    const deepseekStream = await generateAnswerStream(fullPrompt);
    
    if (!deepseekStream) {
      throw new Error('AI分析服务不可用');
    }

    // 读取完整的流式响应
    const reader = deepseekStream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const dataContent = trimmedLine.substring(6).trim();
          if (dataContent === '[DONE]') continue;
          
          try {
            const jsonData = JSON.parse(dataContent);
            if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
              fullResponse += jsonData.choices[0].delta.content;
            }
          } catch (parseError) {
            // 忽略解析错误，继续处理
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        knowledgePoint,
        subject,
        content: fullResponse,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('重难点解析失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '分析过程中出现错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 构建法考重难点解析的专业提示词
 */
function buildAnalysisPrompt(knowledgePoint: string, subject: string, parentNodes: string[] = []): string {
  const contextInfo = parentNodes.length > 0 
    ? `，属于【${parentNodes.join(' → ')}】体系下的具体考点`
    : '';

  // 根据不同学科提供更精准的分析角度
  const subjectSpecificTips = getSubjectSpecificTips(subject);

  return `你是资深法考辅导专家，对历年国家统一法律职业资格考试有深入研究。请对以下知识点进行专业的重难点解析。

**分析对象：** ${knowledgePoint}（${subject}${contextInfo}）

**特别说明：** ${subjectSpecificTips}

## 📍 考点定位
- **考试地位**：在法考${subject}中的重要程度和必考指数
- **出题频率**：近年来的考查频率（每年/隔年/偶尔）
- **分值比重**：在该科目中所占分值比例
- **题型偏好**：主要出现在哪种题型中

## 🎯 核心考点
### 重点内容（必须掌握）
- 核心定义和构成要件
- 法定条件和适用范围  
- 与其他制度的关系
- 实务操作要点

### 难点解析（易错易混）
- 概念辨析的关键区别
- 容易混淆的相似制度
- 理解上的常见误区
- 记忆难点的突破方法

## ⚡ 高频考法
- **命题角度**：常见的3-4种出题方式
- **陷阱设置**：题目中的典型干扰选项
- **关键词提示**：题干中的重要信号词
- **案例特点**：案例题的常见情形

## 📚 关联考点
- **内部联系**：与本科目其他知识点的关联
- **交叉考查**：可能与其他科目结合出题的情况
- **体系位置**：在整个法律体系中的地位

## 💡 备考策略
- **重点突破**：最应该重点掌握的核心内容
- **记忆技巧**：便于记忆的口诀或联想方法
- **练习重点**：应该重点练习的题型和考点组合
- **复习节奏**：建议的学习时间安排

## 🚨 避雷指南
列举考生最容易出错的3-4个误区，提供避免方法

**要求：**
1. 基于真实法考情况，内容准确专业
2. 突出应试实用性，避免纯理论阐述  
3. 语言简洁明了，重点突出
4. 总字数控制在1200字左右
5. 严格使用Markdown格式

请开始分析：`;
}

/**
 * 根据学科提供特定的分析提示
 */
function getSubjectSpecificTips(subject: string): string {
  const tips: Record<string, string> = {
    '民法': '重点关注合同、物权、侵权三大板块的实务应用，注意民法典的新变化和司法解释',
    '刑法': '重点分析罪名构成要件、数罪并罚、量刑情节等核心问题，注意总则与分则的结合',
    '行政法': '重点关注行政行为的效力、程序和救济途径，注意与民法、刑法的交叉',
    '民事诉讼法': '重点分析程序规则、证据制度和执行程序，注意2021年民诉法修改内容',
    '刑事诉讼法': '重点关注强制措施、证据规则和程序正义，注意与实体法的配合',
    '商经知': '重点分析公司、证券、知识产权等商事法律关系，注意商法特有制度',
    '三国法': '重点关注法律适用、国际条约和涉外民商事争议解决',
    '理论法': '重点分析法理学核心概念、宪法基本制度和法律职业伦理'
  };
  
  return tips[subject] || '请结合该学科的特点进行针对性分析';
}