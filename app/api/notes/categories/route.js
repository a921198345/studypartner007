import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/notes/categories - 获取用户的笔记分类列表
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 获取所有分类及其笔记数量
    const [categories] = await db.execute(
      `SELECT category, COUNT(*) as count
       FROM user_notes 
       WHERE user_id = ? AND is_deleted = 0
       GROUP BY category
       ORDER BY count DESC`,
      [session.user.id]
    );

    // 预定义的学科分类
    const predefinedCategories = [
      '刑法',
      '民法',
      '刑事诉讼法',
      '民事诉讼法',
      '行政法与行政诉讼法',
      '商经知',
      '三国法',
      '理论法',
      '其他',
      '未分类'
    ];

    // 合并预定义分类和用户自定义分类
    const categoryMap = new Map();
    
    // 先添加预定义分类
    predefinedCategories.forEach(cat => {
      categoryMap.set(cat, { category: cat, count: 0 });
    });
    
    // 更新实际的笔记数量
    categories.forEach(cat => {
      if (categoryMap.has(cat.category)) {
        categoryMap.get(cat.category).count = cat.count;
      } else {
        // 用户自定义的分类
        categoryMap.set(cat.category, cat);
      }
    });

    // 转换为数组并排序
    const allCategories = Array.from(categoryMap.values()).sort((a, b) => {
      // 有笔记的分类排在前面
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      // 按笔记数量排序
      return b.count - a.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: allCategories,
        total: categories.reduce((sum, cat) => sum + cat.count, 0)
      }
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取分类列表失败' },
      { status: 500 }
    );
  }
}