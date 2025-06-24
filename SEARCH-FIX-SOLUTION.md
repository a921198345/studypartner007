# 知识导图搜索问题解决方案

## 问题诊断结果

经过深入分析，发现主要问题是：

1. **数据库中没有"民法"科目的题目**
   - 题目科目分布：理论法(379)、商经知(297)、刑事诉讼法(233)、刑法(224)、民事诉讼法(200)、三国法(148)、行政法(122)
   - 没有"民法"科目的题目

2. **包含"婚姻"关键词的题目分布**
   - 理论法: 8条
   - 三国法: 2条
   - 民事诉讼法: 2条
   - 商经知: 1条
   - 共计13条，但都不属于"民法"科目

3. **搜索逻辑的问题**
   - 从知识导图跳转时，会自动设置科目筛选为"民法"
   - 但数据库中没有民法题目，导致搜索结果为空

## 解决方案

### 方案1：修改知识导图跳转逻辑（推荐）

当从知识导图跳转到题库时，如果特定科目没有找到结果，自动扩展到所有科目搜索：

```javascript
// 在 app/question-bank/page.tsx 中修改搜索逻辑
if (searchResponse.data?.pagination?.total === 0 && selectedSubject !== 'all') {
  // 如果指定科目没有结果，尝试搜索所有科目
  console.log(`${selectedSubject}科目未找到结果，扩展到所有科目搜索`);
  const allSubjectsResponse = await questionApi.searchWithMultipleKeywords({
    keywords: aiKeywords,
    subject: undefined, // 不限制科目
    year: selectedYears,
    questionType: selectedQuestionTypes,
    page: pagination.currentPage,
    limit: pagination.perPage
  });
  
  if (allSubjectsResponse.success && allSubjectsResponse.data?.pagination?.total > 0) {
    questionsData = allSubjectsResponse;
    // 提示用户已扩展搜索范围
    toast({
      description: `${selectedSubject}科目中未找到相关题目，已显示所有科目的搜索结果`,
      duration: 5000,
    });
  }
}
```

### 方案2：上传正确的民法题目

如果确实需要民法题目，需要：
1. 准备包含民法题目的文档
2. 使用上传功能导入题目
3. 确保题目的subject字段正确设置为"民法"

### 方案3：映射科目关系

创建科目映射表，将某些内容自动归类到相应科目：
- 婚姻家庭相关 → 理论法/民事诉讼法
- 合同相关 → 商经知
- 等等

### 方案4：优化AI关键词处理

已实现的AI增强搜索功能可以：
1. 自动扩展同义词
2. 智能分词
3. 生成多种搜索模式

但需要配合正确的数据才能发挥作用。

## 立即可行的修复

1. **修改题库页面搜索逻辑**，当特定科目无结果时自动扩展搜索范围
2. **优化提示信息**，告知用户搜索范围已扩展
3. **检查并修复数据导入流程**，确保题目科目分类正确

## 测试验证

修复后可以通过以下方式验证：
1. 从知识导图点击"30婚姻家庭"
2. 应该能看到理论法等科目中的相关题目
3. 页面应提示搜索范围已扩展