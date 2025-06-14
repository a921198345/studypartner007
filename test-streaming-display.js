// 测试流式显示的脚本
// 在浏览器控制台运行此脚本

console.clear();
console.log('%c=== 流式显示测试 ===', 'color: blue; font-size: 16px; font-weight: bold');

// 监控 React 状态更新
let lastStreamingTextLength = 0;
let updateCount = 0;

// 监控控制台日志
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // 监控流式文本更新
  if (message.includes('📝 流式文本长度:')) {
    const match = message.match(/流式文本长度: (\d+)/);
    if (match) {
      const currentLength = parseInt(match[1]);
      if (currentLength > lastStreamingTextLength) {
        updateCount++;
        console.info(`✅ 流式文本更新 #${updateCount}: ${lastStreamingTextLength} → ${currentLength} (+${currentLength - lastStreamingTextLength})`);
        lastStreamingTextLength = currentLength;
      }
    }
  }
  
  // 监控组件渲染
  if (message.includes('🎨 SimpleStreamingMessage 渲染:')) {
    console.info('🎨 组件重新渲染', args[1]);
  }
  
  originalLog.apply(console, args);
};

// 监控 DOM 更新
const observeStreamingText = () => {
  console.log('👀 开始监控 DOM 更新...');
  
  // 查找 AI 消息容器
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const target = mutation.target;
        if (target.nodeType === Node.TEXT_NODE || target.textContent) {
          // 检查是否是 AI 消息的文本更新
          const aiMessage = target.closest('[class*="assistant"]') || 
                           target.closest('[class*="ai"]');
          if (aiMessage) {
            console.info('📝 检测到 DOM 文本更新');
          }
        }
      }
    });
  });
  
  // 开始观察
  setTimeout(() => {
    const chatContainer = document.querySelector('[class*="space-y-6"]');
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        characterData: true,
        subtree: true,
        characterDataOldValue: true
      });
      console.log('✅ DOM 观察器已启动');
    } else {
      console.warn('❌ 未找到聊天容器');
    }
  }, 1000);
  
  // 30秒后停止
  setTimeout(() => {
    observer.disconnect();
    console.log('🛑 DOM 观察器已停止');
  }, 30000);
};

// 测试建议
console.log(`
📋 测试步骤：

1. 发送一个会产生长回答的问题，例如：
   "请详细解释民法中的物权变动原则，包括公示公信原则的具体体现"

2. 观察以下指标：
   - ✅ 流式文本更新次数（应该看到多次更新）
   - 🎨 组件渲染次数（应该随着文本更新而渲染）
   - 📝 DOM 更新（应该看到实时的文本变化）

3. 预期结果：
   - 文字应该逐步显示，而不是一次性出现
   - 更新次数应该 > 10 次
   - 应该能看到打字效果

4. 如果没有看到实时更新：
   - 检查是否有 "📝 收到token" 日志
   - 检查是否有 "🎨 SimpleStreamingMessage 渲染" 日志
   - 检查 streamText 长度是否在增加
`);

// 启动监控
observeStreamingText();

// 提供手动检查函数
window.streamingTest = {
  checkState: () => {
    // 查找所有消息
    const messages = document.querySelectorAll('[class*="mb-6"]');
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage) {
      const textContent = lastMessage.textContent || '';
      console.log('最后一条消息长度:', textContent.length);
      console.log('消息预览:', textContent.substring(0, 100) + '...');
    }
  },
  
  reset: () => {
    lastStreamingTextLength = 0;
    updateCount = 0;
    console.log('计数器已重置');
  }
};

console.log('测试工具已加载！使用 window.streamingTest.* 进行手动检查');