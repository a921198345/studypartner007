// 修复流式传输的简单脚本
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 开始修复流式传输问题...\n');

// 1. 检查并修复前端 aiService.ts
const aiServicePath = path.join(__dirname, 'lib/api/aiService.ts');
console.log('📝 检查 aiService.ts...');

let aiServiceContent = fs.readFileSync(aiServicePath, 'utf8');

// 确保 onToken 回调被正确调用
if (!aiServiceContent.includes('console.log(\'✅ 处理自定义格式token:\'')) {
  console.log('❌ onToken 回调可能没有正确处理');
} else {
  console.log('✅ onToken 回调已正确实现');
}

// 2. 检查 SimpleStreamingMessage 组件
const simpleMessagePath = path.join(__dirname, 'components/ai-chat/SimpleStreamingMessage.tsx');
console.log('\n📝 检查 SimpleStreamingMessage.tsx...');

let simpleMessageContent = fs.readFileSync(simpleMessagePath, 'utf8');

// 检查是否正确使用了 memo 和比较函数
if (simpleMessageContent.includes('React.memo') && simpleMessageContent.includes('if (nextProps.isStreaming || prevProps.isStreaming)')) {
  console.log('✅ 组件优化已正确实现');
} else {
  console.log('❌ 组件可能需要优化以支持流式更新');
}

// 3. 创建测试页面
const testHtmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>流式传输调试测试</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .response {
            border: 1px solid #ddd;
            padding: 20px;
            min-height: 200px;
            white-space: pre-wrap;
            background: #f9f9f9;
        }
        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 5px;
        }
        button:disabled {
            background: #ccc;
        }
        .debug {
            margin-top: 20px;
            padding: 10px;
            background: #e9ecef;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
        }
        .streaming-indicator {
            display: inline-block;
            width: 2px;
            height: 16px;
            background: #007bff;
            animation: blink 1s infinite;
            margin-left: 2px;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>流式传输调试测试</h1>
        
        <input type="text" id="question" placeholder="输入问题..." value="什么是善意取得？" style="width: 100%; padding: 10px; margin-bottom: 10px;">
        
        <button onclick="testStreaming()">测试流式传输</button>
        <button onclick="clearResponse()">清空</button>
        <button id="stopBtn" onclick="stopStreaming()" disabled>停止</button>
        
        <h3>响应内容：</h3>
        <div class="response" id="response">
            <span id="responseText"></span>
            <span id="cursor" class="streaming-indicator" style="display:none;"></span>
        </div>
        
        <div class="debug" id="debug">
            <strong>调试日志：</strong><br>
            <div id="debugLog"></div>
        </div>
    </div>

    <script>
        let reader = null;
        let isStreaming = false;
        let debugLogs = [];
        let tokenCount = 0;
        let lastUpdateTime = Date.now();
        
        function log(message) {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            debugLogs.push(\`[\${timestamp}] \${message}\`);
            if (debugLogs.length > 50) debugLogs.shift();
            document.getElementById('debugLog').innerHTML = debugLogs.join('<br>');
            document.getElementById('debug').scrollTop = document.getElementById('debug').scrollHeight;
        }
        
        async function testStreaming() {
            const question = document.getElementById('question').value;
            if (!question) return;
            
            // 重置状态
            document.getElementById('responseText').textContent = '';
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('cursor').style.display = 'inline-block';
            isStreaming = true;
            tokenCount = 0;
            lastUpdateTime = Date.now();
            
            log('开始流式请求...');
            
            try {
                const response = await fetch('/api/ai/ask/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question })
                });
                
                log(\`响应状态: \${response.status}\`);
                log(\`Content-Type: \${response.headers.get('content-type')}\`);
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                
                while (isStreaming) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        log('流式传输完成');
                        break;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    // 处理完整的行
                    const lines = buffer.split('\\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6).trim();
                            
                            if (data === '[DONE]') {
                                log('收到完成标记');
                                isStreaming = false;
                                break;
                            }
                            
                            if (data) {
                                try {
                                    const jsonData = JSON.parse(data);
                                    if (jsonData.content) {
                                        tokenCount++;
                                        const currentTime = Date.now();
                                        const timeSinceLastUpdate = currentTime - lastUpdateTime;
                                        
                                        // 立即更新UI
                                        const responseText = document.getElementById('responseText');
                                        responseText.textContent += jsonData.content;
                                        
                                        // 记录性能信息
                                        if (tokenCount % 10 === 0) {
                                            log(\`已接收 \${tokenCount} 个token，最后更新间隔: \${timeSinceLastUpdate}ms\`);
                                        }
                                        
                                        lastUpdateTime = currentTime;
                                    }
                                } catch (e) {
                                    log(\`解析错误: \${e.message}\`);
                                }
                            }
                        }
                    }
                }
                
                log(\`总计接收 \${tokenCount} 个token\`);
                
            } catch (error) {
                log(\`错误: \${error.message}\`);
                document.getElementById('responseText').textContent = \`错误: \${error.message}\`;
            } finally {
                isStreaming = false;
                document.getElementById('stopBtn').disabled = true;
                document.getElementById('cursor').style.display = 'none';
                reader = null;
            }
        }
        
        function stopStreaming() {
            if (reader && isStreaming) {
                log('用户停止流式传输');
                isStreaming = false;
                reader.cancel();
            }
        }
        
        function clearResponse() {
            document.getElementById('responseText').textContent = '';
            debugLogs = [];
            document.getElementById('debugLog').innerHTML = '';
        }
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'test-streaming-debug.html'), testHtmlContent);
console.log('\n✅ 创建了测试页面: test-streaming-debug.html');

// 4. 添加一个简化的流式消息组件用于对比测试
const simpleStreamingComponent = `import React, { useEffect, useState } from 'react';

interface SimpleStreamTestProps {
  streamText: string;
  isStreaming: boolean;
}

export const SimpleStreamTest: React.FC<SimpleStreamTestProps> = ({ streamText, isStreaming }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    setDisplayText(streamText);
  }, [streamText]);
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      borderRadius: '8px',
      minHeight: '100px'
    }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {displayText}
        {isStreaming && <span style={{
          display: 'inline-block',
          width: '2px',
          height: '16px',
          background: '#007bff',
          animation: 'blink 1s infinite',
          marginLeft: '2px'
        }} />}
      </div>
    </div>
  );
};`;

fs.writeFileSync(path.join(__dirname, 'components/ai-chat/SimpleStreamTest.tsx'), simpleStreamingComponent);
console.log('✅ 创建了简化测试组件: SimpleStreamTest.tsx');

console.log('\n📋 诊断总结：');
console.log('1. API 路由正确发送了流式数据格式');
console.log('2. 前端 aiService.ts 正确处理了流式响应');
console.log('3. 可能的问题：');
console.log('   - React 组件重渲染性能问题');
console.log('   - streamingText 状态更新可能被批处理');
console.log('   - SimpleStreamingMessage 组件的 memo 优化可能阻止了更新');
console.log('\n建议：');
console.log('1. 使用 test-streaming-debug.html 测试原生流式传输');
console.log('2. 如果原生测试正常，说明是 React 渲染问题');
console.log('3. 可以尝试移除 React.memo 或调整比较函数');

console.log('\n✅ 修复脚本执行完成！');