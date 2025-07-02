import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifyAuth } from '@/lib/auth-middleware';
import { checkNotesLimit, logFeatureUsage } from '@/lib/membership-middleware';

// POST /api/notes/save-from-ai - 从AI回答创建笔记
export async function POST(request) {
  try {
    // 首先尝试使用新的认证系统
    const auth_result = await verifyAuth(request);
    let user_id;
    
    if (auth_result.success) {
      user_id = auth_result.user.user_id;
    } else {
      // 如果新认证失败，尝试使用NextAuth session
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, message: '请先登录' },
          { status: 401 }
        );
      }
      user_id = session.user.id;
    }

    // 检查笔记数量限制
    const notes_limit = await checkNotesLimit(user_id);
    if (!notes_limit.canCreate) {
      return NextResponse.json({
        success: false,
        message: `非会员用户最多只能创建${notes_limit.limit}条笔记`,
        upgradeRequired: true,
        usage: {
          count: notes_limit.count,
          limit: notes_limit.limit
        }
      }, { status: 403 });
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
      [user_id, title, content, category]
    );

    const noteId = result.insertId;

    // 记录使用日志
    await logFeatureUsage(user_id, 'notes', 'save_from_ai', chatId || noteId.toString());

    // 如果提供了chatId，创建关联
    if (chatId) {
      try {
        await db.execute(
          `INSERT INTO note_relations (note_id, relation_type, relation_id) VALUES (?, ?, ?)`,
          [noteId, 'ai_chat', chatId]
        );
      } catch (relationError) {
        // 如果关联表不存在，忽略错误
        console.warn('创建笔记关联失败:', relationError.message);
      }
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