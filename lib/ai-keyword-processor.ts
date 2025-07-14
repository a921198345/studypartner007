// AI增强的关键词处理器
export class AIKeywordProcessor {
  // 法律概念同义词和相关词映射
  static conceptMappings = {
    // 民法相关
    '婚姻家庭': ['婚姻', '家庭', '夫妻', '配偶', '结婚', '离婚', '婚姻关系', '家庭关系', '夫妻关系'],
    '财产继承': ['继承', '遗产', '继承权', '继承人', '遗嘱', '法定继承', '遗产分配'],
    '物权': ['物权法', '所有权', '用益物权', '担保物权', '占有', '物的权利'],
    '合同': ['合同法', '契约', '协议', '合同效力', '合同履行', '合同解除'],
    '侵权': ['侵权责任', '损害赔偿', '过错责任', '无过错责任', '侵权行为'],
    '债权': ['债权债务', '债务', '债的关系', '债权人', '债务人'],
    
    // 刑法相关
    '抢劫': ['抢劫罪', '暴力', '威胁', '当场取财', '抢夺', '强取'],
    '转化': ['转化型抢劫', '事后抢劫', '准抢劫'],
    '事后转化': ['事后抢劫', '转化型抢劫', '准抢劫', '事后暴力'],
    '犯罪构成': ['犯罪主体', '犯罪客体', '犯罪主观', '犯罪客观', '构成要件'],
    '故意': ['故意犯罪', '直接故意', '间接故意', '犯罪故意'],
    '过失': ['过失犯罪', '疏忽大意', '过于自信'],
    '既遂': ['犯罪既遂', '犯罪完成'],
    '未遂': ['犯罪未遂', '犯罪中止', '犯罪预备'],
    '正当防卫': ['防卫过当', '紧急避险', '正当行为'],
    
    // 诉讼法相关
    '证据': ['证明', '举证', '质证', '认证'],
    '管辖': ['级别管辖', '地域管辖', '专属管辖'],
    '审判': ['一审', '二审', '再审', '审理'],
    
    // 行政法相关
    '行政处罚': ['处罚', '行政制裁', '行政责任'],
    '行政复议': ['复议', '行政救济'],
    '行政诉讼': ['告官', '民告官'],
  };

  // 处理知识导图关键词，提取核心概念
  static processKeyword(keyword) {
    console.log(`处理关键词: ${keyword}`);
    
    // 1. 清理格式标记
    const cleanedKeyword = keyword
      .replace(/^[\d]+[、．.]\s*/, '') // 去除开头的数字编号
      .replace(/^第[一二三四五六七八九十\d]+[章节条款]\s*/, '') // 去除章节标记
      .replace(/[（）()【】\[\]★]/g, '') // 去除括号和特殊符号
      .trim();
    
    // 2. 特别处理知识点描述（包含冒号或超长的描述）
    if (cleanedKeyword.includes('：') || cleanedKeyword.length > 20) {
      // 如果是"概念：详细描述"的格式，只提取概念部分
      const parts = cleanedKeyword.split(/[:：]/);
      if (parts.length > 1 && parts[0].length <= 10) {
        const coreKeywords = this.extractCoreKeywords(parts[0]);
        return {
          original: keyword,
          core: parts[0],
          keywords: coreKeywords.length > 0 ? coreKeywords : [parts[0]]
        };
      }
      
      // 如果描述太长，尝试提取核心法律术语
      const extractedTerms = this.extractLegalTermsFromLongText(cleanedKeyword);
      if (extractedTerms.length > 0) {
        return {
          original: keyword,
          core: extractedTerms[0], // 使用第一个提取的术语作为核心
          keywords: extractedTerms
        };
      }
      
      // 如果还是没有提取到有效术语，返回空结果
      return {
        original: keyword,
        core: cleanedKeyword,
        keywords: [] // 返回空数组，让搜索API处理
      };
    }
    
    // 3. 智能提取核心概念
    const coreKeywords = this.extractCoreKeywords(cleanedKeyword);
    
    const result = {
      original: keyword,
      core: cleanedKeyword,
      keywords: coreKeywords
    };
    
    console.log('关键词处理结果:', result);
    return result;
  }
  
  // 从长文本中提取法律术语
  static extractLegalTermsFromLongText(text) {
    const terms = [];
    
    // 定义要搜索的核心法律术语
    const coreTerms = [
      '抢劫罪', '盗窃罪', '诈骗罪', '侵占罪', '抢夺罪',
      '故意杀人罪', '故意伤害罪', '强奸罪', '绑架罪',
      '正当防卫', '紧急避险', '犯罪构成', '犯罪既遂', '犯罪未遂',
      '物权', '债权', '合同', '侵权', '继承',
      '婚姻', '家庭', '离婚', '抚养', '赡养'
    ];
    
    // 检查文本中是否包含这些术语
    for (const term of coreTerms) {
      if (text.includes(term)) {
        terms.push(term);
      }
    }
    
    // 如果没有找到完整术语，尝试提取部分关键词
    if (terms.length === 0) {
      const partialTerms = ['行为', '对象', '财产', '财物', '所有', '占有', '他人', '自己'];
      for (const term of partialTerms) {
        if (text.includes(term) && term.length >= 2) {
          // 对于部分术语，只有在明确相关时才添加
          if (term === '行为' && text.includes('行为对象')) {
            continue; // 跳过"行为对象"这种太宽泛的词
          }
          terms.push(term);
          break; // 只取第一个匹配的
        }
      }
    }
    
    return terms;
  }
  
  // 提取核心关键词
  static extractCoreKeywords(text) {
    const keywords = new Set();
    
    // 1. 直接法律术语匹配
    const legalTerms = [
      '盗窃罪', '侵占罪', '抢劫罪', '诈骗罪', '抢夺罪', '故意杀人罪', '故意伤害罪',
      '正当防卫', '紧急避险', '犯罪构成', '犯罪既遂', '犯罪未遂', '犯罪中止', '犯罪预备',
      '婚姻关系', '家庭关系', '财产继承', '合同效力', '合同履行', '侵权责任',
      '物权', '债权', '所有权', '用益物权', '担保物权',
      '转租', '租赁', '出租', '承租', '房屋租赁', '土地租赁'
    ];
    
    for (const term of legalTerms) {
      if (text.includes(term)) {
        keywords.add(term);
      }
    }
    
    // 2. 简化的概念提取
    const conceptPatterns = [
      { regex: /(.+罪)/, extract: 1 },
      { regex: /(婚姻|家庭|夫妻|配偶)/, extract: 1 },
      { regex: /(合同|协议|契约)/, extract: 1 },
      { regex: /(侵权|损害|赔偿)/, extract: 1 },
      { regex: /(继承|遗产|遗嘱)/, extract: 1 },
      { regex: /(物权|债权|所有权)/, extract: 1 },
      { regex: /(犯罪|故意|过失)/, extract: 1 },
      { regex: /(防卫|避险)/, extract: 1 }
    ];
    
    for (const pattern of conceptPatterns) {
      const match = text.match(pattern.regex);
      if (match && match[pattern.extract]) {
        keywords.add(match[pattern.extract]);
      }
    }
    
    // 3. 处理"与"字连接的概念（如"盗窃罪与侵占罪"）
    if (text.includes('与')) {
      const parts = text.split('与');
      for (const part of parts) {
        const trimmed = part.trim().replace(/的区分.*$/, ''); // 去除"的区分"等后缀
        if (trimmed.length >= 2) {
          // 如果包含"罪"，添加完整罪名
          if (trimmed.includes('罪')) {
            keywords.add(trimmed);
          } else if (trimmed.match(/(盗窃|侵占|抢劫|诈骗|抢夺)/)) {
            keywords.add(trimmed + '罪');
          } else if (trimmed.length >= 2) {
            keywords.add(trimmed);
          }
        }
      }
    }
    
    // 4. 处理特殊的法律术语组合
    const specialPatterns = [
      { regex: /事后.*抢劫/, keywords: ['抢劫罪', '转化抢劫'] },
      { regex: /转化.*抢劫/, keywords: ['抢劫罪', '转化抢劫'] },
      { regex: /.*防卫/, keywords: ['正当防卫'] },
      { regex: /.*避险/, keywords: ['紧急避险'] }
    ];
    
    for (const pattern of specialPatterns) {
      if (text.match(pattern.regex)) {
        pattern.keywords.forEach(kw => keywords.add(kw));
      }
    }
    
    // 5. 如果没有提取到关键词，使用原文本
    if (keywords.size === 0 && text.length >= 2) {
      keywords.add(text);
    }
    
    return Array.from(keywords);
  }
  
  // 智能分词（处理复合概念）
  static smartSegmentation(keyword) {
    const segments = [];
    
    // 1. 常见的法律复合词分割模式
    const patterns = [
      { regex: /(.+)(权利|义务|责任|关系|制度|原则)$/, groups: [1, 2] },
      { regex: /(.+)的(.+)/, groups: [1, 2] },
      { regex: /(法定|约定|合法|非法|有效|无效)(.+)/, groups: [1, 2] },
      // 刑法特殊模式
      { regex: /(事后|当场|预备|既遂|未遂)(.+)/, groups: [1, 2] },
      { regex: /(.+)(转化|抢劫|盗窃|诈骗|抢夺)/, groups: [1, 2] },
      // 处理数字+概念
      { regex: /^(\d+)(.+)/, groups: [2] }, // 只取概念部分
      // 处理括号内容
      { regex: /^[（(]?([一二三四五六七八九十\d]+)[）)]?(.+)/, groups: [2] },
    ];
    
    for (const pattern of patterns) {
      const match = keyword.match(pattern.regex);
      if (match) {
        pattern.groups.forEach(idx => {
          if (match[idx] && match[idx].length > 1) {
            segments.push(match[idx]);
          }
        });
      }
    }
    
    // 2. 基于字符长度的智能分割
    if (keyword.length >= 4) {
      // 尝试2字词分割
      for (let i = 0; i <= keyword.length - 2; i++) {
        const segment = keyword.substr(i, 2);
        if (this.isValidLegalTerm(segment)) {
          segments.push(segment);
        }
      }
      
      // 尝试3字词分割
      for (let i = 0; i <= keyword.length - 3; i++) {
        const segment = keyword.substr(i, 3);
        if (this.isValidLegalTerm(segment)) {
          segments.push(segment);
        }
      }
    }
    
    return [...new Set(segments)]; // 去重
  }
  
  // 判断是否为有效的法律术语
  static isValidLegalTerm(term) {
    const legalTerms = [
      '抢劫', '盗窃', '诈骗', '抢夺', '杀人', '伤害', '强奸', '绑架',
      '转化', '事后', '当场', '暴力', '威胁', '既遂', '未遂', '中止', '预备',
      '故意', '过失', '正当', '防卫', '避险', '犯罪', '构成', '主体', '客体',
      '婚姻', '家庭', '继承', '遗产', '合同', '物权', '债权', '侵权',
      '证据', '管辖', '审判', '诉讼', '复议', '处罚', '行政',
      '客观', '主观', '行为', '处分', '要件', '条件', '效力', '责任',
      '转租', '租赁', '出租', '承租', '租金', '租期', '租约'
    ];
    
    return legalTerms.includes(term) || term.length >= 2;
  }
  
  // 生成优化的搜索模式
  static generateSearchPatterns(originalKeyword, expandedKeywords) {
    const patterns = new Set();
    
    // 1. 原始关键词模式
    patterns.add(originalKeyword);
    
    // 2. 扩展关键词模式
    expandedKeywords.forEach(keyword => {
      patterns.add(keyword);
      
      // 添加常见的法律术语组合
      if (!keyword.includes('的') && !keyword.includes('之')) {
        patterns.add(`${keyword}的`);
        patterns.add(`关于${keyword}`);
        patterns.add(`${keyword}规定`);
        patterns.add(`${keyword}条款`);
      }
    });
    
    return Array.from(patterns);
  }
  
  // 批量处理关键词
  static processKeywords(keywords) {
    if (!Array.isArray(keywords)) {
      keywords = [keywords];
    }
    
    const allPatterns = new Set();
    const processedResults = [];
    
    for (const keyword of keywords) {
      const result = this.processKeyword(keyword);
      processedResults.push(result);
      result.searchPatterns.forEach(pattern => allPatterns.add(pattern));
    }
    
    return {
      original: keywords,
      patterns: Array.from(allPatterns),
      details: processedResults
    };
  }
}

// 导出默认实例
export default AIKeywordProcessor;