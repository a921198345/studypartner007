// 精确法律术语列表
const PRECISE_LEGAL_TERMS = [
  // 刑法罪名
  '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗', '抢夺',
  '职务侵占', '挪用资金', '敲诈勒索', '贪污', '受贿', '行贿',
  '交通肇事', '危险驾驶', '绑架', '非法拘禁',
  // 刑法概念
  '正当防卫', '紧急避险', '共同犯罪', '犯罪中止', '犯罪未遂', '犯罪预备',
  '犯罪构成', '犯罪主体', '犯罪客体',
  // 民法概念
  '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权',
  '合同的订立', '合同的效力', '合同的履行', '合同的解除',
  // 添加更多术语...
];

// 判断是否为精确法律术语
export function isPreciseLegalTerm(keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return PRECISE_LEGAL_TERMS.some(term => {
    const normalizedTerm = term.toLowerCase();
    return normalizedTerm === normalizedKeyword || 
           normalizedTerm + '罪' === normalizedKeyword ||
           normalizedKeyword === normalizedTerm + '罪';
  });
}

// 检查文本是否真正包含关键词（而不是部分匹配）
export function textContainsExactKeyword(text, keyword) {
  if (!text || !keyword) return false;
  
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  
  // 定义词边界模式
  const boundaryPatterns = [
    // 标准边界
    new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, 'i'),
    // 中文标点边界
    new RegExp(`[\\s，。！？、；：""''（）【】《》]${escapeRegExp(normalizedKeyword)}[\\s，。！？、；：""''（）【】《》]`, 'i'),
    // 开头或结尾
    new RegExp(`^${escapeRegExp(normalizedKeyword)}[\\s，。！？、；：]`, 'i'),
    new RegExp(`[\\s，。！？、；：]${escapeRegExp(normalizedKeyword)}$`, 'i'),
    // 罪名形式
    new RegExp(`${escapeRegExp(normalizedKeyword)}罪`, 'i'),
  ];
  
  // 检查是否匹配任一模式
  return boundaryPatterns.some(pattern => pattern.test(normalizedText));
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 过滤真正相关的题目
export function filterRelevantQuestions(questions, keyword) {
  if (!isPreciseLegalTerm(keyword)) {
    // 如果不是精确术语，返回所有结果
    return questions;
  }
  
  // 对于精确术语，进行严格筛选
  return questions.filter(question => {
    // 检查题目文本
    if (textContainsExactKeyword(question.question_text, keyword)) {
      return true;
    }
    
    // 对于解释文本，要求更严格的匹配
    if (question.explanation) {
      // 计算关键词在解释中出现的次数
      const explanationLower = question.explanation.toLowerCase();
      const keywordLower = keyword.toLowerCase();
      const occurrences = (explanationLower.match(new RegExp(escapeRegExp(keywordLower), 'gi')) || []).length;
      
      // 如果在解释中出现多次，或者是完整匹配，则认为相关
      if (occurrences >= 2 || textContainsExactKeyword(question.explanation, keyword)) {
        return true;
      }
    }
    
    return false;
  });
}

// 计算相关性分数
export function calculateRelevanceScore(question, keyword) {
  let score = 0;
  
  const questionText = question.question_text || '';
  const explanation = question.explanation || '';
  
  // 题目中的精确匹配得分最高
  if (textContainsExactKeyword(questionText, keyword)) {
    score += 10;
  }
  
  // 题目中的模糊匹配
  if (questionText.toLowerCase().includes(keyword.toLowerCase())) {
    score += 5;
  }
  
  // 解释中的精确匹配
  if (textContainsExactKeyword(explanation, keyword)) {
    score += 3;
  }
  
  // 解释中的模糊匹配
  if (explanation.toLowerCase().includes(keyword.toLowerCase())) {
    score += 1;
  }
  
  return score;
}

// 按相关性排序题目
export function sortQuestionsByRelevance(questions, keyword) {
  return questions.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, keyword);
    const scoreB = calculateRelevanceScore(b, keyword);
    return scoreB - scoreA;
  });
}