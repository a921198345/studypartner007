// 简单的暂停功能测试脚本
// 在浏览器控制台运行此脚本来测试暂停功能

console.log('=== 暂停功能测试 ===');

// 监听暂停按钮
const checkPauseButton = () => {
  const buttons = document.querySelectorAll('button');
  const pauseButton = Array.from(buttons).find(btn => 
    btn.title === '暂停生成' || btn.querySelector('svg.lucide-square')
  );
  
  if (pauseButton) {
    console.log('✅ 找到暂停按钮');
    console.log('按钮状态:', {
      disabled: pauseButton.disabled,
      variant: pauseButton.getAttribute('data-variant') || pauseButton.className.includes('destructive') ? 'destructive' : 'default',
      visible: pauseButton.offsetParent !== null
    });
    
    // 添加点击监听
    pauseButton.addEventListener('click', () => {
      console.log('🔴 暂停按钮被点击了！');
    }, { once: true });
  } else {
    console.log('❌ 未找到暂停按钮');
  }
};

// 监听 AI 响应状态
const monitorAIResponse = () => {
  console.log('开始监听 AI 响应状态...');
  
  // 每500ms检查一次
  const interval = setInterval(() => {
    const textarea = document.querySelector('textarea');
    const sendButton = document.querySelector('button[type="submit"]');
    const pauseButton = document.querySelector('button[title="暂停生成"]');
    
    if (pauseButton) {
      console.log('🟡 AI 正在生成回答，暂停按钮可用');
      checkPauseButton();
      clearInterval(interval);
    } else if (sendButton && !sendButton.disabled) {
      console.log('🟢 AI 空闲，可以发送新消息');
    }
  }, 500);
  
  // 10秒后停止监听
  setTimeout(() => {
    clearInterval(interval);
    console.log('监听结束');
  }, 10000);
};

// 测试步骤提示
console.log(`
📋 测试步骤：
1. 输入一个问题（例如："什么是民法？"）
2. 点击发送按钮
3. 等待 AI 开始回答
4. 当看到红色暂停按钮时，点击它
5. 观察控制台输出

现在开始监听...
`);

monitorAIResponse();