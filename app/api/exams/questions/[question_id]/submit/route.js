import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

// 格式化解析文本，清理多余空格和不规范换行
function formatExplanation(text) {
  if (!text) return "暂无解析";
  
  // 替换多个连续空格为单个空格
  let formatted = text.replace(/\s{2,}/g, ' ');
  
  // 替换多余的换行为单个换行
  formatted = formatted.replace(/\n{2,}/g, '\n');
  
  // 去除冒号后的空行
  formatted = formatted.replace(/:\s*\n+/g, ': ');
  
  // 去掉每行开头的多余空格
  formatted = formatted.replace(/^\s+/gm, '');
  
  // 清理"【答案】XX"格式，保留答案内容
  formatted = formatted.replace(/【答案】\s*([A-Z]+)/g, '正确答案: $1');
  
  // 按句号分段，提高可读性
  formatted = formatted.replace(/。\s*/g, '。\n');
  
  return formatted.trim();
}

// 比较答案函数
function compareAnswers(submitted, correct, questionType) {
  // 转换为大写以忽略大小写
  submitted = submitted.toUpperCase().trim();
  correct = correct.toUpperCase().trim();
  
  // 单选题直接比较
  if (questionType === 1) {
    return submitted === correct;
  }
  
  // 多选题比较 - 需要考虑答案选项可能不同顺序的情况
  if (questionType === 2) {
    // 将答案拆分为数组并排序
    const submittedOptions = submitted.split('').sort().join('');
    const correctOptions = correct.split('').sort().join('');
    return submittedOptions === correctOptions;
  }
  
  // 默认直接比较（兜底处理）
  return submitted === correct;
}

// 处理POST请求 - 用户提交答案
export async function POST(request, { params }) {
  try {
    // 获取题目ID
    const questionId = params.question_id;
    if (!questionId) {
      return NextResponse.json({
        success: false,
        message: "题目ID不能为空"
      }, { status: 400 });
    }

    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      return NextResponse.json({
        success: false,
        message: "无法连接到数据库，请检查数据库配置"
      }, { status: 500 });
    }

    // 解析请求体获取用户提交的答案
    const requestData = await request.json();
    const { submitted_answer, session_id } = requestData;

    if (!submitted_answer) {
      return NextResponse.json({
        success: false,
        message: "提交的答案不能为空"
      }, { status: 400 });
    }

    // 查询数据库获取题目信息
    const query = `
      SELECT 
        id, 
        question_text, 
        correct_answer, 
        explanation_text,
        question_type
      FROM questions 
      WHERE id = ?
    `;

    console.log("执行查询:", query);
    console.log("查询参数:", questionId);

    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(query, [questionId]);
      
      if (results.length === 0) {
        return NextResponse.json({
          success: false,
          message: "未找到指定ID的题目"
        }, { status: 404 });
      }

      const question = results[0];
      console.log("数据库返回的题目数据:", question);
      console.log("解析字段内容:", question.explanation_text);
      
      // 使用比较函数比较答案
      const isCorrect = compareAnswers(
        submitted_answer,
        question.correct_answer,
        question.question_type
      );
      
      // 记录用户答题历史
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id || null;
      
      try {
        // 无论是否登录都记录答题历史（使用会话ID关联）
        if (session_id) {
          console.log('准备插入答题记录，参数:', {
            userId: userId || null,
            session_id,
            questionId,
            submitted_answer,
            is_correct: isCorrect ? 1 : 0
          });
          
          const [insertResult] = await connection.execute(
            `INSERT INTO user_answers (user_id, session_id, question_id, submitted_answer, is_correct) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, session_id, questionId, submitted_answer, isCorrect ? 1 : 0]
          );
          
          console.log(`答题记录插入结果:`, insertResult);
          console.log(`答题记录已保存 - 用户: ${userId || '未登录'}, 会话: ${session_id}`);
          
          // 更新会话统计信息
          console.log('准备更新会话统计，参数:', {
            correct_increment: isCorrect ? 1 : 0,
            last_question_id: questionId,
            session_id
          });
          
          const [updateResult] = await connection.execute(
            `UPDATE answer_sessions 
             SET questions_answered = questions_answered + 1,
                 correct_count = correct_count + ?,
                 last_question_id = ?,
                 updated_at = NOW()
             WHERE session_id = ?`,
            [isCorrect ? 1 : 0, questionId, session_id]
          );
          
          console.log(`会话更新结果:`, updateResult);
        } else if (userId) {
          // 兼容旧的没有会话ID的情况
          await connection.execute(
            `INSERT INTO user_answers (user_id, session_id, question_id, submitted_answer, is_correct) 
             VALUES (?, NULL, ?, ?, ?)`,
            [userId, questionId, submitted_answer, isCorrect ? 1 : 0]
          );
          
          console.log(`用户 ${userId} 的答题记录已保存（无会话）`);
        }
      } catch (userRecordError) {
        console.error("保存答题记录失败 - 详细错误:", {
          error: userRecordError.message,
          code: userRecordError.code,
          sqlMessage: userRecordError.sqlMessage,
          sql: userRecordError.sql,
          stack: userRecordError.stack
        });
        // 不影响主流程，仅记录错误
      }
      
      // 格式化解析文本
      const formattedExplanation = formatExplanation(question.explanation_text);
      
      // 构建响应
      const response = {
        success: true,
        message: "答案提交成功",
        data: {
          is_correct: isCorrect,
          correct_answer: question.correct_answer,
          explanation: formattedExplanation,
          question_type: question.question_type
        }
      };
      
      return NextResponse.json(response);
    } finally {
      connection.release(); // 释放连接回池
    }
  } catch (error) {
    console.error("提交答案出错:", error);
    return NextResponse.json({
      success: false,
      message: "服务器错误，无法处理提交的答案",
      error: error.message
    }, { status: 500 });
  }
} 