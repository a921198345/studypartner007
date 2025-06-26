import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// 支付成功回调处理
export async function POST(request) {
  let connection;
  
  try {
    const body = await request.json();
    const { 
      order_id, 
      transaction_id, 
      payment_status, 
      payment_method,
      payment_time,
      // 可以添加更多支付平台的参数
      alipay_trade_no,
      wechat_transaction_id 
    } = body;
    
    console.log('收到支付回调:', {
      order_id,
      payment_status,
      payment_method,
      transaction_id: transaction_id || alipay_trade_no || wechat_transaction_id
    });
    
    if (!order_id || !payment_status) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    connection = await getConnection();
    
    // 查询订单信息
    const [orders] = await connection.execute(
      'SELECT user_id, membership_plan, membership_end_date, payment_status FROM membership_orders WHERE order_id = ?',
      [order_id]
    );
    
    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, message: '订单不存在' },
        { status: 404 }
      );
    }
    
    const order = orders[0];
    
    // 如果订单已经处理过，直接返回成功
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: '订单已处理'
      });
    }
    
    // 处理支付成功
    if (payment_status === 'success' || payment_status === 'paid') {
      await processPaymentSuccess(
        connection, 
        order_id, 
        order.user_id, 
        order.membership_end_date,
        transaction_id || alipay_trade_no || wechat_transaction_id || `webhook_${Date.now()}`,
        payment_time
      );
      
      return NextResponse.json({
        success: true,
        message: '支付成功处理完成'
      });
    }
    
    // 处理支付失败
    if (payment_status === 'failed' || payment_status === 'canceled') {
      await connection.execute(
        'UPDATE membership_orders SET payment_status = ? WHERE order_id = ?',
        [payment_status, order_id]
      );
      
      return NextResponse.json({
        success: true,
        message: '支付失败已记录'
      });
    }
    
    return NextResponse.json(
      { success: false, message: '未知的支付状态' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('处理支付回调失败:', error);
    return NextResponse.json(
      { success: false, message: '处理回调失败' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 处理支付成功的核心逻辑
async function processPaymentSuccess(connection, order_id, user_id, membership_end_date, transaction_id, payment_time = null) {
  try {
    // 开始事务
    await connection.beginTransaction();
    
    // 更新订单状态
    await connection.execute(
      `UPDATE membership_orders 
       SET payment_status = 'paid', 
           payment_time = COALESCE(?, NOW()), 
           transaction_id = ?
       WHERE order_id = ?`,
      [payment_time, transaction_id, order_id]
    );
    
    // 更新用户会员状态
    await connection.execute(
      `UPDATE users 
       SET membership_type = 'active_member', 
           membership_expires_at = ?
       WHERE user_id = ?`,
      [membership_end_date, user_id]
    );
    
    // 重置用户的使用限制（暂时跳过不存在的字段）
    // await connection.execute(
    //   `UPDATE users 
    //    SET daily_ai_queries_used = 0,
    //        last_ai_query_date = NULL
    //    WHERE user_id = ?`,
    //   [user_id]
    // );
    
    // 记录会员激活日志
    await connection.execute(
      `INSERT INTO user_usage_logs (user_id, feature_type, action, resource_id, usage_date)
       VALUES (?, 'membership', 'activated', ?, CURDATE())`,
      [user_id, order_id]
    );
    
    // 提交事务
    await connection.commit();
    
    console.log(`用户 ${user_id} 会员激活成功，订单号：${order_id}，交易号：${transaction_id}`);
    
    // 可以在这里添加其他后续处理，比如：
    // - 发送邮件通知
    // - 发送短信通知
    // - 记录到统计系统
    // - 触发其他业务逻辑
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error('处理支付成功失败:', error);
    throw error;
  }
}

// GET方法：健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '支付回调服务正常运行',
    timestamp: new Date().toISOString()
  });
}