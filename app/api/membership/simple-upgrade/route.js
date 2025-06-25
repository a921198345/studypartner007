import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import db from '@/lib/db';

export async function POST(request) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未提供认证信息' }, { status: 401 });
    }

    const auth_result = await verifyAuth(authHeader);
    if (!auth_result.success) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    const user_id = auth_result.user.user_id;
    const { membership_type = 'paid', duration_days = 365 } = await request.json();

    // 计算会员过期时间
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + duration_days);

    console.log(`用户 ${user_id} 升级会员: ${membership_type}, 过期时间: ${expires_at}`);

    // 检查users表结构，确保有必要的字段
    try {
      const columns = await db.query('SHOW COLUMNS FROM users');
      const hasExpiresAt = columns.some(col => col.Field === 'membership_expires_at');
      
      if (!hasExpiresAt) {
        // 添加membership_expires_at字段
        await db.query(`
          ALTER TABLE users 
          ADD COLUMN membership_expires_at DATETIME NULL
        `);
        console.log('已添加 membership_expires_at 字段');
      }
    } catch (error) {
      console.warn('检查或添加字段失败:', error.message);
    }

    // 更新用户会员状态
    try {
      await db.query(`
        UPDATE users 
        SET membership_type = ?, membership_expires_at = ?
        WHERE user_id = ?
      `, [membership_type, expires_at, user_id]);

      console.log(`✅ 用户 ${user_id} 会员状态更新成功`);

      // 获取更新后的用户信息
      const [updatedUsers] = await db.query(
        'SELECT user_id, phone_number, nickname, membership_type, membership_expires_at FROM users WHERE user_id = ?',
        [user_id]
      );

      if (updatedUsers.length === 0) {
        throw new Error('用户不存在');
      }

      const updatedUser = updatedUsers[0];

      return NextResponse.json({
        success: true,
        message: '会员升级成功',
        user: {
          user_id: updatedUser.user_id,
          phone_number: updatedUser.phone_number,
          nickname: updatedUser.nickname,
          membership_type: updatedUser.membership_type,
          membership_expires_at: updatedUser.membership_expires_at
        },
        expires_at: expires_at.toISOString()
      });

    } catch (dbError) {
      console.error('数据库更新失败:', dbError);
      return NextResponse.json({
        error: '数据库更新失败',
        details: dbError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('会员购买接口错误:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error.message
    }, { status: 500 });
  }
}