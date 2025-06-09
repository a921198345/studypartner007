import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/notes - 获取用户笔记列表
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE user_id = ? AND is_deleted = 0';
    const params = [session.user.id];

    if (category && category !== '全部') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM user_notes ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取笔记列表
    const [notes] = await db.execute(
      `SELECT note_id, title, LEFT(content, 200) as preview, category, is_pinned, created_at, updated_at
       FROM user_notes 
       ${whereClause}
       ORDER BY is_pinned DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 处理预览内容，去除HTML标签
    const processedNotes = notes.map(note => ({
      ...note,
      preview: note.preview.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
    }));

    return NextResponse.json({
      success: true,
      data: {
        notes: processedNotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取笔记列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/notes - 创建新笔记
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
    const { title, content, category = '未分类' } = body;

    // 验证必填字段
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, message: '笔记内容不能为空' },
        { status: 400 }
      );
    }

    // 验证标题长度
    if (title && title.length > 80) {
      return NextResponse.json(
        { success: false, message: '标题长度不能超过80个字符' },
        { status: 400 }
      );
    }

    // 创建笔记
    const [result] = await db.execute(
      `INSERT INTO user_notes (user_id, title, content, category) VALUES (?, ?, ?, ?)`,
      [session.user.id, title || '无标题笔记', content, category]
    );

    const noteId = result.insertId;

    // 返回新创建的笔记
    const [newNote] = await db.execute(
      `SELECT note_id, title, content, category, is_pinned, created_at, updated_at
       FROM user_notes WHERE note_id = ?`,
      [noteId]
    );

    return NextResponse.json({
      success: true,
      message: '笔记创建成功',
      data: newNote[0]
    });
  } catch (error) {
    console.error('创建笔记失败:', error);
    return NextResponse.json(
      { success: false, message: '创建笔记失败' },
      { status: 500 }
    );
  }
}