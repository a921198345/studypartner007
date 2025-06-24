import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getToken } from 'next-auth/jwt'

// 获取用户学习偏好
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const connection = await pool.getConnection()

    try {
      // 查询用户偏好
      const [preferences] = await connection.execute(
        `SELECT 
          daily_hours,
          weekly_days,
          order_method,
          learning_style,
          difficulty_preference,
          review_frequency,
          created_at,
          updated_at
         FROM user_preferences
         WHERE user_id = ?`,
        [userId]
      )

      // 查询用户最近的学习记录
      const [recentProgress] = await connection.execute(
        `SELECT 
          subject,
          progress,
          status,
          chapters_completed,
          total_chapters,
          last_studied_at
         FROM user_subject_progress
         WHERE user_id = ?
         ORDER BY last_studied_at DESC`,
        [userId]
      )

      connection.release()

      const userPreferences = (preferences as any[])[0] || null
      const subjectsProgress = recentProgress as any[]

      return NextResponse.json({
        success: true,
        preferences: userPreferences || {
          daily_hours: 3,
          weekly_days: 5,
          order_method: 'manual',
          learning_style: null,
          difficulty_preference: null,
          review_frequency: null
        },
        subjects_progress: subjectsProgress
      })

    } catch (dbError) {
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '查询失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: '获取用户偏好失败' },
      { status: 500 }
    )
  }
}

// 更新用户学习偏好
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()

    // 验证输入
    const allowedFields = [
      'daily_hours',
      'weekly_days',
      'order_method',
      'learning_style',
      'difficulty_preference',
      'review_frequency'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body.hasOwnProperty(field)) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '没有要更新的字段' },
        { status: 400 }
      )
    }

    // 验证数值范围
    if (updates.daily_hours !== undefined) {
      if (updates.daily_hours < 1 || updates.daily_hours > 12) {
        return NextResponse.json(
          { error: '每日学习时间应在1-12小时之间' },
          { status: 400 }
        )
      }
    }

    if (updates.weekly_days !== undefined) {
      if (updates.weekly_days < 1 || updates.weekly_days > 7) {
        return NextResponse.json(
          { error: '每周学习天数应在1-7天之间' },
          { status: 400 }
        )
      }
    }

    const connection = await pool.getConnection()

    try {
      // 构建更新SQL
      const setClause = Object.keys(updates)
        .map(field => `${field} = ?`)
        .join(', ')
      
      const values = Object.values(updates)
      values.push(userId)

      // 更新或插入用户偏好
      await connection.execute(
        `INSERT INTO user_preferences (user_id, ${Object.keys(updates).join(', ')}, updated_at)
         VALUES (?, ${Object.keys(updates).map(() => '?').join(', ')}, NOW())
         ON DUPLICATE KEY UPDATE
         ${setClause}, updated_at = NOW()`,
        [userId, ...Object.values(updates), ...values]
      )

      connection.release()

      return NextResponse.json({
        success: true,
        message: '偏好设置已更新',
        preferences: updates
      })

    } catch (dbError) {
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: '更新用户偏好失败' },
      { status: 500 }
    )
  }
}

// 保存用户学习进度
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()
    const { subjects_progress } = body

    if (!subjects_progress || !Array.isArray(subjects_progress)) {
      return NextResponse.json(
        { error: '缺少科目进度信息' },
        { status: 400 }
      )
    }

    const connection = await pool.getConnection()

    try {
      // 开始事务
      await connection.beginTransaction()

      // 批量更新或插入科目进度
      for (const subject of subjects_progress) {
        await connection.execute(
          `INSERT INTO user_subject_progress 
           (user_id, subject, progress, status, chapters_completed, total_chapters, last_studied_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
           progress = VALUES(progress),
           status = VALUES(status),
           chapters_completed = VALUES(chapters_completed),
           total_chapters = VALUES(total_chapters),
           last_studied_at = NOW()`,
          [
            userId,
            subject.subject,
            subject.progress || 0,
            subject.status || 'not_started',
            subject.chapters_completed || 0,
            subject.total_chapters || 0
          ]
        )
      }

      await connection.commit()
      connection.release()

      return NextResponse.json({
        success: true,
        message: '学习进度已保存',
        updated_count: subjects_progress.length
      })

    } catch (dbError) {
      await connection.rollback()
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '保存进度失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Save progress error:', error)
    return NextResponse.json(
      { error: '保存学习进度失败' },
      { status: 500 }
    )
  }
}

// 重置用户偏好为默认值
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const connection = await pool.getConnection()

    try {
      // 删除用户偏好记录（将使用默认值）
      await connection.execute(
        `DELETE FROM user_preferences WHERE user_id = ?`,
        [userId]
      )

      connection.release()

      return NextResponse.json({
        success: true,
        message: '偏好已重置为默认值'
      })

    } catch (dbError) {
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '重置失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Reset preferences error:', error)
    return NextResponse.json(
      { error: '重置用户偏好失败' },
      { status: 500 }
    )
  }
}