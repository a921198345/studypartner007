import fetch from 'node-fetch';

// 模拟用户ID 4的JWT token
const userId = 4;
const payload = {
  user_id: userId,
  phone_number: "15600920695",
  membership_type: "paid",
  exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
};

// 创建一个简单的JWT (仅用于测试)
const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature = 'test-signature'; // 实际应用中需要正确签名
const token = `${header}.${body}.${signature}`;

console.log('🔍 测试完整的认证流程...\n');

// 测试1: 获取会员状态
console.log('1️⃣ 测试获取会员状态 (/api/membership/status)');
try {
  const response = await fetch('http://localhost:3001/api/membership/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 会员状态获取成功');
    console.log(`- 用户ID: ${data.data?.user?.user_id}`);
    console.log(`- 会员类型: ${data.data?.membership?.type}`);
    console.log(`- 是否激活: ${data.data?.membership?.isActive}`);
  } else {
    console.log(`❌ 请求失败: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  console.log(`❌ 请求出错: ${error.message}`);
}

// 测试2: 获取题目列表（会员应该能看到所有年份）
console.log('\n2️⃣ 测试获取2021年题目列表');
try {
  const response = await fetch('http://localhost:3001/api/exams/questions?year=2021&limit=5', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 题目列表获取成功');
    console.log(`- 题目数量: ${data.data?.questions?.length || 0}`);
    if (data.data?.questions?.length > 0) {
      console.log('- 前几道题:');
      data.data.questions.slice(0, 3).forEach(q => {
        console.log(`  • ID ${q.id}: ${q.year}年 ${q.subject} (会员专属: ${q.is_member_only ? '是' : '否'})`);
      });
    }
  } else {
    console.log(`❌ 请求失败: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  console.log(`❌ 请求出错: ${error.message}`);
}

// 测试3: 获取具体题目（ID 12）
console.log('\n3️⃣ 测试获取题目ID 12的详情');
try {
  const response = await fetch('http://localhost:3001/api/exams/questions/12', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ 题目详情获取成功');
    console.log(`- 题目ID: ${data.data?.id}`);
    console.log(`- 年份: ${data.data?.year}`);
    console.log(`- 科目: ${data.data?.subject}`);
    console.log(`- 题型: ${data.data?.question_type}`);
  } else {
    console.log(`❌ 请求失败: ${response.status} ${response.statusText}`);
    const errorData = await response.json();
    console.log(`- 错误信息: ${errorData.message}`);
  }
} catch (error) {
  console.log(`❌ 请求出错: ${error.message}`);
}

console.log('\n✨ 测试完成！');