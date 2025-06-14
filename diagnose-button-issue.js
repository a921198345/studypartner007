// 诊断按钮显示问题的脚本
// 复制此脚本到浏览器控制台运行

(function diagnoseButtons() {
  console.log('=== 开始诊断按钮显示问题 ===');
  
  // 1. 检查React组件
  const reactFiberKey = Object.keys(document.querySelector('#__next')).find(key => key.startsWith('__react'));
  if (reactFiberKey) {
    console.log('✅ 找到React Fiber节点');
  }
  
  // 2. 检查消息元素
  const messageElements = document.querySelectorAll('div[class*="max-w-6xl"]');
  console.log(`找到 ${messageElements.length} 个潜在的消息容器`);
  
  // 3. 查找所有按钮
  const allButtons = Array.from(document.querySelectorAll('button'));
  const saveButtons = allButtons.filter(btn => btn.textContent.includes('保存为笔记'));
  const mindMapButtons = allButtons.filter(btn => btn.textContent.includes('查看导图'));
  
  console.log(`找到 ${saveButtons.length} 个"保存为笔记"按钮`);
  console.log(`找到 ${mindMapButtons.length} 个"查看导图"按钮`);
  
  // 4. 检查按钮的可见性
  if (saveButtons.length > 0) {
    saveButtons.forEach((btn, index) => {
      const styles = window.getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      console.log(`保存按钮 ${index + 1}:`, {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        position: `${rect.left}, ${rect.top}`,
        size: `${rect.width}x${rect.height}`,
        parentDisplay: window.getComputedStyle(btn.parentElement).display
      });
    });
  }
  
  // 5. 检查父元素
  console.log('\n=== 检查消息结构 ===');
  const messages = document.querySelectorAll('[role="article"], [class*="message"], [class*="MinimalMessage"]');
  messages.forEach((msg, index) => {
    const buttons = msg.parentElement.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map(b => b.textContent.trim());
    console.log(`消息 ${index + 1}: 找到 ${buttons.length} 个按钮`, buttonTexts);
  });
  
  // 6. 尝试手动添加按钮来测试
  console.log('\n=== 测试手动添加按钮 ===');
  const lastMessage = Array.from(messages).pop();
  if (lastMessage) {
    const testContainer = document.createElement('div');
    testContainer.innerHTML = `
      <div style="max-width: 48rem; margin: 0 auto; padding: 8px 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 56px;">
          <button style="padding: 4px 8px; border: 1px solid #ccc; background: white;">
            测试按钮
          </button>
        </div>
      </div>
    `;
    lastMessage.parentElement.appendChild(testContainer);
    console.log('✅ 已添加测试按钮，如果能看到说明容器结构正常');
  }
  
  // 7. 检查CSS类
  console.log('\n=== 检查CSS类 ===');
  const styleSheets = Array.from(document.styleSheets);
  styleSheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      const hiddenRules = rules.filter(rule => 
        rule.cssText && (
          rule.cssText.includes('display: none') || 
          rule.cssText.includes('visibility: hidden') ||
          rule.cssText.includes('opacity: 0')
        )
      );
      if (hiddenRules.length > 0) {
        console.log('发现可能隐藏元素的CSS规则:', hiddenRules.map(r => r.cssText));
      }
    } catch (e) {
      // 跨域样式表
    }
  });
  
  console.log('\n=== 诊断完成 ===');
  
  // 返回诊断结果
  return {
    messagesFound: messages.length,
    saveButtonsFound: saveButtons.length,
    mindMapButtonsFound: mindMapButtons.length,
    testButtonAdded: !!testContainer
  };
})();

// 强制刷新函数
function forceRefreshButtons() {
  console.log('尝试强制刷新按钮...');
  
  // 触发React重新渲染
  const event = new Event('storage');
  event.key = 'law-chat-storage';
  event.newValue = localStorage.getItem('law-chat-storage');
  window.dispatchEvent(event);
  
  // 触发resize事件
  window.dispatchEvent(new Event('resize'));
  
  console.log('已触发刷新事件');
}