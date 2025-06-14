// 在浏览器控制台运行此脚本来调试暂停功能

console.log('=== 暂停功能调试工具 ===');

// 监控暂停按钮状态
const monitorPauseButton = () => {
  const interval = setInterval(() => {
    // 查找暂停按钮
    const buttons = document.querySelectorAll('button');
    const pauseButton = Array.from(buttons).find(btn => {
      const hasSquareIcon = btn.querySelector('svg.lucide-square');
      const isDestructive = btn.classList.contains('destructive') || 
                           btn.getAttribute('data-variant') === 'destructive' ||
                           btn.className.includes('destructive');
      return hasSquareIcon && isDestructive;
    });
    
    if (pauseButton) {
      console.log('✅ 找到暂停按钮');
      
      // 添加边框高亮
      pauseButton.style.border = '2px solid red';
      pauseButton.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';
      
      // 克隆按钮并添加点击监听（避免干扰原有事件）
      const clonedButton = pauseButton.cloneNode(true);
      clonedButton.onclick = null;
      
      // 检查原始按钮的点击处理器
      const hasClickHandler = pauseButton.onclick || 
                             pauseButton.getAttribute('onclick') ||
                             (pauseButton._reactProps && pauseButton._reactProps.onClick);
      
      console.log('按钮信息:', {
        disabled: pauseButton.disabled,
        hasClickHandler: !!hasClickHandler,
        className: pauseButton.className,
        variant: pauseButton.getAttribute('data-variant')
      });
      
      // 手动触发点击测试
      pauseButton.addEventListener('click', (e) => {
        console.log('🔴 暂停按钮被点击！');
        console.log('事件详情:', e);
        console.log('目标元素:', e.target);
      }, { once: true });
      
      clearInterval(interval);
    }
  }, 500);
  
  // 10秒后停止监控
  setTimeout(() => {
    clearInterval(interval);
    console.log('监控结束');
  }, 10000);
};

// 监控React状态
const checkReactState = () => {
  // 尝试获取React DevTools
  const reactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (reactDevTools) {
    console.log('✅ React DevTools 可用');
    
    // 尝试查找组件
    try {
      const fiber = reactDevTools.getFiberRoots();
      console.log('Fiber roots:', fiber);
    } catch (e) {
      console.log('无法访问 Fiber roots');
    }
  } else {
    console.log('❌ React DevTools 不可用');
  }
};

// 测试取消函数
const testCancelFunction = () => {
  console.log('测试取消函数...');
  
  // 监听网络请求
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('🌐 发起请求:', args[0]);
    
    const result = originalFetch.apply(this, args);
    
    // 如果是流式请求
    if (args[0].includes('/api/ai/ask/stream')) {
      console.log('📡 检测到流式API请求');
      
      result.then(response => {
        console.log('📡 流式响应:', response);
        
        // 尝试获取reader
        if (response.body) {
          const reader = response.body.getReader();
          console.log('📖 Reader 对象:', reader);
          
          // 保存原始cancel方法
          const originalCancel = reader.cancel.bind(reader);
          
          // 重写cancel方法以便监控
          reader.cancel = function() {
            console.log('🛑 Reader.cancel() 被调用！');
            return originalCancel();
          };
        }
      });
    }
    
    return result;
  };
};

// 开始调试
console.log(`
调试步骤：
1. 发送一个会产生长回答的问题
2. 等待AI开始回答
3. 观察控制台输出
4. 点击暂停按钮
5. 查看是否有 "Reader.cancel() 被调用" 的日志
`);

monitorPauseButton();
checkReactState();
testCancelFunction();

// 导出全局调试函数
window.debugPause = {
  findPauseButton: () => {
    const buttons = document.querySelectorAll('button');
    return Array.from(buttons).find(btn => 
      btn.querySelector('svg.lucide-square') && 
      (btn.classList.contains('destructive') || btn.className.includes('destructive'))
    );
  },
  
  simulateClick: () => {
    const btn = window.debugPause.findPauseButton();
    if (btn) {
      console.log('模拟点击暂停按钮');
      btn.click();
    } else {
      console.log('未找到暂停按钮');
    }
  },
  
  checkState: () => {
    const btn = window.debugPause.findPauseButton();
    console.log('暂停按钮状态:', btn ? {
      exists: true,
      disabled: btn.disabled,
      visible: btn.offsetParent !== null
    } : { exists: false });
  }
};

console.log('调试工具已加载。可以使用 window.debugPause.* 方法');