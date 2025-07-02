import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+08:00'
};

// 阿里云短信服务
const Core = require('@alicloud/pop-core');

function createSmsClient() {
  return new Core({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
  });
}

// 生成6位随机验证码
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证手机号格式
function validatePhoneNumber(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 发送短信验证码
async function sendSMS(phone, code) {
  // 开发环境使用mock模式
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 开发模式 - 验证码发送到 ${phone}: ${code}`);
    return true;
  }

  const client = createSmsClient();
  
  const params = {
    RegionId: "cn-hangzhou",
    PhoneNumbers: phone,
    SignName: process.env.ALIYUN_SMS_SIGN_NAME,
    TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code })
  };

  const requestOption = {
    method: 'POST'
  };

  try {
    const result = await client.request('SendSms', params, requestOption);
    console.log('短信发送结果:', result);
    return result.Code === 'OK';
  } catch (error) {
    console.error('阿里云短信发送失败:', error);
    return false;
  }
}

export async function POST(request) {
  let connection;
  
  try {
    // 解析请求体
    const { phone_number } = await request.json();
    
    // 验证手机号
    if (!phone_number || !validatePhoneNumber(phone_number)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    
    // 检查是否频繁发送验证码（1分钟内只能发送一次）
    const checkRecentSQL = `
      SELECT COUNT(*) as count FROM sms_verification 
      WHERE phone_number = ? 
      AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    `;
    
    const [recentRows] = await connection.execute(checkRecentSQL, [phone_number]);
    
    if (recentRows[0].count > 0) {
      return NextResponse.json(
        { error: '验证码发送过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 生成验证码
    const otp = generateOTP();
    
    // 发送短信
    const smsResult = await sendSMS(phone_number, otp);
    
    if (!smsResult) {
      return NextResponse.json(
        { error: '短信发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 存储验证码到数据库（5分钟有效期）
    const insertSQL = `
      INSERT INTO sms_verification (phone_number, verification_code, purpose, expire_at) 
      VALUES (?, ?, 'login', DATE_ADD(NOW(), INTERVAL 5 MINUTE))
    `;
    
    await connection.execute(insertSQL, [phone_number, otp]);
    
    console.log(`验证码已发送到 ${phone_number}: ${otp}`);
    
    return NextResponse.json(
      { message: '验证码已发送', success: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('发送验证码失败:', error);
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