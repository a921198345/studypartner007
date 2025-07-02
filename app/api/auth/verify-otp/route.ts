import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+08:00'
};

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';

// 验证手机号格式
function validatePhoneNumber(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 生成JWT token
function generateJWT(user) {
  const payload = {
    user_id: user.user_id,
    phone_number: user.phone_number,
    membership_type: user.membership_type,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天有效期
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

export async function POST(request) {
  let connection;
  
  try {
    // 解析请求体
    const { phone_number, otp } = await request.json();
    
    // 验证输入参数
    if (!phone_number || !otp) {
      return NextResponse.json(
        { error: '手机号和验证码不能为空' },
        { status: 400 }
      );
    }

    if (!validatePhoneNumber(phone_number)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: '验证码格式不正确' },
        { status: 400 }
      );
    }

    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    
    // 从数据库中验证验证码
    const verifyOtpSQL = `
      SELECT id, verification_code FROM sms_verification 
      WHERE phone_number = ? 
      AND is_used = FALSE 
      AND expire_at > NOW() 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const [otpRows] = await connection.execute(verifyOtpSQL, [phone_number]);
    
    if (otpRows.length === 0) {
      return NextResponse.json(
        { error: '验证码无效或已过期' },
        { status: 400 }
      );
    }

    const storedOtp = otpRows[0];
    
    // 验证验证码是否匹配
    if (storedOtp.verification_code !== otp) {
      return NextResponse.json(
        { error: '验证码错误' },
        { status: 400 }
      );
    }

    // 标记验证码为已使用
    const markUsedSQL = `
      UPDATE sms_verification 
      SET is_used = TRUE 
      WHERE id = ?
    `;
    await connection.execute(markUsedSQL, [storedOtp.id]);

    // 查询用户是否存在
    const findUserSQL = `
      SELECT user_id, phone_number, nickname, membership_type, membership_expires_at, created_at 
      FROM users 
      WHERE phone_number = ?
    `;
    
    const [userRows] = await connection.execute(findUserSQL, [phone_number]);
    
    let user;
    
    if (userRows.length === 0) {
      // 用户不存在，创建新用户
      const createUserSQL = `
        INSERT INTO users (phone_number, created_at, last_login, membership_type) 
        VALUES (?, NOW(), NOW(), 'free')
      `;
      
      const [createResult] = await connection.execute(createUserSQL, [phone_number]);
      
      // 获取新创建的用户信息
      const [newUserRows] = await connection.execute(findUserSQL, [phone_number]);
      user = newUserRows[0];
      
      console.log(`新用户注册成功: ${phone_number}, user_id: ${user.user_id}`);
      
    } else {
      // 用户已存在，更新最后登录时间
      user = userRows[0];
      
      const updateLoginSQL = `
        UPDATE users 
        SET last_login = NOW() 
        WHERE user_id = ?
      `;
      
      await connection.execute(updateLoginSQL, [user.user_id]);
      
      console.log(`用户登录成功: ${phone_number}, user_id: ${user.user_id}`);
    }

    // 生成JWT token
    const token = generateJWT(user);
    
    // 返回成功响应
    return NextResponse.json({
      message: '登录成功',
      success: true,
      token,
      user: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        nickname: user.nickname,
        membership_type: user.membership_type,
        membership_expires_at: user.membership_expires_at,
        created_at: user.created_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('验证码校验失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}