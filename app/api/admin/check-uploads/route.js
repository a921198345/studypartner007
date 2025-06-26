import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') || '刑法';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // 查询指定学科的最新题目
    const questions = await query(
      `SELECT id, question_code, subject, year, question_text, options_json, correct_answer, explanation_text, question_type, created_at
       FROM questions 
       WHERE subject = ? 
       ORDER BY id DESC 
       LIMIT ?`,
      [subject, limit]
    );
    
    return NextResponse.json({
      success: true,
      count: questions.length,
      questions
    });
    
  } catch (error) {
    console.error('获取题目时出错:', error);
    return NextResponse.json(
      { error: '查询题目失败', details: error.message },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs'; 