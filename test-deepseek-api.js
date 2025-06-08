// 测试DeepSeek API连接
require('dotenv').config();
const fetch = require('node-fetch');

async function testDeepseekApi() {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('错误: 未设置DEEPSEEK_API_KEY环境变量');
      return;
    }

    console.log('使用API密钥的前10个字符:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API响应状态码:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API连接成功!');
      console.log('可用模型:', data);
    } else {
      const errorText = await response.text();
      console.error('API调用失败:', response.status, errorText);
    }
  } catch (error) {
    console.error('请求出错:', error.message);
  }
}

testDeepseekApi(); 