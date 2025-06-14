import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

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

// 构建更精确的搜索条件
function buildPreciseSearchCondition(keyword) {
  // 如果是精确法律术语，构建更严格的搜索条件
  if (isPreciseLegalTerm(keyword)) {
    // 对于精确术语，尝试匹配完整的词组
    // 添加空格、标点等边界来提高精确度
    const patterns = [
      `% ${keyword} %`,     // 前后都有空格
      `% ${keyword}，%`,    // 后面是逗号
      `% ${keyword}。%`,    // 后面是句号
      `% ${keyword}、%`,    // 后面是顿号
      `% ${keyword}？%`,    // 后面是问号
      `% ${keyword}"%`,     // 在引号中
      `%"${keyword}"%`,     // 完整引号
      `%（${keyword}）%`,   // 在括号中
      `%${keyword}罪%`,     // 罪名形式
      `%【${keyword}】%`,   // 在方括号中
      `%《${keyword}》%`,   // 在书名号中
    ];
    
    // 构建OR条件
    const conditions = patterns.map(() => 'question_text LIKE ?').join(' OR ');
    const expConditions = patterns.map(() => 'explanation_text LIKE ?').join(' OR ');
    
    return {
      condition: `((${conditions}) OR (${expConditions}))`,
      params: [...patterns, ...patterns]
    };
  } else {
    // 对于非精确术语，使用原有的LIKE匹配
    return {
      condition: '(question_text LIKE ? OR explanation_text LIKE ?)',
      params: [`%${keyword}%`, `%${keyword}%`]
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, subject, year, questionType, page = 1, limit = 100 } = body;
    
    console.log('多关键词搜索API被调用:', {
      keywords,
      subject,
      year,
      questionType,
      page,
      limit
    });
    
    if (!keywords || keywords.length === 0) {
      return NextResponse.json({
        success: false,
        message: "请提供搜索关键词"
      }, { status: 400 });
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
      
      if (year && year.length > 0 && !year.includes('all')) {
        const placeholders = year.map(() => '?').join(',');
        baseConditions.push(`year IN (${placeholders})`);
        baseParams.push(...year);
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
      
      for (const keyword of keywords) {
        const searchCondition = buildPreciseSearchCondition(keyword);
        
        const conditions = [...baseConditions, searchCondition.condition];
        const params = [...baseParams, ...searchCondition.params];
        
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
              WHEN question_text LIKE ? THEN 2
              WHEN explanation_text LIKE ? THEN 1
              ELSE 0
            END as relevance_score
          FROM questions 
          ${whereClause}
          ORDER BY relevance_score DESC, id
          LIMIT ?
        `;
        
        // 添加相关性评分参数
        const queryParams = [
          `%${keyword}%`,
          `%${keyword}%`,
          ...params,
          500 // 增加每个关键词的查询限制，确保能获取足够的结果
        ];
        
        console.log(`搜索关键词 "${keyword}"，条件:`, conditions);
        const [questions] = await connection.execute(query, queryParams);
        console.log(`关键词 "${keyword}" 找到 ${questions.length} 条结果`);
        
        // 去重并添加到结果集
        questions.forEach(q => {
          if (!questionIds.has(q.id)) {
            questionIds.add(q.id);
            allQuestions.push({
              ...q,
              matched_keyword: keyword,
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