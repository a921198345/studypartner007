# AI聊天搜索结果一致性修复方案

## 问题描述

从AI聊天页面点击"相关真题"按钮跳转到题库时，搜索结果与直接在题库搜索框输入相同关键词的结果不一致。

### 具体表现：
1. 单个词的展示结果应该与在题库框展示的一样
2. 多个词应该是多个词搜索结果并集的展示
3. 现在搜索结果是对的，但跳转过来的展示不一致

## 问题原因分析

### 1. 当前实现逻辑

**AI聊天页面（RelatedQuestionsButton.tsx）**：
- 提取关键词（可能是多个）
- 将关键词通过URL参数传递：`keywords=keyword1,keyword2`
- 跳转到题库页面

**题库页面（question-bank/page.tsx）**：
- 接收keywords参数并解析为数组
- 但只使用第一个关键词进行搜索：`const mainKeyword = aiKeywords[0]`
- 这导致了多关键词搜索时只搜索第一个词

### 2. 期望的行为

- 单个关键词：结果应该与直接搜索完全一致
- 多个关键词：应该搜索每个关键词并返回结果的并集（去重）

## 修复方案

### 方案一：修改题库页面以支持多关键词并集搜索（推荐）

修改 `app/question-bank/page.tsx` 中的搜索逻辑，当有多个AI关键词时，对每个关键词进行搜索并合并结果。

```typescript
// 修改搜索逻辑部分
if (isFromAiChat && aiKeywords.length > 0) {
  console.log('使用AI关键词进行搜索:', aiKeywords);
  
  if (aiKeywords.length === 1) {
    // 单个关键词，直接搜索
    const response = await questionApi.getQuestions({
      subject: selectedSubject !== 'all' ? selectedSubject : undefined,
      year: selectedYears.includes('all') ? undefined : selectedYears,
      question_type: !selectedQuestionTypes.includes('全部题型') ? selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题' : undefined,
      search: aiKeywords[0],
      page: pagination.currentPage,
      limit: pagination.perPage
    });
    questionsData = response;
  } else {
    // 多个关键词，搜索并集
    const allQuestions = new Map(); // 使用Map去重
    let totalFound = 0;
    
    // 对每个关键词进行搜索
    for (const keyword of aiKeywords) {
      const response = await questionApi.getQuestions({
        subject: selectedSubject !== 'all' ? selectedSubject : undefined,
        year: selectedYears.includes('all') ? undefined : selectedYears,
        question_type: !selectedQuestionTypes.includes('全部题型') ? selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题' : undefined,
        search: keyword,
        page: 1,
        limit: 100 // 获取更多结果以便合并
      });
      
      if (response.success && response.data.questions) {
        response.data.questions.forEach(q => {
          if (!allQuestions.has(q.id)) {
            allQuestions.set(q.id, q);
          }
        });
      }
    }
    
    // 转换为数组并分页
    const mergedQuestions = Array.from(allQuestions.values());
    const startIdx = (pagination.currentPage - 1) * pagination.perPage;
    const endIdx = startIdx + pagination.perPage;
    const paginatedQuestions = mergedQuestions.slice(startIdx, endIdx);
    
    // 构造响应格式
    questionsData = {
      success: true,
      data: {
        questions: paginatedQuestions,
        pagination: {
          total: mergedQuestions.length,
          totalPages: Math.ceil(mergedQuestions.length / pagination.perPage),
          currentPage: pagination.currentPage,
          perPage: pagination.perPage
        }
      }
    };
  }
}
```

### 方案二：使用专门的多关键词搜索API

创建或使用已有的 `/api/exams/questions/search` 端点，该端点已经支持多关键词搜索并返回并集结果。

修改题库页面使用这个API：

```typescript
if (isFromAiChat && aiKeywords.length > 0) {
  // 使用专门的搜索API
  const response = await fetch('/api/exams/questions/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      keywords: aiKeywords,
      subject: selectedSubject !== 'all' ? selectedSubject : undefined,
      year: selectedYears.includes('all') ? undefined : selectedYears,
      questionType: !selectedQuestionTypes.includes('全部题型') ? 
        (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
      page: pagination.currentPage,
      limit: pagination.perPage
    })
  });
  
  const data = await response.json();
  questionsData = data;
}
```

### 方案三：统一搜索逻辑

将搜索逻辑抽取为独立的函数，确保AI跳转搜索和直接搜索使用完全相同的逻辑。

## 建议实施步骤

1. **选择方案一**（最简单直接）
2. **添加日志记录**以便调试
3. **创建测试用例**验证单词和多词搜索的一致性
4. **优化性能**：对于多关键词搜索，可以并行请求而不是顺序请求

## 测试验证

使用已创建的测试页面 `test-ai-search-consistency.html` 进行验证：

1. 测试单个关键词（如"盗窃"）的搜索结果一致性
2. 测试多个关键词（如"盗窃,抢劫"）的并集搜索
3. 验证分页功能正常工作
4. 确认搜索结果的排序逻辑一致