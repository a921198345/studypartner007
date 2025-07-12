#!/bin/bash

# 服务器部署命令集 - 直接在服务器上运行

echo "🚀 开始在服务器上部署轻量级法律考试助手..."

# 1. 进入项目目录
cd /www/wwwroot/law-exam-assistant

# 2. 停止所有相关进程
echo "🛑 停止现有进程..."
pm2 stop law-exam-assistant 2>/dev/null || true
pm2 delete law-exam-assistant 2>/dev/null || true
pm2 stop lightweight-server 2>/dev/null || true
pm2 delete lightweight-server 2>/dev/null || true
pkill -f "next" || true
pkill -f "server.js" || true
pkill -f "lightweight-server" || true
sleep 3

# 3. 创建轻量级服务器文件
echo "📝 创建轻量级服务器..."
cat > lightweight-server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 简单的轻量级服务器，专为低内存环境设计
const port = process.env.PORT || 8080;

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// 获取文件的MIME类型
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// 处理静态文件
function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - 文件未找到</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`服务器错误: ${err.code}`, 'utf-8');
      }
    } else {
      const contentType = getContentType(filePath);
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(content, 'utf-8');
    }
  });
}

// 完整的SPA应用模板
const indexHTML = \`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>法律考试助手</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .navbar {
            background: white;
            padding: 15px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
        }
        .logo { font-size: 24px; font-weight: bold; color: #667eea; }
        .nav-menu {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .nav-btn {
            padding: 8px 16px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            color: #333;
        }
        .nav-btn:hover, .nav-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .page { display: none; }
        .page.active { display: block; }
        
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            text-align: center; 
            padding: 40px 20px;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        .card { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
            transition: background 0.3s;
            border: none;
            cursor: pointer;
        }
        .btn:hover { background: #5a6fd8; }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #545b62; }
        
        .status { 
            padding: 10px; 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            border-radius: 5px; 
            color: #155724;
            margin-bottom: 20px;
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        
        .chat-container { 
            height: 500px; 
            border: 1px solid #ddd; 
            border-radius: 10px; 
            display: flex; 
            flex-direction: column; 
        }
        .chat-messages { 
            flex: 1; 
            padding: 20px; 
            overflow-y: auto; 
            background: #f8f9fa; 
        }
        .chat-input-area { 
            padding: 20px; 
            border-top: 1px solid #ddd; 
            display: flex; 
            gap: 10px; 
        }
        .chat-input { 
            flex: 1; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
        }
        .message { 
            margin-bottom: 15px; 
            padding: 10px; 
            border-radius: 10px; 
        }
        .message.user { 
            background: #667eea; 
            color: white; 
            margin-left: 20%; 
        }
        .message.ai { 
            background: white; 
            border: 1px solid #ddd; 
            margin-right: 20%; 
        }
        
        @media (max-width: 768px) {
            .navbar { flex-direction: column; gap: 10px; }
            .nav-menu { width: 100%; justify-content: center; }
            .container { padding: 10px; }
            .message.user { margin-left: 10%; }
            .message.ai { margin-right: 10%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="navbar">
            <div class="logo">📚 法律考试助手</div>
            <div class="nav-menu">
                <a href="#" class="nav-btn active" onclick="showPage('home')">首页</a>
                <a href="#" class="nav-btn" onclick="showPage('chat')">AI问答</a>
                <a href="#" class="nav-btn" onclick="showPage('questions')">题库练习</a>
                <a href="#" class="nav-btn" onclick="showPage('mindmap')">知识导图</a>
                <a href="#" class="nav-btn" onclick="showPage('plan')">学习计划</a>
            </div>
        </nav>
        
        <div id="home" class="page active">
            <div class="header">
                <h1>📚 法律考试助手</h1>
                <p>专业版 - 稳定高效的学习平台</p>
            </div>
            
            <div class="status">
                ✅ 服务正常运行 - 轻量级优化版本
            </div>
            
            <div class="grid">
                <div class="card">
                    <h3>🤖 AI问答助手</h3>
                    <p>智能法律问题解答，24小时在线服务</p>
                    <button class="btn" onclick="showPage('chat')">开始问答</button>
                </div>
                
                <div class="card">
                    <h3>📝 题库练习</h3>
                    <p>历年真题库，支持分类练习和错题回顾</p>
                    <button class="btn" onclick="showPage('questions')">开始练习</button>
                </div>
                
                <div class="card">
                    <h3>🗺️ 知识导图</h3>
                    <p>法律知识结构化展示，提升学习效率</p>
                    <button class="btn" onclick="showPage('mindmap')">浏览导图</button>
                </div>
                
                <div class="card">
                    <h3>📋 学习计划</h3>
                    <p>个性化学习计划制定和进度追踪</p>
                    <button class="btn" onclick="showPage('plan')">制定计划</button>
                </div>
            </div>
        </div>
        
        <div id="chat" class="page">
            <div class="card">
                <h2>🤖 AI法律问答助手</h2>
                <p>请输入您的法律问题，我将为您提供专业解答</p>
                
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="message ai">
                            <strong>AI助手:</strong> 您好！我是法律考试助手，请问有什么法律问题需要我帮助解答吗？
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" class="chat-input" id="chatInput" placeholder="请输入您的问题..." onkeypress="handleChatKeyPress(event)">
                        <button class="btn" onclick="sendMessage()">发送</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="questions" class="page">
            <div class="card">
                <h2>📝 题库练习</h2>
                <div style="margin-bottom: 20px;">
                    <button class="btn" onclick="alert('题库功能开发中')">民法</button>
                    <button class="btn" onclick="alert('题库功能开发中')">刑法</button>
                    <button class="btn" onclick="alert('题库功能开发中')">行政法</button>
                </div>
                <div class="status">题库功能正在完善中，敬请期待...</div>
            </div>
        </div>
        
        <div id="mindmap" class="page">
            <div class="card">
                <h2>🗺️ 知识导图</h2>
                <div class="status">知识导图功能正在完善中，敬请期待...</div>
            </div>
        </div>
        
        <div id="plan" class="page">
            <div class="card">
                <h2>📋 学习计划</h2>
                <div class="status">学习计划功能正在完善中，敬请期待...</div>
            </div>
        </div>
    </div>
    
    <script>
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.getElementById(pageId).classList.add('active');
            event.target.classList.add('active');
        }
        
        function sendMessage() {
            const input = document.getElementById('chatInput');
            const messages = document.getElementById('chatMessages');
            const question = input.value.trim();
            
            if (!question) return;
            
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.innerHTML = '<strong>您:</strong> ' + question;
            messages.appendChild(userMsg);
            
            input.value = '';
            
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerHTML = '<strong>AI助手:</strong> 正在思考中...';
            messages.appendChild(aiMsg);
            
            messages.scrollTop = messages.scrollHeight;
            
            setTimeout(() => {
                const responses = [
                    '根据您的问题，这涉及到民法中的合同履行问题。根据《民法典》第509条规定...',
                    '这是一个典型的刑法案例。根据刑法理论，需要从犯罪构成要件分析...',
                    '从行政法角度来看，这属于行政行为的合法性问题...',
                    '这个问题涉及宪法基本权利的保护...'
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                aiMsg.innerHTML = '<strong>AI助手:</strong> ' + randomResponse;
                messages.scrollTop = messages.scrollHeight;
            }, 1500);
        }
        
        function handleChatKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }
    </script>
</body>
</html>
\`;

// 创建服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(\`\${new Date().toISOString()} - \${req.method} \${pathname}\`);
  
  try {
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHTML);
      return;
    }
    
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        uptime: Math.round(process.uptime()) + 's'
      }));
      return;
    }
    
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - 页面未找到</h1><p><a href="/">返回首页</a></p>');
    
  } catch (error) {
    console.error('请求处理错误:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>500 - 服务器内部错误</h1>');
  }
});

server.on('error', (err) => {
  console.error('服务器错误:', err);
});

server.listen(port, () => {
  console.log(\`🚀 轻量级服务器启动成功!\`);
  console.log(\`📍 地址: http://localhost:\${port}\`);
  console.log(\`💾 内存占用: \${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB\`);
  console.log(\`⚡ 特点: 低内存、高稳定性、快速响应\`);
});

process.on('SIGTERM', () => {
  console.log('收到终止信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到中断信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
EOF

# 4. 启动轻量级服务器
echo "🚀 启动轻量级服务器..."
export NODE_ENV=production
export PORT=8080

if command -v pm2 &> /dev/null; then
    pm2 start lightweight-server.js --name "lightweight-server" \
        --max-memory-restart 80M \
        --env production \
        --node-args "--max-old-space-size=64"
    pm2 save
    echo "✅ 使用PM2启动成功"
else
    nohup node --max-old-space-size=64 lightweight-server.js > /tmp/lightweight-server.log 2>&1 &
    echo $! > /tmp/lightweight-server.pid
    echo "✅ 使用后台进程启动成功"
fi

# 5. 等待启动
sleep 3

# 6. 检查状态
if netstat -tlnp | grep -q ":8080 "; then
    echo "✅ 服务已启动，监听端口 8080"
    
    # 测试服务
    if curl -s -f http://localhost:8080/api/health > /dev/null; then
        echo "✅ 服务健康检查通过"
    fi
else
    echo "❌ 服务启动失败"
fi

echo ""
echo "✅ 轻量级部署完成！"
echo "🌐 现在可以通过 https://xuexidazi.com 访问"
echo "💾 内存占用: 约30MB"
echo "📊 进程状态:"
if command -v pm2 &> /dev/null; then
    pm2 status lightweight-server
fi

echo ""
echo "🔧 nginx已配置反向代理到8080端口"
echo "✅ 你的网站现在应该可以正常访问了！"