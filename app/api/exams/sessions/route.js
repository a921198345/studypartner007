import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { headers } from 'next/headers';

// 获取客户端Session ID
function getClientSessionId(request) {
  const headersList = headers();
  
  // 1. 先从请求头获取（前端通过 X-Client-Session-Id 传递）
  const clientSessionHeader = headersList.get('x-client-session-id');
  if (clientSessionHeader) {
    console.log('从请求头获取客户端会话ID:', clientSessionHeader);
    return clientSessionHeader;
  }
  
  // 2. 从cookie获取
  const cookieHeader = headersList.get('cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/client_session_id=([^;]+)/);
    if (sessionMatch) {
      console.log('从Cookie获取客户端会话ID:', sessionMatch[1]);
      return sessionMatch[1];
    }
  }
  
  // 3. 从查询参数获取（备用）
  if (request) {
    try {
      const { searchParams } = new URL(request.url);
      const urlSessionId = searchParams.get('client_session_id');
      if (urlSessionId) {
        console.log('从URL参数获取客户端会话ID:', urlSessionId);
        return urlSessionId;
      }
    } catch (e) {
      // 忽略URL解析错误
    }
  }
  
  // 4. 生成新的ID（只在确实没有的情况下）
  const newSessionId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('生成新的客户端会话ID:', newSessionId);
  return newSessionId;
}

// GET - 获取用户的答题会话列表
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const clientSessionId = getClientSessionId(request);
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // 构建查询条件
    let whereClause = '';
    let queryParams = [];
    
    if (session && session.user) {
      whereClause = 'WHERE user_id = ?';
      queryParams.push(session.user.id);
    } else {
      whereClause = 'WHERE client_session_id = ?';
      queryParams.push(clientSessionId);
    }
    
    // 查询会话列表
    const query = `
      SELECT 
        session_id,
        user_id,
        client_session_id,
        start_time,
        end_time,
        questions_answered,
        correct_count,
        total_questions,
        source,
        subject,
        years,
        question_types,
        search_keyword,
        last_question_id,
        filters,
        CASE 
          WHEN questions_answered > 0 
          THEN ROUND((correct_count / questions_answered) * 100, 2)
          ELSE 0 
        END as accuracy_rate,
        CASE 
          WHEN total_questions > 0 
          THEN ROUND((questions_answered / total_questions) * 100, 2)
          ELSE 0 
        END as completion_rate
      FROM answer_sessions
      ${whereClause}
      AND questions_answered > 0
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(limit, offset);
    
    const connection = await pool.getConnection();
    
    try {
      const [sessions] = await connection.execute(query, queryParams);
      
      // 处理JSON字段
      const processedSessions = sessions.map(session => {
        try {
          return {
            ...session,
            years: session.years ? (typeof session.years === 'string' ? JSON.parse(session.years) : session.years) : [],
            question_types: session.question_types ? (typeof session.question_types === 'string' ? JSON.parse(session.question_types) : session.question_types) : [],
            filters: session.filters ? (typeof session.filters === 'string' ? JSON.parse(session.filters) : session.filters) : {}
          };
        } catch (error) {
          console.error(`处理会话 ${session.session_id} 的JSON数据失败:`, error);
          // 返回原始数据，避免整个请求失败
          return {
            ...session,
            years: [],
            question_types: [],
            filters: {}
          };
        }
      });
      
      console.log(`获取答题会话 - clientSessionId: ${clientSessionId}, 找到 ${processedSessions.length} 个会话`);
      
      return NextResponse.json({
        success: true,
        data: {
          sessions: processedSessions,
          clientSessionId: clientSessionId
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取答题会话失败:', error);
    return NextResponse.json(
      { success: false, message: '获取答题会话失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// POST - 创建新的答题会话
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const clientSessionId = getClientSessionId(request);
    const body = await request.json();
    
    const {
      filters = {},
      totalQuestions = 0,
      source = 'all'
    } = body;
    
    // 生成会话ID
    const sessionId = Date.now().toString();
    
    // 准备数据
    const userId = session?.user?.id || null;
    const subject = filters.subject || null;
    const years = filters.years && filters.years.length > 0 ? JSON.stringify(filters.years) : null;
    const questionTypes = filters.types && filters.types.length > 0 ? JSON.stringify(filters.types) : null;
    const searchKeyword = filters.search || null;
    const filtersJson = JSON.stringify(filters);
    
    const connection = await pool.getConnection();
    
    try {
      // 插入新会话
      const insertQuery = `
        INSERT INTO answer_sessions (
          session_id, user_id, client_session_id, total_questions, 
          source, subject, years, question_types, search_keyword, 
          filters, start_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await connection.execute(insertQuery, [
        sessionId, userId, clientSessionId, totalQuestions,
        source, subject, years, questionTypes, searchKeyword,
        filtersJson
      ]);
      
      // 返回创建的会话信息
      const [newSession] = await connection.execute(
        'SELECT * FROM answer_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      // 设置cookie
      const response = NextResponse.json({
        success: true,
        data: {
          sessionId,
          session: newSession[0]
        }
      });
      
      // 设置客户端会话ID cookie（1年有效期）
      response.cookies.set('client_session_id', clientSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 // 1年
      });
      
      return response;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建答题会话失败:', error);
    return NextResponse.json(
      { success: false, message: '创建答题会话失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// PUT - 更新答题会话
export async function PUT(request) {
  try {
    const body = await request.json();
    const { sessionId, updates } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    const connection = await pool.getConnection();
    
    try {
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      
      if (updates.questionsAnswered !== undefined) {
        updateFields.push('questions_answered = ?');
        updateValues.push(updates.questionsAnswered);
      }
      
      if (updates.correctCount !== undefined) {
        updateFields.push('correct_count = ?');
        updateValues.push(updates.correctCount);
      }
      
      if (updates.lastQuestionId !== undefined) {
        updateFields.push('last_question_id = ?');
        updateValues.push(updates.lastQuestionId);
      }
      
      if (updates.endTime !== undefined) {
        updateFields.push('end_time = ?');
        updateValues.push(updates.endTime ? new Date(updates.endTime).toISOString().slice(0, 19).replace('T', ' ') : null);
      }
      
      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, message: '没有要更新的字段' },
          { status: 400 }
        );
      }
      
      // 执行更新
      const updateQuery = `
        UPDATE answer_sessions 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE session_id = ?
      `;
      
      updateValues.push(sessionId);
      
      const [result] = await connection.execute(updateQuery, updateValues);
      
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { success: false, message: '未找到指定的会话' },
          { status: 404 }
        );
      }
      
      // 返回更新后的会话
      const [updatedSession] = await connection.execute(
        'SELECT * FROM answer_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      return NextResponse.json({
        success: true,
        data: {
          session: updatedSession[0]
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新答题会话失败:', error);
    return NextResponse.json(
      { success: false, message: '更新答题会话失败，请稍后再试' },
      { status: 500 }
    );
  }
}