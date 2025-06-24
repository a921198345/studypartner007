import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getToken } from 'next-auth/jwt'

// 获取用户的学习计划历史
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const { searchParams } = new URL(request.url)
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // 筛选参数
    const status = searchParams.get('status') // active, completed, archived
    const planType = searchParams.get('type') // comprehensive, weekly, daily

    const connection = await pool.getConnection()

    try {
      // 构建查询条件
      let whereConditions = ['user_id = ?']
      let queryParams: any[] = [userId]

      if (status) {
        whereConditions.push('status = ?')
        queryParams.push(status)
      }

      if (planType) {
        whereConditions.push('plan_type = ?')
        queryParams.push(planType)
      }

      const whereClause = whereConditions.join(' AND ')

      // 查询总数
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM study_plans WHERE ${whereClause}`,
        queryParams
      )
      const total = (countResult as any)[0].total

      // 查询计划列表
      const [plans] = await connection.execute(
        `SELECT 
          id,
          plan_type,
          content,
          metadata,
          subjects_order,
          schedule_settings,
          total_hours,
          estimated_weeks,
          status,
          created_at,
          updated_at,
          completed_at
         FROM study_plans
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      )

      // 获取当前活跃计划
      const [activeResult] = await connection.execute(
        `SELECT active_plan_id FROM users WHERE id = ?`,
        [userId]
      )
      const activePlanId = (activeResult as any)[0]?.active_plan_id

      connection.release()

      // 处理返回数据
      const plansData = (plans as any[]).map(plan => {
        let content = {}
        let metadata = {}
        let subjects_order = []
        let schedule_settings = {}

        try {
          content = JSON.parse(plan.content || '{}')
          metadata = JSON.parse(plan.metadata || '{}')
          subjects_order = JSON.parse(plan.subjects_order || '[]')
          schedule_settings = JSON.parse(plan.schedule_settings || '{}')
        } catch (e) {
          console.error('Parse JSON error:', e)
        }

        return {
          id: plan.id,
          plan_type: plan.plan_type,
          is_active: plan.id === activePlanId,
          status: plan.status,
          total_hours: plan.total_hours,
          estimated_weeks: plan.estimated_weeks,
          subjects_order,
          schedule_settings,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
          completed_at: plan.completed_at,
          content,
          metadata
        }
      })

      return NextResponse.json({
        success: true,
        plans: plansData,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
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
    console.error('Get plan history error:', error)
    return NextResponse.json(
      { error: '获取计划历史失败' },
      { status: 500 }
    )
  }
}

// 获取特定计划的详情
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()
    const { plan_id } = body

    if (!plan_id) {
      return NextResponse.json(
        { error: '缺少计划ID' },
        { status: 400 }
      )
    }

    const connection = await pool.getConnection()

    try {
      // 查询计划详情
      const [plans] = await connection.execute(
        `SELECT 
          sp.*,
          u.active_plan_id
         FROM study_plans sp
         JOIN users u ON u.id = sp.user_id
         WHERE sp.id = ? AND sp.user_id = ?`,
        [plan_id, userId]
      )

      if (!plans || (plans as any[]).length === 0) {
        connection.release()
        return NextResponse.json(
          { error: '计划不存在' },
          { status: 404 }
        )
      }

      const plan = (plans as any[])[0]

      // 查询计划执行进度
      const [progress] = await connection.execute(
        `SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_days,
          SUM(actual_hours) as total_actual_hours,
          AVG(completion_rate) as avg_completion_rate
         FROM plan_daily_records
         WHERE plan_id = ?`,
        [plan_id]
      )

      const progressData = (progress as any[])[0]

      connection.release()

      // 解析JSON字段
      let content = {}
      let metadata = {}
      let subjects_order = []
      let schedule_settings = {}

      try {
        content = JSON.parse(plan.content || '{}')
        metadata = JSON.parse(plan.metadata || '{}')
        subjects_order = JSON.parse(plan.subjects_order || '[]')
        schedule_settings = JSON.parse(plan.schedule_settings || '{}')
      } catch (e) {
        console.error('Parse JSON error:', e)
      }

      return NextResponse.json({
        success: true,
        plan: {
          id: plan.id,
          plan_type: plan.plan_type,
          is_active: plan.id === plan.active_plan_id,
          status: plan.status,
          total_hours: plan.total_hours,
          estimated_weeks: plan.estimated_weeks,
          subjects_order,
          schedule_settings,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
          completed_at: plan.completed_at,
          content,
          metadata,
          progress: {
            total_days: progressData.total_days || 0,
            completed_days: progressData.completed_days || 0,
            total_actual_hours: progressData.total_actual_hours || 0,
            avg_completion_rate: progressData.avg_completion_rate || 0
          }
        }
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
    console.error('Get plan details error:', error)
    return NextResponse.json(
      { error: '获取计划详情失败' },
      { status: 500 }
    )
  }
}

// 更新计划状态
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()
    const { plan_id, action } = body

    if (!plan_id || !action) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const validActions = ['activate', 'complete', 'archive']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: '无效的操作' },
        { status: 400 }
      )
    }

    const connection = await pool.getConnection()

    try {
      // 开始事务
      await connection.beginTransaction()

      // 验证计划所有权
      const [plans] = await connection.execute(
        `SELECT id, status FROM study_plans WHERE id = ? AND user_id = ?`,
        [plan_id, userId]
      )

      if (!plans || (plans as any[]).length === 0) {
        await connection.rollback()
        connection.release()
        return NextResponse.json(
          { error: '计划不存在' },
          { status: 404 }
        )
      }

      const plan = (plans as any[])[0]

      // 根据操作更新状态
      if (action === 'activate') {
        // 先将其他计划设为非活跃
        await connection.execute(
          `UPDATE study_plans SET status = 'inactive' WHERE user_id = ? AND status = 'active'`,
          [userId]
        )

        // 激活选中的计划
        await connection.execute(
          `UPDATE study_plans SET status = 'active', updated_at = NOW() WHERE id = ?`,
          [plan_id]
        )

        // 更新用户的活跃计划
        await connection.execute(
          `UPDATE users SET active_plan_id = ? WHERE id = ?`,
          [plan_id, userId]
        )

      } else if (action === 'complete') {
        await connection.execute(
          `UPDATE study_plans 
           SET status = 'completed', completed_at = NOW(), updated_at = NOW() 
           WHERE id = ?`,
          [plan_id]
        )

        // 如果是当前活跃计划，清除用户的活跃计划ID
        await connection.execute(
          `UPDATE users SET active_plan_id = NULL WHERE id = ? AND active_plan_id = ?`,
          [userId, plan_id]
        )

      } else if (action === 'archive') {
        await connection.execute(
          `UPDATE study_plans 
           SET status = 'archived', updated_at = NOW() 
           WHERE id = ?`,
          [plan_id]
        )

        // 如果是当前活跃计划，清除用户的活跃计划ID
        await connection.execute(
          `UPDATE users SET active_plan_id = NULL WHERE id = ? AND active_plan_id = ?`,
          [userId, plan_id]
        )
      }

      await connection.commit()
      connection.release()

      return NextResponse.json({
        success: true,
        message: `计划已${action === 'activate' ? '激活' : action === 'complete' ? '完成' : '归档'}`
      })

    } catch (dbError) {
      await connection.rollback()
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Update plan status error:', error)
    return NextResponse.json(
      { error: '更新计划状态失败' },
      { status: 500 }
    )
  }
}

// 删除计划
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = token.sub
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('id')

    if (!planId) {
      return NextResponse.json(
        { error: '缺少计划ID' },
        { status: 400 }
      )
    }

    const connection = await pool.getConnection()

    try {
      // 验证计划所有权
      const [plans] = await connection.execute(
        `SELECT id FROM study_plans WHERE id = ? AND user_id = ? AND status = 'archived'`,
        [planId, userId]
      )

      if (!plans || (plans as any[]).length === 0) {
        connection.release()
        return NextResponse.json(
          { error: '只能删除已归档的计划' },
          { status: 403 }
        )
      }

      // 删除计划
      await connection.execute(
        `DELETE FROM study_plans WHERE id = ?`,
        [planId]
      )

      connection.release()

      return NextResponse.json({
        success: true,
        message: '计划已删除'
      })

    } catch (dbError) {
      connection.release()
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json(
      { error: '删除计划失败' },
      { status: 500 }
    )
  }
}