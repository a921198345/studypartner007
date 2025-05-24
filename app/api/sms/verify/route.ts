import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 从请求体中获取手机号和验证码
    const { phoneNumber, code } = await request.json();
    
    if (!phoneNumber || !code) {
      return NextResponse.json({ 
        success: false, 
        message: '手机号和验证码不能为空' 
      }, { status: 400 });
    }
    
    // 获取当前时间
    const now = new Date().toISOString();
    
    // 查询未使用且未过期的验证码
    const verificationCodes = await query(
      `SELECT * FROM verification_codes 
       WHERE phone_number = ? 
       AND code = ? 
       AND used = 0 
       AND expires_at > ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phoneNumber, code, now]
    );
    
    // 检查是否找到有效的验证码
    if (!verificationCodes || verificationCodes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '验证码无效或已过期' 
      }, { status: 400 });
    }
    
    // 找到有效的验证码，标记为已使用
    const verificationCode = verificationCodes[0];
    await query(
      'UPDATE verification_codes SET used = 1 WHERE id = ?',
      [verificationCode.id]
    );
    
    // 验证成功
    return NextResponse.json({ 
      success: true, 
      message: '验证成功' 
    });
    
  } catch (error: any) {
    console.error('API错误:', error);
    return NextResponse.json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    }, { status: 500 });
  }
} 