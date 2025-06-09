import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/notes/trash - 获取回收站笔记列表
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 获取回收站中的笔记
    const [notes] = await db.execute(
      `SELECT note_id, title, category, deleted_at,
       DATEDIFF(DATE_ADD(deleted_at, INTERVAL 30 DAY), NOW()) as days_remaining
       FROM user_notes 
       WHERE user_id = ? AND is_deleted = 1
       ORDER BY deleted_at DESC`,
      [session.user.id]
    );

    // 过滤掉已经超过30天的笔记
    const validNotes = notes.filter(note => note.days_remaining > 0);

    return NextResponse.json({
      success: true,
      data: {
        notes: validNotes
      }
    });
  } catch (error) {
    console.error('获取回收站笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '获取回收站笔记失败' },
      { status: 500 }
    );
  }
}

// POST /api/notes/trash - 恢复笔记
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
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { success: false, message: '请提供笔记ID' },
        { status: 400 }
      );
    }

    // 验证笔记是否存在且在回收站中
    const [existingNote] = await db.execute(
      `SELECT note_id, deleted_at,
       DATEDIFF(DATE_ADD(deleted_at, INTERVAL 30 DAY), NOW()) as days_remaining
       FROM user_notes 
       WHERE note_id = ? AND user_id = ? AND is_deleted = 1`,
      [noteId, session.user.id]
    );

    if (existingNote.length === 0) {
      return NextResponse.json(
        { success: false, message: '笔记不存在或已恢复' },
        { status: 404 }
      );
    }

    if (existingNote[0].days_remaining <= 0) {
      return NextResponse.json(
        { success: false, message: '笔记已超过恢复期限' },
        { status: 400 }
      );
    }

    // 恢复笔记
    await db.execute(
      `UPDATE user_notes SET is_deleted = 0, deleted_at = NULL 
       WHERE note_id = ? AND user_id = ?`,
      [noteId, session.user.id]
    );

    return NextResponse.json({
      success: true,
      message: '笔记恢复成功'
    });
  } catch (error) {
    console.error('恢复笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '恢复笔记失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/trash - 清空回收站（永久删除超过30天的笔记）
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 删除超过30天的笔记
    const [result] = await db.execute(
      `DELETE FROM user_notes 
       WHERE user_id = ? AND is_deleted = 1 
       AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [session.user.id]
    );

    return NextResponse.json({
      success: true,
      message: `已清理${result.affectedRows}条过期笔记`
    });
  } catch (error) {
    console.error('清空回收站失败:', error);
    return NextResponse.json(
      { success: false, message: '清空回收站失败' },
      { status: 500 }
    );
  }
}