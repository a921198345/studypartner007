// 测试笔记页面访问
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/notes',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html,application/xhtml+xml'
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('页面访问成功！');
      // 检查是否包含笔记页面的标志性内容
      if (data.includes('学习笔记') || data.includes('notes')) {
        console.log('✅ 笔记页面正常加载');
      } else if (data.includes('error') || data.includes('Error')) {
        console.log('❌ 页面包含错误');
        console.log(data.substring(0, 500));
      }
    } else {
      console.log('❌ 页面访问失败');
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error(`请求出错: ${error.message}`);
});

req.end();