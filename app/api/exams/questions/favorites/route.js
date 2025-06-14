import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request) {
  try {
    // 获取会话信息
    const session = await getServerSession(authOptions);
    
    // 如果用户未登录，返回空的收藏列表而不是401错误
    if (!session || !session.user) {
      return NextResponse.json({
        success: true,
        message: "未登录用户",
        data: {
          favorites: [],
          total: 0
        }
      });
    }
    
    const userId = session.user.id;
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const withDetails = searchParams.get('withDetails') === 'true';
    
    const connection = await pool.getConnection();
    
    try {
      // 查询用户收藏的题目
      let query = `
        SELECT q.id, q.question_code
        FROM user_favorites f
        JOIN questions q ON f.question_id = q.id
        WHERE f.user_id = ?
      `;

      // 如果需要完整题目信息，添加更多字段
      if (withDetails) {
        query = `
          SELECT 
            q.id, 
            q.question_code,
            q.subject, 
            q.year, 
            q.question_type, 
            q.question_text, 
            q.options_json,
            q.correct_answer,
            q.explanation_text
          FROM user_favorites f
          JOIN questions q ON f.question_id = q.id
          WHERE f.user_id = ?
          ORDER BY f.id DESC
        `;
      }
      
      // 执行查询
      const [favorites] = await connection.execute(query, [userId]);
      
      // 处理结果
      const favoriteQuestions = favorites.map(q => {
        // 基本信息
        const questionData = {
          id: q.id,
          question_code: q.question_code
        };
        
        // 如果请求了详细信息，添加更多字段
        if (withDetails) {
          let options = [];
          
          // 处理选项数据
          try {
            if (typeof q.options_json === 'string') {
              options = JSON.parse(q.options_json);
            } else if (q.options_json) {
              options = q.options_json;
            }
          } catch (err) {
            console.error("解析选项JSON出错:", err);
            // 格式化处理错误选项，创建默认值
            options = ['A', 'B', 'C', 'D'].map(key => ({ key, text: `选项${key} (数据错误)` }));
          }
          
          // 添加详细信息
          Object.assign(questionData, {
            subject: q.subject || '未知学科',
            year: q.year || '未知年份',
            question_type: q.question_type,
            question_text: q.question_text || '题目加载失败',
            options: options,
            correct_answer: q.correct_answer,
            explanation: q.explanation_text || '暂无解析'
          });
        }
        
        return questionData;
      });
      
      return NextResponse.json({
        success: true,
        message: "获取收藏题目成功",
        data: {
          favorites: favoriteQuestions,
          total: favoriteQuestions.length
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取收藏题目失败:', error);
    return NextResponse.json(
      { success: false, message: '获取收藏题目失败，请稍后再试' },
      { status: 500 }
    );
  }
} 