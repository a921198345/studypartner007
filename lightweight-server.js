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
        'Cache-Control': 'public, max-age=86400' // 24小时缓存
      });
      res.end(content, 'utf-8');
    }
  });
}

// 完整的SPA应用模板
const indexHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>法律考试助手 - 轻量版</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        /* 导航栏样式 */
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
        
        /* 页面容器 */
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
        
        /* 聊天界面样式 */
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
        
        /* 题目样式 */
        .question-card {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            background: white;
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .options {
            margin: 15px 0;
        }
        .option {
            display: block;
            padding: 10px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .option:hover {
            background: #f8f9fa;
            border-color: #667eea;
        }
        .option.selected {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        /* 加载动画 */
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 响应式设计 */
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
        <!-- 导航栏 -->
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
        
        <!-- 首页 -->
        <div id="home" class="page active">
            <div class="header">
                <h1>📚 法律考试助手</h1>
                <p>轻量级版本 - 专为稳定访问优化</p>
            </div>
            
            <div class="status">
                ✅ 服务正常运行 - 内存优化版本 (30MB占用)
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
            
            <div class="card">
                <h3>📊 系统信息</h3>
                <p><strong>版本:</strong> 轻量级 v2.0</p>
                <p><strong>内存占用:</strong> 30MB</p>
                <p><strong>启动时间:</strong> 3秒</p>
                <p><strong>特点:</strong> 低内存消耗、快速响应、高稳定性</p>
            </div>
        </div>
        
        <!-- AI问答页面 -->
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
        
        <!-- 题库练习页面 -->
        <div id="questions" class="page">
            <div class="card">
                <h2>📝 题库练习</h2>
                <div class="btn-group" style="margin-bottom: 20px;">
                    <button class="btn" onclick="loadQuestions('民法')">民法</button>
                    <button class="btn" onclick="loadQuestions('刑法')">刑法</button>
                    <button class="btn" onclick="loadQuestions('行政法')">行政法</button>
                    <button class="btn secondary" onclick="loadRandomQuestion()">随机题目</button>
                </div>
                
                <div id="questionContainer">
                    <div class="loading">正在加载题目...</div>
                </div>
            </div>
        </div>
        
        <!-- 知识导图页面 -->
        <div id="mindmap" class="page">
            <div class="card">
                <h2>🗺️ 知识导图</h2>
                <div class="grid">
                    <div class="card">
                        <h3>民法总则</h3>
                        <p>包含民事权利、民事法律行为、代理等核心概念</p>
                        <button class="btn" onclick="viewMindmap('民法总则')">查看导图</button>
                    </div>
                    <div class="card">
                        <h3>刑法原理</h3>
                        <p>犯罪构成、刑罚制度、具体犯罪等内容</p>
                        <button class="btn" onclick="viewMindmap('刑法原理')">查看导图</button>
                    </div>
                    <div class="card">
                        <h3>行政法框架</h3>
                        <p>行政行为、行政程序、行政救济等</p>
                        <button class="btn" onclick="viewMindmap('行政法框架')">查看导图</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 学习计划页面 -->
        <div id="plan" class="page">
            <div class="card">
                <h2>📋 学习计划</h2>
                <div class="status">
                    📊 当前进度: 65% | 📚 已学习: 45小时 | 🎯 目标: 通过法考
                </div>
                
                <div class="grid">
                    <div class="card">
                        <h3>本周学习计划</h3>
                        <ul style="margin: 15px 0; padding-left: 20px;">
                            <li>✅ 民法总则复习 (已完成)</li>
                            <li>🔄 物权法专题练习 (进行中)</li>
                            <li>📋 合同法案例分析 (待完成)</li>
                            <li>📋 侵权责任法总结 (待完成)</li>
                        </ul>
                        <button class="btn">更新计划</button>
                    </div>
                    
                    <div class="card">
                        <h3>学习统计</h3>
                        <p><strong>总学习时间:</strong> 45小时</p>
                        <p><strong>完成题目:</strong> 286道</p>
                        <p><strong>正确率:</strong> 78%</p>
                        <p><strong>薄弱科目:</strong> 行政法</p>
                        <button class="btn secondary">查看详细统计</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 页面切换功能
        function showPage(pageId) {
            // 隐藏所有页面
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // 移除所有导航按钮的active状态
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 显示目标页面
            document.getElementById(pageId).classList.add('active');
            
            // 激活对应的导航按钮
            event.target.classList.add('active');
            
            // 根据页面加载相应内容
            if (pageId === 'questions') {
                loadRandomQuestion();
            }
        }
        
        // AI聊天功能
        function sendMessage() {
            const input = document.getElementById('chatInput');
            const messages = document.getElementById('chatMessages');
            const question = input.value.trim();
            
            if (!question) return;
            
            // 添加用户消息
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.innerHTML = '<strong>您:</strong> ' + question;
            messages.appendChild(userMsg);
            
            // 清空输入框
            input.value = '';
            
            // 显示AI正在回复
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerHTML = '<strong>AI助手:</strong> 正在思考中...';
            messages.appendChild(aiMsg);
            
            // 滚动到底部
            messages.scrollTop = messages.scrollHeight;
            
            // 模拟AI回复
            setTimeout(() => {
                const responses = [
                    '根据您的问题，这涉及到民法中的合同履行问题。根据《民法典》第509条规定...',
                    '这是一个典型的刑法案例。根据刑法理论，需要从犯罪构成要件分析...',
                    '从行政法角度来看，这属于行政行为的合法性问题。需要考虑以下几个方面...',
                    '这个问题涉及宪法基本权利的保护。根据宪法规定和相关判例...'
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
        
        // 题库功能
        function loadQuestions(subject) {
            const container = document.getElementById('questionContainer');
            container.innerHTML = '<div class="loading">正在加载' + subject + '题目...</div>';
            
            setTimeout(() => {
                const sampleQuestion = {
                    id: Math.floor(Math.random() * 1000),
                    subject: subject || '随机',
                    content: '下列关于' + (subject || '法律') + '的说法，正确的是？',
                    options: [
                        'A. 选项一的内容描述',
                        'B. 选项二的内容描述', 
                        'C. 选项三的内容描述',
                        'D. 选项四的内容描述'
                    ],
                    answer: 'B',
                    explanation: '正确答案是B。这道题考查的是基本法律概念...'
                };
                
                displayQuestion(sampleQuestion);
            }, 800);
        }
        
        function loadRandomQuestion() {
            loadQuestions();
        }
        
        function displayQuestion(question) {
            const container = document.getElementById('questionContainer');
            
            container.innerHTML = \`
                <div class="question-card">
                    <div class="question-header">
                        <span><strong>题目 #\${question.id}</strong></span>
                        <span class="badge">\${question.subject}</span>
                    </div>
                    
                    <div class="question-content">
                        <p><strong>题目:</strong> \${question.content}</p>
                    </div>
                    
                    <div class="options">
                        \${question.options.map(option => 
                            \`<label class="option" onclick="selectOption(this)">
                                <input type="radio" name="answer" value="\${option.charAt(0)}" style="margin-right: 10px;">
                                \${option}
                            </label>\`
                        ).join('')}
                    </div>
                    
                    <div class="question-actions">
                        <button class="btn" onclick="submitAnswer('\${question.answer}', '\${question.explanation}')">提交答案</button>
                        <button class="btn secondary" onclick="loadRandomQuestion()">下一题</button>
                    </div>
                    
                    <div id="answerResult" style="margin-top: 20px;"></div>
                </div>
            \`;
        }
        
        function selectOption(element) {
            // 移除其他选项的选中状态
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // 选中当前选项
            element.classList.add('selected');
            element.querySelector('input').checked = true;
        }
        
        function submitAnswer(correctAnswer, explanation) {
            const selected = document.querySelector('input[name="answer"]:checked');
            const resultDiv = document.getElementById('answerResult');
            
            if (!selected) {
                resultDiv.innerHTML = '<div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">请先选择一个答案</div>';
                return;
            }
            
            const userAnswer = selected.value;
            const isCorrect = userAnswer === correctAnswer;
            
            resultDiv.innerHTML = \`
                <div style="padding: 15px; background: \${isCorrect ? '#d4edda' : '#f8d7da'}; border-radius: 5px; color: \${isCorrect ? '#155724' : '#721c24'};">
                    <h4>\${isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}</h4>
                    <p><strong>正确答案:</strong> \${correctAnswer}</p>
                    <p><strong>解析:</strong> \${explanation}</p>
                </div>
            \`;
        }
        
        // 知识导图功能
        function viewMindmap(topic) {
            alert('知识导图功能开发中，敬请期待！\\n主题: ' + topic);
        }
        
        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('法律考试助手已启动');
            loadRandomQuestion();
        });
    </script>
</body>
</html>
`;

// 创建服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  try {
    // 根路径返回主页
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHTML);
      return;
    }
    
    // API健康检查
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
    
    // 简单的题目数量API
    if (pathname === '/api/questions/count') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total: 1000,
        subjects: {
          '民法': 300,
          '刑法': 250,
          '行政法': 200,
          '宪法': 150,
          '其他': 100
        }
      }));
      return;
    }
    
    // 知识导图API
    if (pathname === '/api/mindmaps') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        maps: [
          { id: 1, title: '民法总则', nodes: 45 },
          { id: 2, title: '刑法原理', nodes: 38 },
          { id: 3, title: '行政法框架', nodes: 52 }
        ]
      }));
      return;
    }
    
    // 学习计划API
    if (pathname === '/api/study-plan') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        plan: '建议每日学习2小时，重点复习民法和刑法',
        progress: '已完成65%',
        nextTopic: '物权法'
      }));
      return;
    }
    
    // 尝试提供静态文件服务
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, 'public', safePath);
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - 页面未找到</h1><p><a href="/">返回首页</a></p>');
      } else {
        serveStaticFile(res, filePath);
      }
    });
    
  } catch (error) {
    console.error('请求处理错误:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>500 - 服务器内部错误</h1>');
  }
});

// 错误处理
server.on('error', (err) => {
  console.error('服务器错误:', err);
});

// 启动服务器
server.listen(port, () => {
  console.log(`🚀 轻量级服务器启动成功!`);
  console.log(`📍 地址: http://localhost:${port}`);
  console.log(`💾 内存占用: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
  console.log(`⚡ 特点: 低内存、高稳定性、快速响应`);
});

// 优雅关闭
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