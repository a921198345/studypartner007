const fetch = require('node-fetch');

// 测试保存AI回答为笔记的功能
async function testSaveNoteFromAI() {
  const API_URL = 'http://localhost:3000/api/notes/save-from-ai';
  
  // 测试数据
  const testData = {
    question: "什么是法考客观题？包含哪些科目？",
    answer: `法考客观题是国家统一法律职业资格考试的第一阶段考试，主要包括以下内容：

## 考试科目
1. **中国特色社会主义法治理论**
2. **法理学**
3. **宪法**
4. **中国法律史**
5. **国际法**
6. **司法制度和法律职业道德**
7. **刑法**
8. **刑事诉讼法**
9. **行政法与行政诉讼法**
10. **民法**
11. **知识产权法**
12. **商法**
13. **经济法**
14. **环境资源法**
15. **劳动与社会保障法**
16. **国际私法**
17. **国际经济法**
18. **民事诉讼法（含仲裁制度）**

## 考试形式
- 分为试卷一和试卷二
- 每张试卷100道题，每题1分
- 考试时间各180分钟
- 采用计算机化考试方式`,
    chatId: "test-chat-123",
    category: "法考知识",
    title: "法考客观题科目介绍"
  };

  try {
    console.log('开始测试保存AI回答为笔记...');
    
    // 需要先获取session token
    // 这里假设你已经登录并有有效的session
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 添加必要的认证headers
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 测试成功！笔记已保存');
      console.log('笔记ID:', result.data.note_id);
    } else {
      console.log('❌ 测试失败:', result.message);
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 运行测试
testSaveNoteFromAI();

console.log(`
注意：运行此测试前，请确保：
1. 本地服务已启动 (npm run dev)
2. 已登录并获取有效的session token
3. 数据库已正确配置
4. 替换上面的 YOUR_SESSION_TOKEN 为实际的token值
`);