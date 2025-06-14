# 答题历史和错题导航问题完整修复方案

## 问题总结

1. **答题历史不显示**：客户端会话ID (client_session_id) 在每次请求时都重新生成
2. **错题导航异常**：wrongIndex 管理混乱，导致跳转不正确

## 已实施的修复

### 1. 客户端会话管理 ✅
创建了 `lib/client-session.js`：
- 持久化存储客户端会话ID到 localStorage
- 在所有API请求中自动携带会话ID

### 2. API路由改进 ✅
修改了 `/api/exams/sessions/route.js`：
- 优先从请求头获取 `X-Client-Session-Id`
- 改进了会话ID的获取逻辑
- 添加了详细的日志输出

### 3. 答题历史组件升级 ✅
创建了 `components/question-bank/answer-history-v2.tsx`：
- 整合数据库和本地存储
- 自动同步本地数据到数据库
- 改进了加载和显示逻辑

### 4. 错题导航修复（待实施）
需要修改 `app/question-bank/[id]/page.tsx`：

```javascript
// 在 useEffect 中初始化错题列表
useEffect(() => {
  const source = searchParams.get('source');
  
  if (source === 'wrong') {
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    if (wrongQuestionsStr) {
      try {
        const wrongQuestions = JSON.parse(wrongQuestionsStr);
        // 设置错题列表作为筛选后的题目
        setFilteredQuestions(wrongQuestions.map(q => ({
          id: q.id,
          question_code: q.question_code || null
        })));
        
        // 获取并验证当前索引
        const wrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
        if (wrongIndex >= 0 && wrongIndex < wrongQuestions.length) {
          setCurrentQuestionIndex(wrongIndex);
          console.log(`错题模式初始化：共${wrongQuestions.length}题，当前第${wrongIndex + 1}题`);
        }
      } catch (e) {
        console.error('初始化错题列表失败:', e);
      }
    }
  }
}, [source, searchParams]);

// 修改 handleNextQuestion 的错题导航部分
if (source === 'wrong') {
  const currentWrongIndex = parseInt(searchParams.get('wrongIndex') || '0');
  const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
  
  if (wrongQuestionsStr) {
    try {
      const wrongQuestions = JSON.parse(wrongQuestionsStr);
      
      if (currentWrongIndex < wrongQuestions.length - 1) {
        const nextIndex = currentWrongIndex + 1;
        const nextQuestion = wrongQuestions[nextIndex];
        
        const nextParams = new URLSearchParams({
          source: 'wrong',
          wrongIndex: nextIndex.toString(),
          continue: 'true'
        });
        
        router.push(`/question-bank/${nextQuestion.id}?${nextParams.toString()}`);
        return;
      }
    } catch (e) {
      console.error('错题导航失败:', e);
    }
  }
}
```

## 测试步骤

### 1. 验证答题历史
1. 打开题库页面：http://localhost:3000/question-bank
2. 检查浏览器控制台，确认客户端会话ID已生成
3. 答几道题
4. 刷新页面，检查答题历史是否显示

### 2. 验证错题导航
1. 在题库中故意答错几道题
2. 进入"我的错题"标签
3. 点击"开始练习"
4. 测试"下一题"和"上一题"导航是否正常

### 3. 验证数据持久化
1. 清除浏览器缓存（但保留 localStorage）
2. 重新打开页面
3. 确认答题历史仍然存在

## 部署注意事项

1. **数据库表已创建**：
   - `answer_sessions` - 答题会话表
   - `session_answers` - 会话答题记录关联表
   - `user_answers` - 用户答题记录表（已添加 session_id 字段）

2. **环境差异**：
   - 本地测试时使用客户端会话ID
   - 生产环境登录后会同时使用用户ID
   - 确保两种情况都能正常工作

3. **性能优化**：
   - 减少了自动刷新频率（5秒→30秒）
   - 使用缓存减少数据库查询
   - 支持离线使用

## 后续优化建议

1. **添加数据导出功能**：让用户可以导出自己的答题历史
2. **增加统计图表**：可视化展示学习进度
3. **实现云同步**：登录后自动合并本地和云端数据
4. **优化错题管理**：支持错题分类、标记难度等功能