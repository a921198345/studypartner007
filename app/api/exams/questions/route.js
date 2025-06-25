import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isPreciseLegalTerm, filterRelevantQuestions, sortQuestionsByRelevance } from '@/lib/search-utils';

// 简单测试连接函数
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('数据库连接成功！');
    return true;
  } catch (err) {
    console.error('数据库连接失败:', err);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// 处理GET请求
export async function GET(request) {
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      return NextResponse.json({
        success: false,
        message: "无法连接到数据库，请检查数据库配置"
      }, { status: 500 });
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const yearParam = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const questionType = searchParams.get('question_type');
    const searchQuery = searchParams.get('search'); // 新增搜索参数
    // 新增参数: 获取所有ID和题号
    const fetchAllIdsAndCodes = searchParams.get('fetchAllIdsAndCodes') === 'true';
    // 新增参数: 获取所有题目总数，不受筛选条件影响
    const getAllCount = searchParams.get('getAllCount') === 'true';
    
    // 调试日志
    console.log('API收到的搜索参数:', {
      subject,
      yearParam,
      questionType,
      searchQuery,
      fetchAllIdsAndCodes,
      getAllCount,
      url: request.url
    });
    
    // 如果只是要获取所有题目总数，直接返回
    if (getAllCount) {
      const connection = await pool.getConnection();
      try {
        const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM questions');
        const totalCount = totalResult[0]?.total || 0;
        console.log(`获取所有题目总数: ${totalCount}`);
        
        return NextResponse.json({
          success: true,
          data: {
            pagination: {
              total: totalCount,
              page: 1,
              limit: 1,
              totalPages: Math.ceil(totalCount / limit)
            },
            questions: [] // 不返回具体题目数据
          }
        });
      } catch (error) {
        console.error('获取所有题目总数失败:', error);
        return NextResponse.json({
          success: false,
          message: "获取题目总数失败",
          data: { total: 0 }
        }, { status: 500 });
      } finally {
        connection.release();
      }
    }
    
    // 计算偏移量
    const offset = (page - 1) * limit;
    
    // 构建SQL查询条件
    let conditions = [];
    let params = [];
    
    if (subject) {
      conditions.push('subject = ?');
      params.push(subject);
    }
    
    // 处理年份参数
    if (yearParam) {
      // 检查是否有多个年份（逗号分隔）
      if (yearParam.includes(',')) {
        const years = yearParam.split(',').map(y => y.trim()).filter(Boolean);
        if (years.length > 0) {
          const placeholders = years.map(() => '?').join(',');
          conditions.push(`year IN (${placeholders})`);
          params.push(...years);
        }
      } else {
        // 单个年份
      conditions.push('year = ?');
        params.push(yearParam);
      }
    }
    
    // 处理题目类型参数
    if (questionType) {
      if (questionType === '单选题') {
        conditions.push('question_type = 1');
      } else if (questionType === '多选题') {
        conditions.push('question_type = 2');
      }
    }
    
    // 处理搜索参数
    if (searchQuery && searchQuery.trim()) {
      const keyword = searchQuery.trim();
      
      // 精确法律术语列表
      const preciseLegalTerms = [
        '故意杀人', '故意伤害', '强奸', '抢劫', '盗窃', '诈骗', '抢夺',
        '职务侵占', '挪用资金', '敲诈勒索', '贪污', '受贿', '行贿',
        '交通肇事', '危险驾驶', '绑架', '非法拘禁',
        '正当防卫', '紧急避险', '共同犯罪', '犯罪中止', '犯罪未遂', '犯罪预备',
        '合同的保全', '代位权', '撤销权', '债权人代位权', '债权人撤销权'
      ];
      
      // 判断是否为精确法律术语
      const isPreciseTerm = preciseLegalTerms.some(term => 
        term === keyword || 
        term + '罪' === keyword ||
        keyword === term + '罪'
      );
      
      if (isPreciseTerm) {
        // 对于精确术语，构建更严格的搜索条件
        const searchConditions = [];
        const searchParams = [];
        
        // 添加各种可能的匹配模式
        const patterns = [
          `%${keyword}%`,           // 基本匹配
          `% ${keyword} %`,         // 前后有空格
          `%${keyword}，%`,         // 后面是逗号
          `%${keyword}。%`,         // 后面是句号
          `%${keyword}？%`,         // 后面是问号
          `%${keyword}、%`,         // 后面是顿号
          `%"${keyword}"%`,         // 在引号中
          `%（${keyword}）%`,       // 在括号中
          `%【${keyword}】%`,       // 在方括号中
          `%${keyword}罪%`          // 罪名形式
        ];
        
        // 对题目文本和选项进行精确匹配
        const questionConditions = patterns.map(() => 'question_text LIKE ?').join(' OR ');
        const optionsConditions = patterns.map(() => 'options_json LIKE ?').join(' OR ');
        searchConditions.push(`(${questionConditions} OR ${optionsConditions})`);
        searchParams.push(...patterns, ...patterns);  // 两次patterns，分别用于question_text和options_json
        
        conditions.push(`(${searchConditions.join(' OR ')})`);
        params.push(...searchParams);
      } else {
        // 对于非精确术语，在题干和选项中搜索
        conditions.push('(question_text LIKE ? OR options_json LIKE ?)');
        const searchPattern = `%${keyword}%`;
        params.push(searchPattern, searchPattern);
      }
    }
    
    // 组合WHERE子句
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    // 调试日志
    console.log('构建的WHERE条件:', conditions);
    console.log('WHERE子句:', whereClause);
    console.log('查询参数:', params);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM questions 
      ${whereClause}
    `;
    
    // 连接数据库
    const connection = await pool.getConnection();
    
    try {
      // 获取总数
      const [totalResult] = await connection.execute(countQuery, params);
      let total = totalResult[0]?.total || 0;
      let totalPages = Math.ceil(total / limit);
      
      // 根据fetchAllIdsAndCodes参数决定返回方式
      if (fetchAllIdsAndCodes) {
        // 如果需要获取全部ID和题号，执行不分页的查询
        console.log('请求获取所有题目ID和题号，不分页');
        
        const allIdsQuery = `
          SELECT 
            id, 
            question_code
          FROM questions 
          ${whereClause} 
          ORDER BY id
        `;
        
        console.log('执行SQL查询:', allIdsQuery);
        console.log('参数:', params);
        
        const [allQuestions] = await connection.execute(allIdsQuery, params);
        
        console.log(`查询到 ${allQuestions.length} 条记录，共 ${total} 条记录`);
        
        // 返回所有题目的ID和题号
        return NextResponse.json({
          success: true,
          data: {
            questions: allQuestions,
            pagination: {
              total: total,
              actualTotal: total,
              page: 1,
              limit: allQuestions.length,
              totalPages: 1
            }
          }
        });
      } else {
        // 正常分页查询
    const dataQuery = `
      SELECT 
        id, 
        question_code,
        subject, 
        year, 
        question_type,
        question_text, 
        options_json,
        correct_answer,
        explanation_text
      FROM questions 
      ${whereClause} 
      ORDER BY id 
      LIMIT ? OFFSET ?
    `;
        
        console.log('执行SQL查询:', dataQuery);
        console.log('参数:', [...params, limit, offset]);
    
    // 添加分页参数
        const queryParams = [...params, limit, offset];
        const [questions] = await connection.execute(dataQuery, queryParams);
    
        console.log(`查询到 ${questions.length} 条记录，共 ${total} 条记录`);
        
        // 格式化题目数据
        let formattedQuestions = questions.map(q => ({
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
          explanation: q.explanation_text || "暂无解析"
        }));
        
        // 暂时禁用二次筛选，保持与多关键词搜索API一致
        // if (searchQuery && isPreciseLegalTerm(searchQuery.trim())) {
        //   console.log(`对精确术语 "${searchQuery}" 进行二次筛选`);
        //   const beforeFilter = formattedQuestions.length;
        //   formattedQuestions = filterRelevantQuestions(formattedQuestions, searchQuery.trim());
        //   formattedQuestions = sortQuestionsByRelevance(formattedQuestions, searchQuery.trim());
        //   console.log(`筛选前: ${beforeFilter} 条，筛选后: ${formattedQuestions.length} 条`);
        //   
        //   // 更新总数和分页信息
        //   total = formattedQuestions.length;
        //   totalPages = Math.ceil(total / limit);
        // }
    
    // 构建响应数据
    const response = {
      success: true,
      message: "获取题目成功",
      data: {
        questions: formattedQuestions,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          perPage: limit
        }
      }
    };
    
    // 返回响应
        return NextResponse.json(response);
      }
    } finally {
      connection.release(); // 释放连接回池
    }
  } catch (error) {
    console.error("获取题目出错:", error);
    return NextResponse.json({
      success: false,
      message: "服务器错误，无法获取题目",
      error: error.message
    }, { status: 500 });
  }
}