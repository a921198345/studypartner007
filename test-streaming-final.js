import http from 'http';

// 测试流式传输
function testStreaming() {
  console.log('🚀 开始测试流式传输...\n');
  
  const data = JSON.stringify({
    question: '什么是善意取得？'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/ai/ask/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头:`, res.headers);
    console.log('\n--- 流式内容 ---\n');
    
    let buffer = '';
    let charCount = 0;
    let tokenCount = 0;
    const startTime = Date.now();
    
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log('\n\n--- 测试完成 ---');
            console.log(`✅ 总字符数: ${charCount}`);
            console.log(`✅ Token数: ${tokenCount}`);
            console.log(`✅ 耗时: ${elapsed}秒`);
            console.log(`✅ 速度: ${Math.round(charCount / elapsed)}字符/秒`);
            process.exit(0);
          } else if (data) {
            try {
              const json = JSON.parse(data);
              if (json.content) {
                process.stdout.write(json.content);
                charCount += json.content.length;
                tokenCount++;
              }
            } catch (e) {
              console.error('解析错误:', e.message);
            }
          }
        }
      }
    });

    res.on('end', () => {
      console.log('\n\n连接结束');
    });
  });

  req.on('error', (e) => {
    console.error(`❌ 请求错误: ${e.message}`);
    console.log('\n请确保开发服务器正在运行 (npm run dev)');
  });

  req.write(data);
  req.end();
}

// 立即执行测试
testStreaming();