import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  let connection;
  
  try {
    const body = await request.json()
    const {
      userId,
      planData,
      planType = 'generated' // 'generated' | 'manual' 
    } = body

    if (!planData) {
      return NextResponse.json(
        { success: false, error: '计划数据不能为空' },
        { status: 400 }
      )
    }

    connection = await pool.getConnection()

    // 检查是否存在该用户的计划，如果存在则更新，否则插入
    const [existingPlans] = await connection.execute(
      'SELECT id FROM study_plans WHERE user_id = ? OR session_id = ?',
      [userId || 'anonymous', request.headers.get('x-session-id') || 'default']
    )

    const planJson = JSON.stringify(planData)
    const sessionId = request.headers.get('x-session-id') || 'default'

    if (existingPlans.length > 0) {
      // 更新现有计划
      await connection.execute(
        `UPDATE study_plans 
         SET plan_data = ?, plan_type = ?, updated_at = NOW() 
         WHERE user_id = ? OR session_id = ?`,
        [planJson, planType, userId || 'anonymous', sessionId]
      )
    } else {
      // 插入新计划
      await connection.execute(
        `INSERT INTO study_plans (user_id, session_id, plan_data, plan_type, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [userId || 'anonymous', sessionId, planJson, planType]
      )
    }

    return NextResponse.json({
      success: true,
      message: '学习计划保存成功'
    })

  } catch (error) {
    console.error('Save study plan error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '保存学习计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function GET(request: Request) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = request.headers.get('x-session-id') || 'default'

    connection = await pool.getConnection()

    const [plans] = await connection.execute(
      'SELECT * FROM study_plans WHERE user_id = ? OR session_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId || 'anonymous', sessionId]
    )

    if (plans.length === 0) {
      return NextResponse.json({
        success: true,
        plan: null,
        message: '暂无学习计划'
      })
    }

    const plan = plans[0]
    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        planData: JSON.parse(plan.plan_data),
        planType: plan.plan_type,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      }
    })

  } catch (error) {
    console.error('Get study plan error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '获取学习计划失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}