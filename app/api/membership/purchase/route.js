import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getConnection } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 会员套餐配置
const MEMBERSHIP_PLANS = {
  monthly: {
    name: '月度会员',
    price: 19.9,
    duration_months: 1,
    features: ['AI问答无限次数', '全部8大学科知识导图', '全年份历年真题', '无限笔记创建', 'AI督学功能']
  },
  quarterly: {
    name: '季度会员',
    price: 49.9,
    duration_months: 3,
    features: ['AI问答无限次数', '全部8大学科知识导图', '全年份历年真题', '无限笔记创建', 'AI督学功能', '智能学习计划调整']
  },
  yearly: {
    name: '年度会员',
    price: 159.9,
    duration_months: 12,
    features: ['AI问答无限次数', '全部8大学科知识导图', '全年份历年真题', '无限笔记创建', 'AI督学功能', '智能学习计划调整', '专属客服支持']
  }
};

export async function POST(request) {
  let connection;
  
  try {
    // 验证用户身份
    const auth_result = await verifyAuth(request);
    if (!auth_result.success) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }
    
    const user_id = auth_result.user.user_id;
    const body = await request.json();
    const { plan, payment_method = 'test' } = body;
    
    // 验证套餐
    if (!MEMBERSHIP_PLANS[plan]) {
      return NextResponse.json(
        { success: false, message: '无效的会员套餐' },
        { status: 400 }
      );
    }
    
    const plan_info = MEMBERSHIP_PLANS[plan];
    connection = await getConnection();
    
    // 生成订单ID
    const order_id = `order_${Date.now()}_${uuidv4().slice(0, 8)}`;
    
    // 计算会员期限
    const now = new Date();
    const start_date = now.toISOString().split('T')[0];
    
    // 获取用户当前会员状态
    const [users] = await connection.execute(
      'SELECT membership_type, membership_expires_at FROM users WHERE user_id = ?',
      [user_id]
    );
    
    let end_date;
    if (users.length > 0 && users[0].membership_type === 'active_member' && users[0].membership_expires_at) {
      // 如果用户已经是会员，在现有期限基础上延长
      const current_expires = new Date(users[0].membership_expires_at);
      if (current_expires > now) {
        end_date = new Date(current_expires);
      } else {
        end_date = new Date(now);
      }
    } else {
      // 新会员从今天开始
      end_date = new Date(now);
    }
    
    // 添加对应的月数
    end_date.setMonth(end_date.getMonth() + plan_info.duration_months);
    const end_date_str = end_date.toISOString().split('T')[0];
    
    // 创建订单记录
    await connection.execute(
      `INSERT INTO membership_orders 
       (order_id, user_id, membership_plan, price, payment_method, payment_status, 
        membership_start_date, membership_end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        user_id,
        plan,
        plan_info.price,
        payment_method,
        'pending',
        start_date,
        end_date_str
      ]
    );
    
    // 模拟支付处理
    if (payment_method === 'test') {
      // 在测试环境下，直接标记为支付成功
      await processPaymentSuccess(connection, order_id, user_id, end_date_str);
      
      return NextResponse.json({
        success: true,
        message: '支付成功！会员已激活',
        data: {
          order_id,
          plan: plan_info.name,
          price: plan_info.price,
          payment_status: 'paid',
          membership_end_date: end_date_str,
          features: plan_info.features
        }
      });
    } else {
      // 实际支付环境，返回支付链接或支付参数
      return NextResponse.json({
        success: true,
        message: '订单创建成功，请完成支付',
        data: {
          order_id,
          plan: plan_info.name,
          price: plan_info.price,
          payment_status: 'pending',
          payment_url: `/payment/${order_id}`, // 实际环境需要生成真实的支付链接
          expires_in: 30 * 60 // 30分钟支付有效期
        }
      });
    }
    
  } catch (error) {
    console.error('创建会员订单失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '创建订单失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 处理支付成功逻辑
async function processPaymentSuccess(connection, order_id, user_id, membership_end_date) {
  try {
    // 开始事务
    await connection.beginTransaction();
    
    // 更新订单状态
    await connection.execute(
      `UPDATE membership_orders 
       SET payment_status = 'paid', payment_time = NOW(), transaction_id = ? 
       WHERE order_id = ?`,
      [`test_txn_${Date.now()}`, order_id]
    );
    
    // 更新用户会员状态
    await connection.execute(
      `UPDATE users 
       SET membership_type = 'active_member', membership_expires_at = ? 
       WHERE user_id = ?`,
      [membership_end_date, user_id]
    );
    
    // 重置用户使用计数
    await connection.execute(
      'UPDATE users SET daily_ai_queries_used = 0 WHERE user_id = ?',
      [user_id]
    );
    
    // 提交事务
    await connection.commit();
    
    console.log(`用户 ${user_id} 会员支付成功，订单号：${order_id}`);
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    throw error;
  }
}

// GET方法：查询订单状态
export async function GET(request) {
  try {
    const auth_result = await verifyAuth(request);
    if (!auth_result.success) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');
    
    if (!order_id) {
      return NextResponse.json(
        { success: false, message: '缺少订单号' },
        { status: 400 }
      );
    }
    
    const connection = await getConnection();
    
    try {
      const [orders] = await connection.execute(
        `SELECT 
          order_id, membership_plan, price, payment_status, payment_time,
          membership_start_date, membership_end_date, created_at
         FROM membership_orders 
         WHERE order_id = ? AND user_id = ?`,
        [order_id, auth_result.user.user_id]
      );
      
      if (orders.length === 0) {
        return NextResponse.json(
          { success: false, message: '订单不存在' },
          { status: 404 }
        );
      }
      
      const order = orders[0];
      const plan_info = MEMBERSHIP_PLANS[order.membership_plan];
      
      return NextResponse.json({
        success: true,
        data: {
          ...order,
          plan_name: plan_info?.name || order.membership_plan,
          features: plan_info?.features || []
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('查询订单状态失败:', error);
    return NextResponse.json(
      { success: false, message: '查询订单失败' },
      { status: 500 }
    );
  }
}