/**
 * 短信服务模块
 * 
 * 基于阿里云短信服务实现短信验证码功能
 */

import Core from '@alicloud/pop-core';
import { query } from './db';

// 阿里云短信SDK客户端配置
const client = new Core({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || 'your_access_key',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || 'your_access_secret',
  endpoint: 'https://dysmsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

// 短信配置
const SMS_CONFIG = {
  SignName: process.env.ALIYUN_SMS_SIGN_NAME || '学习搭子',
  TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_123456789',
  
  // 验证码有效期（分钟）
  EXPIRE_MINUTES: parseInt(process.env.SMS_CODE_EXPIRE_MINUTES) || 5,
  
  // 同一手机号发送冷却时间（秒）
  COOLDOWN_SECONDS: parseInt(process.env.SMS_CODE_COOLDOWN_SECONDS) || 60,
  
  // 同一手机号24小时内最大发送次数
  MAX_DAILY_PHONE: parseInt(process.env.SMS_MAX_DAILY_PHONE) || 10,
  
  // 同一IP 24小时内最大发送次数
  MAX_DAILY_IP: parseInt(process.env.SMS_MAX_DAILY_IP) || 20
};

/**
 * 生成6位随机验证码
 * @returns {string} 6位数字验证码
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送短信验证码
 * @param {string} phoneNumber - 手机号
 * @param {string} purpose - 验证码用途: 'login', 'register', 'bind_wechat', 'other'
 * @param {string} clientIP - 客户端IP地址
 * @returns {Promise<Object>} 发送结果
 */
export async function sendVerificationCode(phoneNumber, purpose = 'login', clientIP = '') {
  try {
    // 1. 检查发送频率限制
    await checkSendingLimits(phoneNumber, clientIP);
    
    // 2. 生成验证码
    const code = generateVerificationCode();
    
    // 3. 计算过期时间
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + SMS_CONFIG.EXPIRE_MINUTES);
    
    // 4. 存储验证码到数据库
    await saveVerificationCode(phoneNumber, code, purpose, expireAt);
    
    // 5. 发送验证码短信
    const params = {
      PhoneNumbers: phoneNumber,
      SignName: SMS_CONFIG.SignName,
      TemplateCode: SMS_CONFIG.TemplateCode,
      TemplateParam: JSON.stringify({
        code: code
      })
    };

    const requestOption = {
      method: 'POST'
    };

    // 调用阿里云API发送短信
    const result = await client.request('SendSms', params, requestOption);
    
    // 判断发送结果
    if (result.Code === 'OK') {
      return { 
        success: true, 
        message: '验证码发送成功' 
      };
    } else {
      throw new Error(`发送失败: ${result.Message}`);
    }
    
  } catch (error) {
    console.error('发送短信验证码失败:', error);
    return { 
      success: false, 
      message: error.message || '验证码发送失败，请稍后重试' 
    };
  }
}

/**
 * 检查发送频率限制
 * @param {string} phoneNumber - 手机号
 * @param {string} clientIP - 客户端IP
 */
async function checkSendingLimits(phoneNumber, clientIP) {
  // 1. 检查手机号冷却期
  const lastSentRecord = await query(
    'SELECT created_at FROM sms_verification WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
    [phoneNumber]
  );
  
  if (lastSentRecord && lastSentRecord.length > 0) {
    const lastSentTime = new Date(lastSentRecord[0].created_at);
    const now = new Date();
    const diffSeconds = Math.floor((now - lastSentTime) / 1000);
    
    if (diffSeconds < SMS_CONFIG.COOLDOWN_SECONDS) {
      throw new Error(`请等待 ${SMS_CONFIG.COOLDOWN_SECONDS - diffSeconds} 秒后再次获取验证码`);
    }
  }
  
  // 2. 检查手机号24小时内发送次数
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  const phoneDailyCount = await query(
    'SELECT COUNT(*) as count FROM sms_verification WHERE phone_number = ? AND created_at > ?',
    [phoneNumber, oneDayAgo]
  );
  
  if (phoneDailyCount[0].count >= SMS_CONFIG.MAX_DAILY_PHONE) {
    throw new Error(`该手机号24小时内验证码发送次数已达上限，请明天再试`);
  }
  
  // 3. 如果提供了客户端IP，检查IP地址24小时内发送次数
  if (clientIP) {
    // 注意: 需要创建一个额外的表或字段来记录IP地址
    // 这里仅作为示例，实际实现可能需要调整
    const ipDailyCount = await query(
      'SELECT COUNT(*) as count FROM sms_verification WHERE created_at > ? AND ip_address = ?',
      [oneDayAgo, clientIP]
    );
    
    if (ipDailyCount[0].count >= SMS_CONFIG.MAX_DAILY_IP) {
      throw new Error(`当前网络环境24小时内验证码发送次数已达上限`);
    }
  }
}

/**
 * 将验证码保存到数据库
 * @param {string} phoneNumber - 手机号
 * @param {string} code - 验证码
 * @param {string} purpose - 用途
 * @param {Date} expireAt - 过期时间
 */
async function saveVerificationCode(phoneNumber, code, purpose, expireAt) {
  await query(
    'INSERT INTO sms_verification (phone_number, verification_code, purpose, expire_at) VALUES (?, ?, ?, ?)',
    [phoneNumber, code, purpose, expireAt]
  );
}

/**
 * 验证短信验证码
 * @param {string} phoneNumber - 手机号
 * @param {string} code - 用户输入的验证码
 * @param {string} purpose - 验证码用途
 * @returns {Promise<boolean>} 验证结果
 */
export async function verifyCode(phoneNumber, code, purpose = 'login') {
  try {
    // 查询最新的未使用验证码
    const codeRecord = await query(
      `SELECT * FROM sms_verification 
       WHERE phone_number = ? 
       AND verification_code = ? 
       AND purpose = ? 
       AND is_used = FALSE 
       AND expire_at > NOW() 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phoneNumber, code, purpose]
    );
    
    // 验证失败
    if (!codeRecord || codeRecord.length === 0) {
      return false;
    }
    
    // 标记验证码为已使用
    await query(
      'UPDATE sms_verification SET is_used = TRUE WHERE id = ?',
      [codeRecord[0].id]
    );
    
    return true;
  } catch (error) {
    console.error('验证码验证失败:', error);
    return false;
  }
}

export default {
  sendVerificationCode,
  verifyCode
}; 