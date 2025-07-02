/**
 * 知识提取模块 - 从AI回答中提取关键知识点
 * 
 * 这个模块负责分析AI回答内容，提取关键法律概念、名词和知识点
 * 使用简单的文本分析方法，适合初中生理解
 */

/**
 * 从AI回答中提取关键知识点
 * @param {string} answer - AI生成的回答文本
 * @param {string} subject - 问题所属学科
 * @returns {Array} 提取的知识点数组
 */
export function extractKnowledgePoints(answer, subject) {
  // 如果没有回答或回答为空，返回空数组
  if (!answer || answer.trim() === '') {
    return [];
  }

  const knowledgePoints = [];
  
  // 1. 按段落分割文本
  const paragraphs = answer.split(/\n\n+/);
  
  // 2. 查找关键法律概念
  // 使用简单的正则表达式匹配常见的法律术语标记
  const legalTermPatterns = [
    // 法条引用
    /《(.+?)》/g,  // 匹配《民法典》等法律名称
    /第(\d+)条/g,  // 匹配"第X条"
    
    // 法律概念，使用引号或特殊格式标记的内容
    /"([^"]+)"/g,  // 匹配双引号中的内容
    /"([^"]+)"/g,  // 匹配中文引号中的内容
    
    // 标题和小标题，通常是重要概念
    /[【\[［]([^】\]］]+)[】\]］]/g,  // 匹配【】[]［］中的内容
    
    // 关键词定义
    /([^，。；：！？\n]+)是指([^。；！？\n]+)/g,  // 匹配"X是指Y"格式的定义
    /([^，。；：！？\n]+)，?指([^。；！？\n]+)/g,  // 匹配"X，指Y"格式的定义
  ];
  
  // 3. 根据不同学科添加特定的关键词
  const subjectKeywords = getSubjectKeywords(subject);
  
  // 4. 遍历每个段落提取知识点
  paragraphs.forEach(paragraph => {
    // 应用所有正则表达式模式
    legalTermPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(paragraph)) !== null) {
        if (match[1] && match[1].length > 1) { // 忽略太短的匹配
          knowledgePoints.push({
            text: match[1],
            type: 'legal_term',
            source: 'pattern_match'
          });
        }
      }
    });
    
    // 检查特定学科的关键词
    subjectKeywords.forEach(keyword => {
      if (paragraph.includes(keyword)) {
        knowledgePoints.push({
          text: keyword,
          type: 'subject_keyword',
          source: 'keyword_match'
        });
      }
    });
  });
  
  // 5. 去除重复的知识点
  const uniqueKnowledgePoints = removeDuplicates(knowledgePoints);
  
  // 6. 限制返回的知识点数量，避免太多
  return uniqueKnowledgePoints.slice(0, 10);
}

/**
 * 根据学科获取特定的关键词列表
 * @param {string} subject - 学科名称
 * @returns {Array} 关键词列表
 */
function getSubjectKeywords(subject) {
  const keywordsBySubject = {
    '民法': [
      '所有权', '用益物权', '担保物权', '占有', '合同', '侵权责任',
      '人格权', '婚姻家庭', '继承', '民事责任', '时效', '代理'
    ],
    '刑法': [
      '犯罪构成', '正当防卫', '紧急避险', '刑事责任', '量刑', '累犯',
      '自首', '共同犯罪', '缓刑', '减刑', '假释', '追诉时效'
    ],
    '民事诉讼法': [
      '管辖', '诉讼参加人', '证据', '期间', '送达', '调解',
      '保全', '简易程序', '普通程序', '执行', '上诉', '审判监督'
    ],
    '刑事诉讼法': [
      '立案', '侦查', '起诉', '审判', '证据', '强制措施',
      '辩护', '告诉', '不起诉', '附带民事诉讼', '执行', '死刑复核'
    ],
    '商法与经济法': [
      '公司', '证券', '票据', '破产', '保险', '海商',
      '反垄断', '消费者权益', '产品质量', '价格', '税收', '知识产权'
    ],
    '理论法学': [
      '法律渊源', '法律解释', '法律适用', '法律体系', '法律关系', '法律责任',
      '法治', '权利', '义务', '法律行为', '公平', '正义'
    ],
    '行政法与行政诉讼法': [
      '行政许可', '行政处罚', '行政强制', '行政复议', '行政诉讼', '国家赔偿',
      '行政执法', '行政监督', '行政相对人', '受案范围', '起诉条件', '判决方式'
    ],
    '三国法': [
      '国际公法', '国际私法', '国际经济法', '条约', '国际组织', '外交特权与豁免',
      '领事关系', '国际争端解决', '冲突规范', '管辖权', '法律适用', '国际仲裁'
    ]
  };
  
  // 返回指定学科的关键词，如果没有则返回空数组
  return keywordsBySubject[subject] || [];
}

/**
 * 去除重复的知识点
 * @param {Array} knowledgePoints - 知识点数组
 * @returns {Array} 去重后的知识点数组
 */
function removeDuplicates(knowledgePoints) {
  const uniqueTexts = new Set();
  return knowledgePoints.filter(point => {
    if (uniqueTexts.has(point.text)) {
      return false;
    }
    uniqueTexts.add(point.text);
    return true;
  });
}

/**
 * 格式化提取的知识点，生成适合存储的格式
 * @param {Array} knowledgePoints - 提取的知识点数组
 * @param {string} subject - 学科名称
 * @returns {Array} 格式化后的知识点
 */
export function formatKnowledgePoints(knowledgePoints, subject) {
  return knowledgePoints.map(point => {
    return {
      id: `kp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: point.text,
      subject: subject,
      path: `${subject}/${point.text}`,
      source: point.source
    };
  });
}

export default {
  extractKnowledgePoints,
  formatKnowledgePoints
}; 