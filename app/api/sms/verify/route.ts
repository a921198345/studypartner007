import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const now = new Date();
    
    // 查询未使用且未过期的验证码
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('查询验证码失败:', error);
      return NextResponse.json({ 
        success: false, 
        message: '验证失败' 
      }, { status: 500 });
    }
    
    // 检查是否找到有效的验证码
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '验证码无效或已过期' 
      }, { status: 400 });
    }
    
    // 找到有效的验证码，标记为已使用
    const verificationCode = data[0];
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);
    
    if (updateError) {
      console.error('更新验证码状态失败:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: '验证处理失败' 
      }, { status: 500 });
    }
    
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