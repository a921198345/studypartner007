import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { headers } from 'next/headers';

// 获取客户端Session ID
function getClientSessionId() {
  const headersList = headers();
  const cookieHeader = headersList.get('cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/client_session_id=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1];
    }
  }
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST - 迁移localStorage中的数据到数据库
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const clientSessionId = getClientSessionId();
    const body = await request.json();
    
    const { sessions = [], currentSession = null, answerHistory = null } = body;
    
    const connection = await pool.getConnection();
    let migratedCount = 0;
    const errors = [];
    
    try {
      // 开始事务
      await connection.beginTransaction();
      
      // 1. 迁移历史会话
      for (const localSession of sessions) {
        try {
          // 检查会话是否已存在
          const [existing] = await connection.execute(
            'SELECT session_id FROM answer_sessions WHERE session_id = ?',
            [localSession.sessionId]
          );
          
          if (existing.length > 0) {
            console.log(`会话 ${localSession.sessionId} 已存在，跳过`);
            continue;
          }
          
          // 插入会话
          const userId = session?.user?.id || null;
          const years = localSession.filters?.years ? JSON.stringify(localSession.filters.years) : null;
          const questionTypes = localSession.filters?.types ? JSON.stringify(localSession.filters.types) : null;
          const filters = localSession.filters ? JSON.stringify(localSession.filters) : null;
          
          await connection.execute(
            `INSERT INTO answer_sessions (
              session_id, user_id, client_session_id, start_time, end_time,
              questions_answered, correct_count, total_questions, source,
              subject, years, question_types, search_keyword, last_question_id, filters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              localSession.sessionId,
              userId,
              clientSessionId,
              localSession.startTime ? new Date(localSession.startTime).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
              localSession.endTime ? new Date(localSession.endTime).toISOString().slice(0, 19).replace('T', ' ') : null,
              localSession.questionsAnswered || 0,
              localSession.correctCount || 0,
              localSession.totalQuestions || 0,
              localSession.source || 'all',
              localSession.subject || localSession.filters?.subject || null,
              years,
              questionTypes,
              localSession.filters?.search || null,
              localSession.lastQuestionId || null,
              filters
            ]
          );
          
          migratedCount++;
        } catch (error) {
          console.error(`迁移会话 ${localSession.sessionId} 失败:`, error);
          errors.push({
            sessionId: localSession.sessionId,
            error: error.message
          });
        }
      }
      
      // 2. 迁移当前会话（如果存在）
      if (currentSession && currentSession.sessionId) {
        try {
          // 检查是否已存在
          const [existing] = await connection.execute(
            'SELECT session_id FROM answer_sessions WHERE session_id = ?',
            [currentSession.sessionId]
          );
          
          if (existing.length === 0) {
            const userId = session?.user?.id || null;
            const years = currentSession.filters?.years ? JSON.stringify(currentSession.filters.years) : null;
            const questionTypes = currentSession.filters?.types ? JSON.stringify(currentSession.filters.types) : null;
            const filters = currentSession.filters ? JSON.stringify(currentSession.filters) : null;
            
            await connection.execute(
              `INSERT INTO answer_sessions (
                session_id, user_id, client_session_id, start_time,
                questions_answered, correct_count, total_questions, source,
                subject, years, question_types, search_keyword, last_question_id, filters
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                currentSession.sessionId,
                userId,
                clientSessionId,
                currentSession.startTime ? new Date(currentSession.startTime).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
                currentSession.questionsAnswered || 0,
                currentSession.correctCount || 0,
                currentSession.totalQuestions || 0,
                currentSession.source || 'all',
                currentSession.subject || currentSession.filters?.subject || null,
                years,
                questionTypes,
                currentSession.filters?.search || null,
                currentSession.lastQuestionId || null,
                filters
              ]
            );
            
            migratedCount++;
          }
        } catch (error) {
          console.error('迁移当前会话失败:', error);
          errors.push({
            sessionId: currentSession.sessionId,
            error: error.message
          });
        }
      }
      
      // 3. 如果有答题历史但没有会话记录，创建一个默认会话
      if (answerHistory && answerHistory.answered && Object.keys(answerHistory.answered).length > 0) {
        try {
          const defaultSessionId = 'migrated_' + Date.now();
          const answeredIds = Object.keys(answerHistory.answered).map(Number);
          const correctCount = Object.keys(answerHistory.correct || {}).filter(id => answerHistory.correct[id]).length;
          
          // 检查是否需要创建默认迁移会话
          const [existingMigrated] = await connection.execute(
            `SELECT session_id FROM answer_sessions 
             WHERE client_session_id = ? AND session_id LIKE 'migrated_%'
             ORDER BY created_at DESC LIMIT 1`,
            [clientSessionId]
          );
          
          if (existingMigrated.length === 0) {
            await connection.execute(
              `INSERT INTO answer_sessions (
                session_id, user_id, client_session_id, start_time,
                questions_answered, correct_count, source, last_question_id
              ) VALUES (?, ?, ?, NOW(), ?, ?, 'migrated', ?)`,
              [
                defaultSessionId,
                session?.user?.id || null,
                clientSessionId,
                answeredIds.length,
                correctCount,
                Math.max(...answeredIds)
              ]
            );
            
            migratedCount++;
          }
        } catch (error) {
          console.error('创建默认迁移会话失败:', error);
          errors.push({
            sessionId: 'default_migration',
            error: error.message
          });
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 返回结果
      const response = NextResponse.json({
        success: true,
        data: {
          migratedCount,
          errors: errors.length > 0 ? errors : undefined,
          clientSessionId
        }
      });
      
      // 设置客户端会话ID cookie
      response.cookies.set('client_session_id', clientSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 // 1年
      });
      
      return response;
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('迁移数据失败:', error);
    return NextResponse.json(
      { success: false, message: '迁移数据失败，请稍后再试' },
      { status: 500 }
    );
  }
}