import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Core from '@alicloud/pop-core';

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 阿里云短信配置
const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || '';
const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
const signName = process.env.ALIYUN_SMS_SIGN_NAME || '';
const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || '';

// 初始化阿里云客户端
const client = new Core({
  accessKeyId,
  accessKeySecret,
  endpoint: 'https://dysmsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

// 生成6位随机验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    // 从请求体中获取手机号
    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ success: false, message: '手机号不能为空' }, { status: 400 });
    }

    // 检查是否是有效的中国手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ success: false, message: '无效的手机号码' }, { status: 400 });
    }

    // 生成验证码
    const code = generateCode();
    
    // 设置过期时间（5分钟后）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 存储验证码到数据库
    const { error } = await supabase
      .from('verification_codes')
      .insert([
        { 
          phone_number: phoneNumber, 
          code, 
          expires_at: expiresAt.toISOString(),
          used: false
        }
      ]);

    if (error) {
      console.error('存储验证码失败:', error);
      return NextResponse.json({ success: false, message: '验证码生成失败' }, { status: 500 });
    }

    // 调用阿里云发送短信
    const params = {
      "PhoneNumbers": phoneNumber,
      "SignName": signName,
      "TemplateCode": templateCode,
      "TemplateParam": JSON.stringify({
        code: code
      })
    }

    const requestOption = {
      method: 'POST'
    };

    try {
      // 发送短信
      const result = await client.request('SendSms', params, requestOption);
      console.log('短信发送结果:', result);
      
      if (result.Code === 'OK') {
        return NextResponse.json({ success: true, message: '验证码已发送' });
      } else {
        return NextResponse.json({ success: false, message: '短信发送失败', code: result.Code }, { status: 500 });
      }
    } catch (smsError: any) {
      console.error('短信发送错误:', smsError);
      return NextResponse.json({ success: false, message: '短信发送错误', error: smsError.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误', error: error.message }, { status: 500 });
  }
} 