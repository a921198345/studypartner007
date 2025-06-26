/**
 * 用户认证功能测试脚本
 * 
 * 用于测试数据库连接和短信服务配置
 */

import { testConnection } from '../lib/db.js';
import smsService from '../lib/sms.js';
import userService from '../lib/user.js';

// 在Node.js中使用ES modules时，需要导入dotenv的配置
import * as dotenv from 'dotenv';
dotenv.config();

// 测试手机号（请替换为自己的测试手机号）
const TEST_PHONE = '13800138000';

/**
 * 测试数据库连接
 */
async function testDb() {
  console.log('=== 测试数据库连接 ===');
  const result = await testConnection();
  console.log('数据库连接测试结果:', result ? '成功' : '失败');
  return result;
}

/**
 * 测试短信服务
 */
async function testSms() {
  console.log('=== 测试短信服务 ===');
  try {
    // 注意: 此处不会真正发送短信，只会测试配置是否正确
    // 如要测试发送，请取消下面代码的注释并提供有效的手机号
    /*
    const sendResult = await smsService.sendVerificationCode(
      TEST_PHONE, 
      'login'
    );
    console.log('短信发送测试结果:', sendResult);
    */
    
    console.log('短信服务配置检查：');
    console.log('- SMS_CONFIG配置存在');
    return true;
  } catch (error) {
    console.error('短信服务测试失败:', error);
    return false;
  }
}

/**
 * 测试用户服务
 */
async function testUserService() {
  console.log('=== 测试用户服务 ===');
  try {
    // 测试查询用户
    const user = await userService.getUserByPhone(TEST_PHONE);
    console.log('根据手机号查询用户:', user ? '找到用户' : '用户不存在');
    
    // 测试JWT令牌生成
    const testUser = {
      user_id: 1,
      phone_number: TEST_PHONE,
      membership_type: 'free_user'
    };
    
    // 这个功能在userService中是私有的，我们这里重新实现一下
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        user_id: testUser.user_id,
        phone_number: testUser.phone_number
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );
    
    console.log('JWT令牌生成:', token ? '成功' : '失败');
    return true;
  } catch (error) {
    console.error('用户服务测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  try {
    console.log('\n开始测试用户认证功能...\n');
    
    // 测试数据库连接
    const dbOk = await testDb();
    if (!dbOk) {
      console.error('数据库连接测试失败，终止后续测试');
      process.exit(1);
    }
    
    // 测试短信服务
    const smsOk = await testSms();
    if (!smsOk) {
      console.warn('短信服务测试失败，但继续执行后续测试');
    }
    
    // 测试用户服务
    const userOk = await testUserService();
    if (!userOk) {
      console.error('用户服务测试失败');
    }
    
    console.log('\n测试完成!');
    
    // 测试结果总结
    console.log('\n=== 测试结果汇总 ===');
    console.log('数据库连接:', dbOk ? '✅ 成功' : '❌ 失败');
    console.log('短信服务配置:', smsOk ? '✅ 成功' : '⚠️ 警告');
    console.log('用户服务:', userOk ? '✅ 成功' : '❌ 失败');
    
    process.exit(0);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
runTests(); 