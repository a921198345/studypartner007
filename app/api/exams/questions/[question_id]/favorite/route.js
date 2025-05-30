import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.ts';
import { pool } from '@/db';

export async function POST(request, { params }) {
  try {
    // 获取会话信息，确认用户已登录
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const questionId = params.question_id;
    
    // 检查该题目是否已经被收藏
    const connection = await pool.getConnection();
    
    try {
      const [favoriteCheckResult] = await connection.execute(
        `SELECT * FROM user_favorites WHERE user_id = ? AND question_id = ?`,
        [userId, questionId]
      );
      
      // 如果已收藏，则取消收藏
      if (favoriteCheckResult.length > 0) {
        await connection.execute(
          `DELETE FROM user_favorites WHERE user_id = ? AND question_id = ?`,
          [userId, questionId]
        );
        
        return NextResponse.json({
          success: true,
          message: '已取消收藏',
          data: { is_favorite: false }
        });
      } 
      // 如果未收藏，则添加收藏
      else {
        await connection.execute(
          `INSERT INTO user_favorites (user_id, question_id) VALUES (?, ?)`,
          [userId, questionId]
        );
        
        return NextResponse.json({
          success: true,
          message: '收藏成功',
          data: { is_favorite: true }
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('收藏题目出错:', error);
    return NextResponse.json(
      { success: false, message: '操作失败，请稍后再试' },
      { status: 500 }
    );
  }
} 