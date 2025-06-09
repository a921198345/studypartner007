// 测试流式响应的时间延迟
const https = require('http');

console.log('开始测试流式响应...');
const startTime = Date.now();
let firstDataTime = null;
let dataCount = 0;

const postData = JSON.stringify({
  question: '什么是物权？'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/ask/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  res.on('data', (chunk) => {
    dataCount++;
    if (!firstDataTime) {
      firstDataTime = Date.now();
      const delay = firstDataTime - startTime;
      console.log(`\n🎯 第一个数据包到达时间: ${delay}ms`);
      
      if (delay > 1000) {
        console.log('⚠️  警告：第一个数据包延迟超过1秒！');
      }
    }
    
    const data = chunk.toString();
    console.log(`\n数据包 #${dataCount} (${chunk.length} bytes):`);
    console.log(data.substring(0, 200) + (data.length > 200 ? '...' : ''));
  });
  
  res.on('end', () => {
    const totalTime = Date.now() - startTime;
    console.log(`\n✅ 流式响应完成`);
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`接收数据包数: ${dataCount}`);
    console.log(`首包延迟: ${firstDataTime ? firstDataTime - startTime : 'N/A'}ms`);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 发送请求
req.write(postData);
req.end();