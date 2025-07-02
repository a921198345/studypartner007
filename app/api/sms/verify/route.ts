import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// 生成6位随机验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 模拟发送短信（开发环境）
async function sendSMSMock(phone, code) {
  console.log(`[开发环境] 向 ${phone} 发送验证码: ${code}`);
  return true;
}

// 真实发送短信（生产环境）
async function sendSMSReal(phone, code) {
  // TODO: 集成阿里云短信服务
  // 这里需要使用阿里云 SDK
  console.log(`[生产环境] 需要集成阿里云短信服务`);
  return false;
}

export async function POST(request) {
  try {
    const { phone } = await request.json();

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 检查是否在60秒内已发送过验证码
    const checkQuery = `
      SELECT * FROM verification_codes 
      WHERE phone_number = ? 
      AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
      AND used = 0
    `;
    const [existing] = await pool.execute(checkQuery, [phone]);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: '请60秒后再试' },
        { status: 429 }
      );
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码到数据库
    const insertQuery = `
      INSERT INTO verification_codes (phone_number, code, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.execute(insertQuery, [phone, code, expiresAt]);

    // 发送短信
    const isDev = process.env.NODE_ENV === 'development';
    const success = isDev 
      ? await sendSMSMock(phone, code)
      : await sendSMSReal(phone, code);

    if (!success && !isDev) {
      return NextResponse.json(
        { error: '短信发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码，方便测试
      ...(isDev && { code })
    });

  } catch (error) {
    console.error('发送验证码错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}