import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request) {
  try {
    // 获取会话信息，确认用户已登录
    const session = await getServerSession(authOptions);
    
    // 如果用户未登录，返回空的进度数据而不是401错误
    if (!session || !session.user) {
      return NextResponse.json({
        success: true,
        message: "未登录用户",
        data: {
          answered: [],
          total: 0
        }
      });
    }
    
    const userId = session.user.id;
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');
    const question_type = searchParams.get('question_type');
    
    // 构建查询
    let query = `
      SELECT question_id, created_at 
      FROM user_answers 
      WHERE user_id = ?
    `;
    
    const queryParams = [userId];
    
    // 添加筛选条件
    const filters = [];
    
    if (subject) {
      query += ` AND question_id IN (
        SELECT id FROM questions WHERE subject = ?
      )`;
      queryParams.push(subject);
    }
    
    if (year) {
      query += ` AND question_id IN (
        SELECT id FROM questions WHERE year = ?
      )`;
      queryParams.push(year);
    }
    
    if (question_type) {
      const questionTypeValue = question_type === '单选题' ? 1 : 2;
      query += ` AND question_id IN (
        SELECT id FROM questions WHERE question_type = ?
      )`;
      queryParams.push(questionTypeValue);
    }
    
    // 按时间倒序排列，获取最近做的题目
    query += ` ORDER BY created_at DESC LIMIT 1`;
    
    const connection = await pool.getConnection();
    
    try {
      const [progressResult] = await connection.execute(query, queryParams);
      
      if (progressResult.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            last_question_id: progressResult[0].question_id,
            last_practice_time: progressResult[0].created_at
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '没有找到练习记录'
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取练习进度失败:', error);
    return NextResponse.json(
      { success: false, message: '获取练习进度失败，请稍后再试' },
      { status: 500 }
    );
  }
} 