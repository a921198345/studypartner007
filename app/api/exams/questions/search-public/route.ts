import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 构建搜索条件
function buildSearchCondition(keyword) {
  // 清理关键词
  const cleanKeyword = keyword
    .replace(/[（）()【】\[\]]/g, '')
    .replace(/[0-9]+[、\.]/g, '')
    .replace(/[:：]/g, '')
    .trim();
  
  const searchKeyword = cleanKeyword || keyword;
  
  // 如果关键词太长，可能是描述而非搜索词
  if (searchKeyword.length > 15) {
    const coreConcept = keyword.split(/[:：]/)[0].trim();
    if (coreConcept && coreConcept.length <= 10) {
      return {
        condition: `(question_text LIKE ? OR options_json LIKE ?)`,
        params: [`%${coreConcept}%`, `%${coreConcept}%`]
      };
    }
    return {
      condition: '1=0',
      params: []
    };
  }
  
  return {
    condition: `(question_text LIKE ? OR options_json LIKE ?)`,
    params: [`%${searchKeyword}%`, `%${searchKeyword}%`]
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, subject, year, questionType, page = 1, limit = 100 } = body;
    
    console.log('公开搜索API被调用:', {
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
    
    // 公开搜索只允许查询2022年数据
    const allowed_year = ['2022'];
    
    const connection = await pool.getConnection();
    
    try {
      // 基础查询条件
      let baseConditions = [`year IN (${allowed_year.map(() => '?').join(',')})`];
      let baseParams = [...allowed_year];
      
      if (subject && subject !== 'all') {
        baseConditions.push('subject = ?');
        baseParams.push(subject);
      }
      
      if (questionType) {
        // MySQL 5.7兼容性：使用question_type字段而不是JSON_LENGTH
        baseConditions.push('question_type = ?');
        baseParams.push(questionType);
      }
      
      // 构建关键词搜索条件
      const searchConditions = [];
      const searchParams = [];
      
      for (const keyword of keywords) {
        const { condition, params } = buildSearchCondition(keyword);
        if (condition !== '1=0') {
          searchConditions.push(condition);
          searchParams.push(...params);
        }
      }
      
      if (searchConditions.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            questions: [],
            pagination: {
              total: 0,
              page: 1,
              limit: limit,
              totalPages: 0
            }
          },
          message: "未找到相关题目"
        });
      }
      
      // 组合所有条件
      const whereClause = `
        ${baseConditions.join(' AND ')} 
        AND (${searchConditions.join(' OR ')})
      `;
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM questions 
        WHERE ${whereClause}
      `;
      
      const [countResult] = await connection.execute(
        countQuery,
        [...baseParams, ...searchParams]
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      
      // 查询题目
      const query = `
        SELECT * FROM questions 
        WHERE ${whereClause}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `;
      
      const [questions] = await connection.execute(
        query,
        [...baseParams, ...searchParams, limit, offset]
      );
      
      // 处理题目数据
      const processed_questions = questions.map(q => ({
        ...q,
        options: JSON.parse(q.options_json || '[]'),
        tags: JSON.parse(q.tags_json || '[]'),
        knowledgePoints: JSON.parse(q.knowledge_points_json || '[]'),
        relatedLaws: JSON.parse(q.related_laws_json || '[]'),
        // 公开搜索只返回2022年题目，这些都是免费的
        memberOnly: false,
        accessible: true
      }));
      
      console.log(`公开搜索找到 ${total} 道题目，返回第 ${page} 页`);
      
      return NextResponse.json({
        success: true,
        data: {
          questions: processed_questions,
          pagination: {
            total,
            page,
            limit,
            totalPages
          },
          searchInfo: {
            keywords,
            allowedYears: allowed_year,
            isPublicSearch: true
          }
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('公开搜索API错误:', error);
    console.error('错误堆栈:', error.stack);
    return NextResponse.json({
      success: false,
      message: "搜索失败，请稍后再试",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, { status: 500 });
  }
}