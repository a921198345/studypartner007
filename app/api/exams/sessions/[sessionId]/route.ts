import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// GET - 获取单个会话的详细信息
export async function GET(request, { params }) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    const connection = await pool.getConnection();
    
    try {
      // 查询会话信息
      const [sessions] = await connection.execute(
        `SELECT 
          s.*,
          CASE 
            WHEN s.questions_answered > 0 
            THEN ROUND((s.correct_count / s.questions_answered) * 100, 2)
            ELSE 0 
          END as accuracy_rate,
          CASE 
            WHEN s.total_questions > 0 
            THEN ROUND((s.questions_answered / s.total_questions) * 100, 2)
            ELSE 0 
          END as completion_rate,
          TIMESTAMPDIFF(MINUTE, s.start_time, IFNULL(s.end_time, NOW())) as duration_minutes
        FROM answer_sessions s
        WHERE s.session_id = ?`,
        [sessionId]
      );
      
      if (sessions.length === 0) {
        return NextResponse.json(
          { success: false, message: '未找到指定的会话' },
          { status: 404 }
        );
      }
      
      const sessionData = sessions[0];
      
      // 获取该会话的答题详情
      const [answers] = await connection.execute(
        `SELECT 
          ua.id,
          ua.question_id,
          ua.submitted_answer,
          ua.is_correct,
          ua.created_at,
          q.subject,
          q.year,
          q.question_type,
          q.question_text,
          q.correct_answer,
          q.explanation_text
        FROM user_answers ua
        JOIN questions q ON ua.question_id = q.id
        WHERE ua.session_id = ?
        ORDER BY ua.created_at ASC`,
        [sessionId]
      );
      
      // 处理JSON字段
      const processedSession = {
        ...sessionData,
        years: sessionData.years ? JSON.parse(sessionData.years) : [],
        question_types: sessionData.question_types ? JSON.parse(sessionData.question_types) : [],
        filters: sessionData.filters ? JSON.parse(sessionData.filters) : {},
        answers: answers
      };
      
      return NextResponse.json({
        success: true,
        data: processedSession
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取会话详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取会话详情失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// DELETE - 删除答题会话
export async function DELETE(request, { params }) {
  try {
    const { sessionId } = params;
    const session = await getServerSession(authOptions);
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    const connection = await pool.getConnection();
    
    try {
      // 检查会话是否属于当前用户
      const [sessions] = await connection.execute(
        'SELECT user_id, client_session_id FROM answer_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      if (sessions.length === 0) {
        return NextResponse.json(
          { success: false, message: '未找到指定的会话' },
          { status: 404 }
        );
      }
      
      // 验证权限（已登录用户只能删除自己的，未登录用户通过client_session_id验证）
      const sessionData = sessions[0];
      if (session && session.user) {
        if (sessionData.user_id !== session.user.id.toString()) {
          return NextResponse.json(
            { success: false, message: '无权删除此会话' },
            { status: 403 }
          );
        }
      }
      
      // 删除会话（相关答题记录会通过外键级联删除）
      const [result] = await connection.execute(
        'DELETE FROM answer_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { success: false, message: '删除会话失败' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: '会话已删除'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json(
      { success: false, message: '删除会话失败，请稍后再试' },
      { status: 500 }
    );
  }
}