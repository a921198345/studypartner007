#!/usr/bin/env node

/**
 * 学习计划API认证机制测试工具
 * 
 * 使用方法：
 * node test-study-plan-auth.js
 * 
 * 功能：
 * 1. 测试各个学习计划API的认证机制
 * 2. 验证绕过认证的方法
 * 3. 分析返回的错误信息
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';

// 测试用的数据
const testData = {
  // 学习计划生成数据
  generatePlan: {
    subject_progress: {
      "民法": { progress: 30, status: "in_progress" },
      "刑法": { progress: 0, status: "not_started" }
    },
    study_schedule: {
      daily_hours: 3,
      weekly_days: 5
    },
    custom_notes: "测试用户的特殊需求"
  },
  
  // 用户偏好数据
  preferences: {
    daily_hours: 4,
    weekly_days: 6,
    order_method: "ai",
    learning_style: "video_text"
  },
  
  // 保存计划数据
  savePlan: {
    userId: "test_user_123",
    planData: {
      overall_strategy: "测试总体策略",
      daily_plan: "测试日计划",
      weekly_plan: "测试周计划"
    }
  }
};

// 发送HTTP请求的工具函数
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试函数：无认证请求
async function testWithoutAuth(endpoint, method = 'GET', data = null) {
  console.log(`\n🔍 测试无认证访问: ${method} ${endpoint}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, method, data);
    
    console.log(`   状态码: ${response.statusCode}`);
    console.log(`   响应体:`, JSON.stringify(response.body, null, 2));
    
    // 分析是否是认证错误
    if (response.statusCode === 401) {
      console.log(`   ✅ 认证机制正常工作 - 返回401未授权`);
      if (response.body.error) {
        console.log(`   错误信息: "${response.body.error}"`);
        if (response.body.error.includes('请先登录才能使用学习计划功能')) {
          console.log(`   🎯 找到目标错误信息！`);
        }
      }
    } else if (response.statusCode === 200) {
      console.log(`   ⚠️  警告：无认证也能访问成功！`);
    } else {
      console.log(`   ❓ 其他状态码: ${response.statusCode}`);
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ 请求失败:`, error.message);
    return null;
  }
}

// 测试函数：伪造认证token
async function testWithFakeAuth(endpoint, method = 'GET', data = null) {
  console.log(`\n🎭 测试伪造认证: ${method} ${endpoint}`);
  
  const fakeHeaders = {
    'Authorization': 'Bearer fake_token_12345',
    'x-session-id': 'fake_session_id'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, method, data, fakeHeaders);
    
    console.log(`   状态码: ${response.statusCode}`);
    console.log(`   响应体:`, JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 401) {
      console.log(`   ✅ 认证验证正常 - 拒绝伪造token`);
    } else if (response.statusCode === 200) {
      console.log(`   ⚠️  警告：伪造token被接受！可能存在安全隐患`);
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ 请求失败:`, error.message);
    return null;
  }
}

// 测试函数：空认证头
async function testWithEmptyAuth(endpoint, method = 'GET', data = null) {
  console.log(`\n🚫 测试空认证头: ${method} ${endpoint}`);
  
  const emptyHeaders = {
    'Authorization': '',
    'x-session-id': ''
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, method, data, emptyHeaders);
    
    console.log(`   状态码: ${response.statusCode}`);
    console.log(`   响应体:`, JSON.stringify(response.body, null, 2));
    
    return response;
  } catch (error) {
    console.log(`   ❌ 请求失败:`, error.message);
    return null;
  }
}

// 测试函数：NextAuth.js token格式
async function testWithNextAuthToken(endpoint, method = 'GET', data = null) {
  console.log(`\n🔐 测试NextAuth.js token格式: ${method} ${endpoint}`);
  
  // 模拟NextAuth.js的JWT token格式
  const nextAuthHeaders = {
    'Cookie': 'next-auth.session-token=fake_session_token_12345'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, method, data, nextAuthHeaders);
    
    console.log(`   状态码: ${response.statusCode}`);
    console.log(`   响应体:`, JSON.stringify(response.body, null, 2));
    
    return response;
  } catch (error) {
    console.log(`   ❌ 请求失败:`, error.message);
    return null;
  }
}

// 主测试函数
async function runAuthTests() {
  console.log('🚀 开始学习计划API认证机制测试');
  console.log('====================================');
  
  // 测试的端点列表
  const endpoints = [
    { path: '/api/study-plan/preferences', method: 'GET', name: '获取用户偏好' },
    { path: '/api/study-plan/preferences', method: 'POST', data: testData.preferences, name: '更新用户偏好' },
    { path: '/api/study-plan/generate', method: 'POST', data: testData.generatePlan, name: '生成学习计划' },
    { path: '/api/study-plan/save', method: 'POST', data: testData.savePlan, name: '保存学习计划' },
    { path: '/api/study-plan/save', method: 'GET', name: '获取学习计划' },
    { path: '/api/study-plan/history', method: 'GET', name: '获取学习历史' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n\n📋 测试端点: ${endpoint.name}`);
    console.log(`   路径: ${endpoint.method} ${endpoint.path}`);
    console.log('------------------------------------');
    
    // 1. 无认证测试
    await testWithoutAuth(endpoint.path, endpoint.method, endpoint.data);
    
    // 2. 伪造认证测试
    await testWithFakeAuth(endpoint.path, endpoint.method, endpoint.data);
    
    // 3. 空认证头测试
    await testWithEmptyAuth(endpoint.path, endpoint.method, endpoint.data);
    
    // 4. NextAuth.js格式测试
    await testWithNextAuthToken(endpoint.path, endpoint.method, endpoint.data);
    
    // 添加延迟避免过快请求
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n\n✅ 测试完成！');
  console.log('\n📊 总结和建议:');
  console.log('1. 如果看到401错误和"请先登录才能使用学习计划功能"，说明认证机制正常');
  console.log('2. 如果看到200成功响应，说明可能存在认证绕过漏洞');
  console.log('3. 检查具体的认证实现是否使用了正确的中间件');
  console.log('\n🛠️  绕过认证进行测试的方法:');
  console.log('1. 临时注释掉withStudyPlanAuth包装器');
  console.log('2. 直接调用内部的处理函数');
  console.log('3. 修改认证中间件返回固定的测试用户');
}

// 辅助函数：分析认证机制
function analyzeAuthMechanism() {
  console.log('\n🔍 学习计划API认证机制分析');
  console.log('====================================');
  console.log('✅ 找到的认证相关文件:');
  console.log('1. /lib/study-plan-auth.js - 学习计划专用认证中间件');
  console.log('2. /lib/auth-middleware.js - 通用认证中间件');
  console.log('3. /lib/auth-utils.js - 客户端认证工具');
  console.log('');
  console.log('🎯 关键认证点:');
  console.log('1. withStudyPlanAuth() 中间件检查用户登录状态');
  console.log('2. 返回错误信息: "请先登录才能使用学习计划功能"');
  console.log('3. 错误代码: AUTH_REQUIRED');
  console.log('');
  console.log('📍 错误信息位置:');
  console.log('   文件: /lib/study-plan-auth.js');
  console.log('   行数: 第22行');
  console.log('   代码: NextResponse.json({ error: "请先登录才能使用学习计划功能", code: "AUTH_REQUIRED" }, { status: 401 })');
  console.log('');
  console.log('🔧 绕过认证的方法:');
  console.log('1. 方法一: 临时修改 withStudyPlanAuth 函数');
  console.log('   - 编辑 /lib/study-plan-auth.js');
  console.log('   - 在第17行添加: const user = { user_id: "test_user", phone_number: "test", membership_type: "free" };');
  console.log('   - 注释掉第19-27行的认证检查');
  console.log('');
  console.log('2. 方法二: 修改API路由文件');
  console.log('   - 将 export const POST = withStudyPlanAuth(handler);');
  console.log('   - 改为 export const POST = handler;');
  console.log('');
  console.log('3. 方法三: 使用环境变量控制');
  console.log('   - 添加 SKIP_AUTH=true 环境变量');
  console.log('   - 在认证中间件中检查此变量');
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('🧪 学习计划API认证机制测试工具');
  console.log('作者: Claude Code Assistant');
  console.log('用途: 分析和测试学习计划功能的认证机制\n');
  
  // 先显示分析结果
  analyzeAuthMechanism();
  
  // 然后运行实际测试
  console.log('\n⏱️  将在3秒后开始API测试...');
  setTimeout(() => {
    runAuthTests().catch(console.error);
  }, 3000);
}

module.exports = {
  testWithoutAuth,
  testWithFakeAuth,
  testWithEmptyAuth,
  testWithNextAuthToken,
  runAuthTests,
  analyzeAuthMechanism
};