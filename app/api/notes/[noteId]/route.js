import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/notes/[noteId] - 获取单个笔记详情
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const noteId = params.noteId;

    // 获取笔记详情
    const [notes] = await db.execute(
      `SELECT note_id, title, content, category, is_pinned, created_at, updated_at
       FROM user_notes 
       WHERE note_id = ? AND user_id = ? AND is_deleted = 0`,
      [noteId, session.user.id]
    );

    if (notes.length === 0) {
      return NextResponse.json(
        { success: false, message: '笔记不存在' },
        { status: 404 }
      );
    }

    // 获取关联信息
    const [relations] = await db.execute(
      `SELECT relation_type, relation_id 
       FROM note_relations 
       WHERE note_id = ?`,
      [noteId]
    );

    const noteData = {
      ...notes[0],
      relations: relations
    };

    return NextResponse.json({
      success: true,
      data: noteData
    });
  } catch (error) {
    console.error('获取笔记详情失败:', error);
    return NextResponse.json(
      { success: false, message: '获取笔记详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[noteId] - 更新笔记
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const noteId = params.noteId;
    const body = await request.json();
    const { title, content, category, is_pinned } = body;

    // 验证笔记所有权
    const [existingNote] = await db.execute(
      `SELECT note_id FROM user_notes 
       WHERE note_id = ? AND user_id = ? AND is_deleted = 0`,
      [noteId, session.user.id]
    );

    if (existingNote.length === 0) {
      return NextResponse.json(
        { success: false, message: '笔记不存在或无权修改' },
        { status: 404 }
      );
    }

    // 构建更新语句
    const updates = [];
    const values = [];

    if (title !== undefined) {
      if (title.length > 80) {
        return NextResponse.json(
          { success: false, message: '标题长度不能超过80个字符' },
          { status: 400 }
        );
      }
      updates.push('title = ?');
      values.push(title);
    }

    if (content !== undefined) {
      if (!content || content.trim() === '') {
        return NextResponse.json(
          { success: false, message: '笔记内容不能为空' },
          { status: 400 }
        );
      }
      updates.push('content = ?');
      values.push(content);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }

    if (is_pinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(is_pinned ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有要更新的内容' },
        { status: 400 }
      );
    }

    // 更新笔记
    values.push(noteId, session.user.id);
    await db.execute(
      `UPDATE user_notes SET ${updates.join(', ')} 
       WHERE note_id = ? AND user_id = ?`,
      values
    );

    // 返回更新后的笔记
    const [updatedNote] = await db.execute(
      `SELECT note_id, title, content, category, is_pinned, created_at, updated_at
       FROM user_notes WHERE note_id = ?`,
      [noteId]
    );

    return NextResponse.json({
      success: true,
      message: '笔记更新成功',
      data: updatedNote[0]
    });
  } catch (error) {
    console.error('更新笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '更新笔记失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[noteId] - 删除笔记（软删除）
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const noteId = params.noteId;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // 验证笔记所有权
    const [existingNote] = await db.execute(
      `SELECT note_id, is_deleted FROM user_notes 
       WHERE note_id = ? AND user_id = ?`,
      [noteId, session.user.id]
    );

    if (existingNote.length === 0) {
      return NextResponse.json(
        { success: false, message: '笔记不存在或无权删除' },
        { status: 404 }
      );
    }

    if (permanent) {
      // 永久删除
      await db.execute(
        `DELETE FROM user_notes WHERE note_id = ? AND user_id = ?`,
        [noteId, session.user.id]
      );

      return NextResponse.json({
        success: true,
        message: '笔记已永久删除'
      });
    } else {
      // 软删除
      await db.execute(
        `UPDATE user_notes SET is_deleted = 1, deleted_at = NOW() 
         WHERE note_id = ? AND user_id = ?`,
        [noteId, session.user.id]
      );

      return NextResponse.json({
        success: true,
        message: '笔记已移至回收站'
      });
    }
  } catch (error) {
    console.error('删除笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '删除笔记失败' },
      { status: 500 }
    );
  }
}