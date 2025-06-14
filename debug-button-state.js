// 调试脚本 - 在浏览器控制台运行
console.log('=== 开始调试按钮显示状态 ===');

// 获取当前聊天消息
const messages = JSON.parse(localStorage.getItem('law-chat-storage') || '{}');
console.log('当前会话数据:', messages);

// 检查最新会话的消息
if (messages.state && messages.state.conversations) {
    const currentConvId = messages.state.currentConversationId;
    const currentConv = messages.state.conversations.find(c => c.id === currentConvId);
    
    if (currentConv && currentConv.messages) {
        console.log(`\n当前会话 ${currentConvId} 的消息:`);
        currentConv.messages.forEach((msg, index) => {
            console.log(`\n消息 ${index}:`, {
                id: msg.id,
                role: msg.role,
                contentLength: msg.content?.length || 0,
                contentPreview: msg.content?.substring(0, 50) + '...',
                timestamp: msg.timestamp
            });
            
            // 检查按钮显示条件
            if (msg.role === 'assistant' && index > 0) {
                const prevMsg = currentConv.messages[index - 1];
                const conditions = {
                    isAssistant: msg.role === 'assistant',
                    hasContent: !!msg.content && msg.content.length > 0,
                    hasUserQuestion: prevMsg && prevMsg.role === 'user',
                    notWelcomeMessage: index > 0 && prevMsg?.role === 'user'
                };
                
                console.log('按钮显示条件:', conditions);
                console.log('应该显示按钮:', Object.values(conditions).every(v => v));
            }
        });
    }
}

// 检查React组件状态
console.log('\n=== 检查React组件状态 ===');
console.log('提示: 在React DevTools中查看以下组件:');
console.log('1. AIChat 组件的 isStreaming 和 currentStreamingMessageId 状态');
console.log('2. 最后一条assistant消息对应的按钮渲染情况');

// 手动触发重新渲染的方法
console.log('\n=== 手动修复方法 ===');
console.log('在控制台运行以下代码强制刷新:');
console.log(`
// 强制刷新页面状态
window.dispatchEvent(new Event('storage'));

// 或者刷新整个页面
// window.location.reload();
`);