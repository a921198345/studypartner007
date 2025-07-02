import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { AIKeywordProcessor } from '@/lib/ai-keyword-processor';
import { verifyAuth } from '@/lib/auth-middleware';
import { checkMembership, logFeatureUsage } from '@/lib/membership-middleware';

// 定义精确法律术语列表
const PRECISE_LEGAL_TERMS = [
  // 刑法罪名
  '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗', '抢夺',
  '职务侵占', '挪用资金', '敲诈勒索', '贪污', '受贿', '行贿',
  '交通肇事', '危险驾驶', '绑架', '非法拘禁',
  // 刑法概念
  '犯罪构成', '犯罪主体', '犯罪客体', '犯罪主观方面', '犯罪客观方面',
  '正当防卫', '紧急避险', '共同犯罪', '犯罪中止', '犯罪未遂', '犯罪预备',
  // 民法概念
  '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权',
  '合同的订立', '合同的效力', '合同的履行', '合同的解除', '合同的变更',
  // 其他精确术语...
];

// 判断是否为精确法律术语
function isPreciseLegalTerm(keyword) {
  return PRECISE_LEGAL_TERMS.some(term => 
    term === keyword || 
    term + '罪' === keyword ||
    keyword === term + '罪'
  );
}

// 构建更精确的搜索条件，避免过度匹配
function buildPreciseSearchCondition(keyword) {
  // 清理关键词：去除序号、括号等格式标记
  const cleanKeyword = keyword
    .replace(/[（）()【】\[\]]/g, '') // 去除括号
    .replace(/[0-9]+[、\.]/g, '') // 去除序号
    .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
    .replace(/[:：]/g, '') // 去除冒号
    .trim();
  
  // 如果清理后的关键词为空，使用原关键词
  const searchKeyword = cleanKeyword || keyword;
  
  // 特别处理过长的知识点描述（如"行为对象：他人所有，犯罪人自己占用的财物"）
  // 如果关键词包含中文冒号或超过15个字符，说明是知识点描述而非搜索关键词
  if (searchKeyword.length > 15 || keyword.includes('：')) {
    // 提取核心概念词（通常是冒号前的部分）
    const coreConcept = keyword.split(/[:：]/)[0].trim();
    if (coreConcept && coreConcept.length <= 10) {
      // 只对核心概念进行精确搜索
      return {
        condition: `(question_text LIKE ? OR options_json LIKE ?)`,
        params: [`%${coreConcept}%`, `%${coreConcept}%`]
      };
    }
    // 如果连核心概念都太长，返回空结果
    return {
      condition: '1=0', // 永远为假的条件
      params: []
    };
  }
  
  // 特别处理数字+概念的组合（如"30婚姻家庭"）
  const numberConceptMatch = searchKeyword.match(/^(\d+)(.+)$/);
  if (numberConceptMatch) {
    const [, number, concept] = numberConceptMatch;
    // 只搜索核心概念部分
    return {
      condition: `(question_text LIKE ? OR options_json LIKE ?)`,
      params: [`%${concept}%`, `%${concept}%`]
    };
  }
  
  // 对于精确法律术语，添加罪名模式
  let patterns = [`%${searchKeyword}%`];
  if (isPreciseLegalTerm(searchKeyword)) {
    patterns.push(`%${searchKeyword}罪%`);
  }
  
  // 构建搜索条件：优先搜索题目和选项，不搜索解析
  const conditions = patterns.map(() => 'question_text LIKE ?').join(' OR ');
  const optConditions = patterns.map(() => 'options_json LIKE ?').join(' OR ');
  
  return {
    condition: `((${conditions}) OR (${optConditions}))`,
    params: [...patterns, ...patterns]
  };
}

export async function POST(request) {
  try {
    // 验证用户身份
    const auth_result = await verifyAuth(request);
    if (!auth_result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: '请先登录',
          requireAuth: true
        },
        { status: 401 }
      );
    }
    
    const user_id = auth_result.user.user_id;
    const is_member = checkMembership(auth_result.user);
    
    const body = await request.json();
    const { keywords, subject, year, questionType, page = 1, limit = 100 } = body;
    
    console.log('多关键词搜索API被调用:', {
      keywords,
      subject,
      year,
      questionType,
      page,
      limit,
      userId: user_id,
      isMember: is_member
    });
    
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({
        success: false,
        message: "请提供搜索关键词"
      }, { status: 400 });
    }
    
    // 检查年份限制：非会员只能查询2022年真题
    if (!is_member && year && year.length > 0 && !year.includes('all')) {
      const restricted_years = year.filter(y => y !== '2022');
      if (restricted_years.length > 0) {
        return NextResponse.json({
          success: false,
          message: `查看${restricted_years.join('、')}年真题需要升级会员`,
          upgradeRequired: true,
          availableYears: ['2022'],
          requestedYears: year
        }, { status: 403 });
      }
    }
    
    // 如果非会员没有指定年份，默认只查询2022年
    let filtered_year = year;
    if (!is_member && (!year || year.includes('all'))) {
      filtered_year = ['2022'];
      console.log('非会员用户，限制查询年份为:', filtered_year);
    }

    const connection = await pool.getConnection();
    
    try {
      // 基础查询条件
      let baseConditions = [];
      let baseParams = [];
      
      if (subject && subject !== 'all') {
        baseConditions.push('subject = ?');
        baseParams.push(subject);
      }
      
      if (filtered_year && filtered_year.length > 0 && !filtered_year.includes('all')) {
        const placeholders = filtered_year.map(() => '?').join(',');
        baseConditions.push(`year IN (${placeholders})`);
        baseParams.push(...filtered_year);
      }
      
      if (questionType) {
        if (questionType === '单选题') {
          baseConditions.push('question_type = 1');
        } else if (questionType === '多选题') {
          baseConditions.push('question_type = 2');
        }
      }
      
      // 对每个关键词进行搜索
      const allQuestions = [];
      const questionIds = new Set();
      
      console.log(`开始搜索 ${keywords.length} 个关键词`);
      
      // 使用AI提取核心关键词
      const processedResults = [];
      for (const keyword of keywords) {
        const processed = AIKeywordProcessor.processKeyword(keyword);
        processedResults.push(processed);
      }
      
      // 收集所有核心关键词
      const allCoreKeywords = new Set();
      processedResults.forEach(result => {
        result.keywords.forEach(kw => allCoreKeywords.add(kw));
      });
      
      const finalKeywords = Array.from(allCoreKeywords);
      console.log('AI提取的核心关键词:', finalKeywords);
      
      // 如果没有提取到任何有效关键词，直接返回空结果
      if (finalKeywords.length === 0) {
        console.log('没有提取到有效的搜索关键词，返回空结果');
        return NextResponse.json({
          success: true,
          message: "未找到相关题目",
          data: {
            questions: [],
            pagination: {
              total: 0,
              totalPages: 0,
              currentPage: 1,
              perPage: limit
            },
            keywords: keywords,
            debug: {
              message: '无法从关键词中提取有效的搜索词',
              original_keywords: keywords
            }
          }
        });
      }
      
      // 对每个核心关键词进行模糊匹配搜索
      for (const keyword of finalKeywords) {
        const conditions = [...baseConditions];
        const params = [...baseParams];
        
        // 使用改进的模糊搜索条件
        const searchResult = buildPreciseSearchCondition(keyword);
        
        // 如果搜索条件为假（比如1=0），跳过这个关键词
        if (searchResult.condition === '1=0' || searchResult.params.length === 0) {
          console.log(`跳过无效关键词: ${keyword}`);
          continue;
        }
        
        conditions.push(searchResult.condition);
        params.push(...searchResult.params);
        
        const whereClause = conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : '';
        
        const query = `
          SELECT 
            id, 
            question_code,
            subject, 
            year, 
            question_type,
            question_text, 
            options_json,
            correct_answer,
            explanation_text,
            CASE 
              WHEN question_text LIKE ? THEN 3
              WHEN options_json LIKE ? THEN 2
              WHEN explanation_text LIKE ? THEN 1
              ELSE 0
            END as relevance_score
          FROM questions 
          ${whereClause}
          ORDER BY relevance_score DESC, id
          LIMIT ?
        `;
        
        // 添加相关性评分参数（使用基本关键词匹配）
        const queryParams = [
          `%${keyword}%`,
          `%${keyword}%`, 
          `%${keyword}%`,
          ...params,
          200 // 每个关键词最多返回200条
        ];
        
        console.log(`搜索关键词 "${keyword}"`);
        const [questions] = await connection.execute(query, queryParams);
        console.log(`关键词 "${keyword}" 找到 ${questions.length} 条结果`);
        
        // 去重并添加到结果集
        questions.forEach(q => {
          if (!questionIds.has(q.id)) {
            questionIds.add(q.id);
            allQuestions.push({
              ...q,
              matched_keyword: keyword,
              original_keyword: keywords.join(', '),
              relevance_score: q.relevance_score
            });
          }
        });
      }
      
      // 按相关性排序
      allQuestions.sort((a, b) => b.relevance_score - a.relevance_score);
      
      console.log(`总共找到 ${allQuestions.length} 条不重复的题目`);
      
      // 分页处理
      const offset = (page - 1) * limit;
      const paginatedQuestions = allQuestions.slice(offset, offset + limit);
      
      console.log(`返回第 ${page} 页，每页 ${limit} 条，实际返回 ${paginatedQuestions.length} 条`);
      
      // 构建响应
      const response = {
        success: true,
        message: "搜索成功",
        data: {
          questions: paginatedQuestions.map(q => ({
            id: q.id,
            question_code: q.question_code,
            subject: q.subject,
            year: q.year,
            question_type: q.question_type === 1 ? "单选题" : "多选题",
            question_text: q.question_text,
            options: typeof q.options_json === 'string' 
              ? JSON.parse(q.options_json) 
              : q.options_json,
            correct_answer: q.correct_answer,
            explanation: q.explanation_text || "暂无解析",
            matched_keyword: q.matched_keyword,
            relevance_score: q.relevance_score
          })),
          pagination: {
            total: allQuestions.length,
            totalPages: Math.ceil(allQuestions.length / limit),
            currentPage: page,
            perPage: limit
          },
          keywords: keywords,
          debug: {
            total_before_dedup: allQuestions.length + questionIds.size - allQuestions.length,
            total_after_dedup: allQuestions.length
          }
        }
      };
      
      // 记录使用日志
      await logFeatureUsage(user_id, 'question_bank', 'search', JSON.stringify({
        keywords: keywords.slice(0, 3), // 只记录前3个关键词
        subject,
        year: filtered_year,
        results_count: allQuestions.length
      }));
      
      return NextResponse.json(response);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("搜索题目出错:", error);
    return NextResponse.json({
      success: false,
      message: "服务器错误，无法执行搜索",
      error: error.message
    }, { status: 500 });
  }
}