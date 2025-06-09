import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST /api/notes/save-from-ai - 从AI回答创建笔记
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question, answer, chatId, category = '未分类' } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, message: '问题和回答不能为空' },
        { status: 400 }
      );
    }

    // 构建笔记内容
    const title = question.length > 50 ? question.substring(0, 50) + '...' : question;
    const content = `
      <div class="ai-note">
        <div class="question">
          <h3>问题：</h3>
          <p>${question}</p>
        </div>
        <div class="answer">
          <h3>AI回答：</h3>
          <div>${answer}</div>
        </div>
        <div class="note-meta">
          <small>保存自AI问答 - ${new Date().toLocaleString('zh-CN')}</small>
        </div>
      </div>
    `;

    // 创建笔记
    const [result] = await db.execute(
      `INSERT INTO user_notes (user_id, title, content, category) VALUES (?, ?, ?, ?)`,
      [session.user.id, title, content, category]
    );

    const noteId = result.insertId;

    // 如果提供了chatId，创建关联
    if (chatId) {
      await db.execute(
        `INSERT INTO note_relations (note_id, relation_type, relation_id) VALUES (?, ?, ?)`,
        [noteId, 'ai_chat', chatId]
      );
    }

    // 返回新创建的笔记
    const [newNote] = await db.execute(
      `SELECT note_id, title, content, category, is_pinned, created_at, updated_at
       FROM user_notes WHERE note_id = ?`,
      [noteId]
    );

    return NextResponse.json({
      success: true,
      message: 'AI回答已保存为笔记',
      data: newNote[0]
    });
  } catch (error) {
    console.error('保存AI回答为笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '保存失败' },
      { status: 500 }
    );
  }
}