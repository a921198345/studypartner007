// 修复消息存储问题的调试脚本
console.log('=== 开始修复消息存储问题 ===');

// 1. 检查当前localStorage中的数据
const storageData = localStorage.getItem('law-chat-storage');
if (storageData) {
    try {
        const parsed = JSON.parse(storageData);
        console.log('当前存储数据:', {
            hasState: !!parsed.state,
            conversationCount: parsed.state?.conversations?.length || 0,
            currentConversationId: parsed.state?.currentConversationId
        });
        
        if (parsed.state?.conversations) {
            parsed.state.conversations.forEach((conv, index) => {
                console.log(`对话 ${index + 1}:`, {
                    id: conv.id,
                    title: conv.title,
                    messageCount: conv.messages?.length || 0
                });
            });
        }
    } catch (e) {
        console.error('解析存储数据失败:', e);
    }
}

// 2. 尝试获取React组件实例
console.log('\n=== 检查React组件状态 ===');
console.log('提示: 打开React DevTools，查找以下组件:');
console.log('1. AIChat - 检查messages数组');
console.log('2. useChatStore - 检查store状态');

// 3. 提供修复方案
console.log('\n=== 修复方案 ===');
console.log('在控制台运行以下代码测试消息添加:');
console.log(`
// 获取store实例
const store = window.__zustand_stores?.find(s => s.getState().addMessage);
if (store) {
    const state = store.getState();
    console.log('当前消息数:', state.messages.length);
    console.log('当前对话ID:', state.currentConversationId);
    
    // 如果没有对话，创建一个
    if (!state.currentConversationId) {
        const newId = state.createNewConversation();
        console.log('创建新对话:', newId);
    }
    
    // 添加测试消息
    state.addMessage({
        id: 'test-user-' + Date.now(),
        role: 'user',
        content: '测试问题',
        timestamp: new Date().toISOString()
    });
    
    state.addMessage({
        id: 'test-assistant-' + Date.now(),
        role: 'assistant',
        content: '这是一个测试回答，应该显示按钮。',
        timestamp: new Date().toISOString()
    });
    
    console.log('添加测试消息后的消息数:', state.messages.length);
} else {
    console.log('无法找到store实例，请在React DevTools中手动检查');
}
`);

// 4. 检查页面是否正确加载了store
console.log('\n=== 页面加载检查 ===');
console.log('在页面的AIChat组件中添加以下调试代码:');
console.log(`
// 在AIChat组件开头添加
useEffect(() => {
    console.log('AIChat组件状态:', {
        messages: messages,
        messageCount: messages.length,
        currentConversationId: currentConversationId,
        conversations: conversations.length
    });
}, [messages, currentConversationId, conversations]);
`);