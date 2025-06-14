import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    
    // 如果没有用户ID也没有session_id，返回空结果
    if (!userId && !sessionId) {
      return NextResponse.json({
        success: true,
        message: "请提供session_id参数",
        data: {
          answers: [],
          total: 0
        }
      });
    }
    
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');
    
    // 构建查询
    let query = `
      SELECT 
        a.question_id, 
        a.submitted_answer,
        a.is_correct,
        a.created_at,
        q.question_type,
        q.correct_answer,
        q.explanation_text
      FROM user_answers a
      JOIN questions q ON a.question_id = q.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // 根据用户登录状态添加查询条件
    if (userId) {
      query += ` AND a.user_id = ?`;
      queryParams.push(userId);
    } else if (sessionId) {
      query += ` AND a.session_id = ?`;
      queryParams.push(sessionId);
    }
    
    // 添加筛选条件
    if (subject) {
      query += ` AND q.subject = ?`;
      queryParams.push(subject);
    }
    
    if (year) {
      query += ` AND q.year = ?`;
      queryParams.push(year);
    }
    
    // 按ID排序
    query += ` ORDER BY a.question_id ASC`;
    
    const connection = await pool.getConnection();
    
    try {
      const [historyResults] = await connection.execute(query, queryParams);
      
      // 格式化结果为前端易用的结构
      const answeredHistory = {};
      const correctHistory = {};
      const detailedResults = {};
      
      historyResults.forEach(record => {
        const questionId = record.question_id.toString();
        answeredHistory[questionId] = true;
        correctHistory[questionId] = record.is_correct === 1;
        
        // 为每个题目保存详细答题记录
        detailedResults[questionId] = {
          submittedAnswer: record.submitted_answer,
          isCorrect: record.is_correct === 1,
          correctAnswer: record.correct_answer,
          explanation: record.explanation_text || "暂无解析",
          questionType: record.question_type,
          answeredAt: record.created_at
        };
      });
      
      return NextResponse.json({
        success: true,
        data: {
          answered: answeredHistory,
          correct: correctHistory,
          results: detailedResults,
          totalAnswered: historyResults.length,
          totalCorrect: historyResults.filter(r => r.is_correct === 1).length,
          records: historyResults
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取答题历史失败:', error);
    return NextResponse.json(
      { success: false, message: '获取答题历史失败，请稍后再试' },
      { status: 500 }
    );
  }
} 