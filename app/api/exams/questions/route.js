import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 数据库连接配置 - 使用环境变量或默认值
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'law_app_user',
  password: process.env.DB_PASSWORD || 'pass@123',
  database: process.env.DB_NAME || 'law_exam_assistant',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000 // 连接超时时间设置为30秒
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

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
    // 新增参数: 获取所有ID和题号
    const fetchAllIdsAndCodes = searchParams.get('fetchAllIdsAndCodes') === 'true';
    
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
    
    // 组合WHERE子句
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
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
      const total = totalResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
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
        
        // 构建响应数据
        const response = {
          success: true,
          message: "获取所有题目ID和题号成功",
          data: {
            questions: allQuestions.map(q => ({
              id: q.id,
              question_code: q.question_code || null
            })),
            pagination: {
              total,
              totalItems: allQuestions.length
            }
          }
        };
        
        return NextResponse.json(response);
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
            options_json 
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
      
        // 构建响应数据
        const response = {
          success: true,
          message: "获取题目成功",
          data: {
            questions: questions.map(q => ({
              id: q.id,
              question_code: q.question_code,
              subject: q.subject,
              year: q.year,
              question_type: q.question_type,
              question_text: q.question_text,
              options: typeof q.options_json === 'string' 
                ? JSON.parse(q.options_json) 
                : q.options_json
            })),
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