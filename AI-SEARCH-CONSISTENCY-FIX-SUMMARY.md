# AI聊天搜索一致性修复总结

## 问题描述

用户反馈从AI聊天页面点击"相关真题"按钮跳转到题库时，搜索结果与直接在题库搜索的结果不一致：
- 单个词的展示结果应该与在题库搜索框展示的一样
- 多个词应该是多个词搜索结果并集的展示

## 问题原因

原代码中，AI跳转搜索时只使用了第一个关键词：
```typescript
const mainKeyword = aiKeywords[0];
// 只使用主关键词搜索
```

这导致了多关键词场景下，只搜索第一个关键词，丢失了其他关键词的搜索结果。

## 实施的解决方案

### 1. 修改题库页面搜索逻辑 (`app/question-bank/page.tsx`)

- **单关键词搜索**：保持与直接搜索完全一致
- **多关键词搜索**：实现并集搜索功能
  - 并行搜索所有关键词
  - 使用Map去重合并结果
  - 按匹配关键词数量排序（匹配多个的排在前面）

### 2. 更新相关题目按钮 (`components/ai-chat/RelatedQuestionsButton.tsx`)

- 支持提取多个相关关键词
- 添加相关术语映射（如"盗窃"→["盗窃", "抢夺"]）
- 优先使用AI提取多关键词，降级到单关键词

### 3. 增强的高亮显示

- 支持多关键词高亮
- 不同关键词使用不同颜色（黄色、蓝色）
- 在搜索结果中清晰显示匹配的关键词

### 4. 更新localStorage缓存逻辑

- 单关键词：直接获取所有结果ID
- 多关键词：获取每个关键词的结果并合并

## 主要代码变更

### 题库页面搜索逻辑

```typescript
if (aiKeywords.length === 1) {
  // 单个关键词，直接搜索
  const response = await questionApi.getQuestions({
    // ... 参数
    search: keyword,
  });
} else {
  // 多个关键词，并集搜索
  const allQuestions = new Map();
  
  // 并行搜索
  const searchPromises = aiKeywords.map(keyword => 
    questionApi.getQuestions({
      // ... 参数
      search: keyword,
    })
  );
  
  const searchResults = await Promise.all(searchPromises);
  
  // 合并结果（去重）
  searchResults.forEach((response, index) => {
    response.data.questions.forEach(q => {
      if (!allQuestions.has(q.id)) {
        allQuestions.set(q.id, { ...q, matched_keywords: [aiKeywords[index]] });
      }
    });
  });
  
  // 排序并分页
  const mergedQuestions = Array.from(allQuestions.values())
    .sort((a, b) => b.matched_keywords.length - a.matched_keywords.length);
}
```

## 测试验证

创建了两个测试页面：
1. `test-ai-search-consistency.html` - 验证AI跳转与直接搜索的一致性
2. `test-multi-keyword-search-fix.html` - 验证多关键词并集搜索功能

## 性能优化

- 使用Promise.all并行搜索多个关键词
- 限制关键词数量（最多3个）
- 使用Map数据结构高效去重

## 用户体验改进

1. **清晰的关键词显示**：在搜索结果上方显示所有搜索的关键词
2. **智能排序**：匹配多个关键词的题目优先显示
3. **视觉反馈**：不同关键词使用不同颜色高亮
4. **搜索提示**：显示"以下是 关键词1、关键词2 的相关题目"

## 后续建议

1. **考虑添加搜索模式选择**：
   - "全部匹配"模式（交集）
   - "任意匹配"模式（并集，当前实现）

2. **优化大量关键词场景**：
   - 当关键词超过3个时，考虑使用专门的批量搜索API

3. **添加搜索权重**：
   - 根据关键词在题目中的位置和频率计算相关性分数

4. **缓存优化**：
   - 缓存常见关键词组合的搜索结果
   - 实现更智能的缓存失效策略