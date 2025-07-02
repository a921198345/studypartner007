/**
 * 内容审核模块
 * 
 * 提供AI回答内容审核功能，确保内容安全、相关且有帮助
 */

/**
 * 审核AI回答内容
 * @param {string} answer - AI生成的回答
 * @param {string} question - 用户的原始问题
 * @param {string} subject - 问题所属学科
 * @returns {Object} - 审核结果 {isAllowed: boolean, reason: string, modifiedAnswer: string}
 */
export async function moderateAIAnswer(answer, question, subject = '民法') {
  try {
    if (!answer || typeof answer !== 'string') {
      return {
        isAllowed: false,
        reason: '回答内容为空或格式不正确',
        modifiedAnswer: null
      };
    }

    // 1. 检查有害内容（敏感词过滤）
    const harmCheckResult = checkHarmfulContent(answer);
    if (!harmCheckResult.isAllowed) {
      return harmCheckResult;
    }

    // 2. 检查是否与法律考试相关
    const relevanceCheckResult = checkLegalRelevance(answer, question, subject);
    if (!relevanceCheckResult.isAllowed) {
      // 对于相关性不足的回答，我们提供一个友好的修改版本
      return {
        isAllowed: true,  // 仍然允许回答，但带有提示
        reason: relevanceCheckResult.reason,
        modifiedAnswer: addDisclaimerToAnswer(answer, relevanceCheckResult.reason)
      };
    }

    // 3. 检查回答质量（长度、格式等）
    const qualityCheckResult = checkAnswerQuality(answer);
    if (!qualityCheckResult.isAllowed) {
      return qualityCheckResult;
    }

    // 所有检查都通过
    return {
      isAllowed: true,
      reason: null,
      modifiedAnswer: answer  // 无需修改
    };
  } catch (error) {
    console.error('内容审核过程中发生错误:', error);
    // 发生错误时，默认允许通过但记录错误
    return {
      isAllowed: true,
      reason: '审核过程发生错误',
      modifiedAnswer: answer
    };
  }
}

/**
 * 检查有害内容
 * @param {string} answer - AI回答
 * @returns {Object} - 检查结果
 */
function checkHarmfulContent(answer) {
  // 定义敏感词列表（简化版）
  const bannedKeywords = [
    '政治敏感', '色情', '赌博', '暴力', '种族歧视', '宗教歧视', 
    '暗网', '毒品', '恐怖主义'
  ];
  
  // 检查是否包含敏感词
  for (const keyword of bannedKeywords) {
    if (answer.includes(keyword)) {
      // 生成一个通用的安全回答
      const safeAnswer = generateSafeAnswer();
      return {
        isAllowed: false,
        reason: `回答包含不适当内容: ${keyword}`,
        modifiedAnswer: safeAnswer
      };
    }
  }
  
  return {
    isAllowed: true,
    reason: null
  };
}

/**
 * 检查法律相关性
 * @param {string} answer - AI回答
 * @param {string} question - 用户问题
 * @param {string} subject - 问题学科
 * @returns {Object} - 检查结果
 */
function checkLegalRelevance(answer, question, subject) {
  // 法律关键词检查
  const legalKeywords = [
    '法律', '法条', '条款', '权利', '义务', '民法', '刑法', '诉讼', '合同',
    '犯罪', '侵权', '责任', '法院', '诉讼', '判决', '规定', '条例', '法规',
    '义务', '主体', '客体', '要件', '构成', '违约', '诉讼时效', '原告', '被告'
  ];
  
  // 计算法律关键词出现次数
  let keywordCount = 0;
  for (const keyword of legalKeywords) {
    // 使用正则表达式统计关键词出现次数（考虑词边界）
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = answer.match(regex);
    if (matches) {
      keywordCount += matches.length;
    }
  }
  
  // 如果关键词很少且内容较长，可能不是法律相关回答
  if (keywordCount < 2 && answer.length > 100) {
    return {
      isAllowed: false,
      reason: '回答似乎与法律考试内容关联不大'
    };
  }
  
  return {
    isAllowed: true,
    reason: null
  };
}

/**
 * 检查回答质量
 * @param {string} answer - AI回答
 * @returns {Object} - 检查结果
 */
function checkAnswerQuality(answer) {
  // 检查回答是否过短
  if (answer.length < 30) {
    const enhancedAnswer = `${answer}\n\n[系统提示: 此回答可能不够详细，建议您提供更多问题背景或重新提问以获取更详尽的解答。]`;
    return {
      isAllowed: true, // 仍然允许，但带有提示
      reason: '回答内容过短',
      modifiedAnswer: enhancedAnswer
    };
  }
  
  // 检查回答是否包含一些基本结构（如换行、分段）
  if (!answer.includes('\n') && answer.length > 200) {
    // 对于长文本但没有分段的情况，尝试增加基本格式
    const formattedAnswer = addBasicFormatting(answer);
    return {
      isAllowed: true,
      reason: '回答格式优化',
      modifiedAnswer: formattedAnswer
    };
  }
  
  return {
    isAllowed: true,
    reason: null
  };
}

/**
 * 为回答添加免责声明
 * @param {string} answer - 原始回答
 * @param {string} reason - 原因
 * @returns {string} - 带有免责声明的回答
 */
function addDisclaimerToAnswer(answer, reason) {
  const disclaimer = `[系统提示: ${reason}。以下回答可能不完全符合法考学习需求，仅供参考。]\n\n`;
  return disclaimer + answer;
}

/**
 * 为长文本添加基本格式
 * @param {string} answer - 原始回答
 * @returns {string} - 格式化后的回答
 */
function addBasicFormatting(answer) {
  // 简单的分段逻辑：在句号、问号、感叹号后适当添加换行
  let formatted = answer;
  // 在句子结束且后面是空格的地方添加换行
  formatted = formatted.replace(/([。？！])\s+/g, '$1\n\n');
  
  return formatted;
}

/**
 * 生成安全回答（当检测到不适当内容时）
 * @returns {string} - 安全的通用回答
 */
function generateSafeAnswer() {
  return `很抱歉，我无法提供与该问题相关的回答。请确保您的问题与法律考试学习相关，并且不包含不适当内容。

如果您有其他法律考试相关问题，欢迎随时提问，我会尽力提供专业的解答。`;
}

export default {
  moderateAIAnswer
}; 