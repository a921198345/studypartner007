# 题目导航数量显示问题最终修复

## 问题描述
从AI聊天页面跳转到题库页面后，搜索"故意杀人"返回33道题，但点击进入题目详情页时，题目导航只显示10道题，而不是完整的33道题。

## 问题原因分析

### 1. 异步执行时序问题
- 题库页面会发起两次API请求：
  - 第一次：获取当前页数据（limit: 10）用于显示
  - 第二次：获取完整数据（limit: 1000）用于导航
- 用户可能在第二次请求完成前就点击了题目，导致保存的是不完整的数据

### 2. 筛选条件匹配问题
- `handleQuestionClick` 函数在检查现有筛选数据时，对AI搜索的条件匹配不正确
- AI搜索使用 `aiKeywords` 字段，但检查逻辑只检查了 `search` 字段

### 3. 降级函数问题
- `createAndSaveNewNavigationState` 函数只保存当前页的题目（10条），而不是完整列表

## 修复方案

### 1. 修复筛选条件匹配逻辑
```javascript
// 检查搜索条件：要么都是AI搜索，要么都是普通搜索
((isFromAiChat && existingFilteredData.filters.aiKeywords && 
  arraysEqual(existingFilteredData.filters.aiKeywords, aiKeywords)) ||
 (!isFromAiChat && existingFilteredData.filters.search === (debouncedSearchQuery || '')))
```

### 2. 添加异步等待机制
```javascript
const handleQuestionClick = async (questionId: number, fromTab?: string) => {
  // 如果正在获取完整列表，等待一下
  if (isFetchingAllIds) {
    console.log('正在获取完整题目列表，请稍候...');
    let waitTime = 0;
    while (isFetchingAllIds && waitTime < 2000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitTime += 100;
    }
  }
  // ... 继续处理
}
```

### 3. 视觉反馈
- 在获取完整列表时，题目卡片会显示半透明并禁用点击
- AI搜索提示区域会显示"正在加载完整列表..."

### 4. 增强调试日志
- 添加了更详细的日志，包括原始筛选数据的输出
- 保存数据时输出完整的数据结构

## 测试文件
- `debug-localstorage.html` - 用于检查localStorage中的筛选数据
- `test-navigation-count-fix.html` - 用于测试导航数量显示

## 注意事项
1. 性能考虑：将获取完整列表的阈值提高到200，避免对大数据集的性能影响
2. 用户体验：添加视觉反馈，让用户知道系统正在准备数据
3. 容错处理：即使没有完整列表，也能通过 `actualTotal` 字段显示正确的总数

## 验证步骤
1. 从AI聊天页面搜索"故意杀人"
2. 跳转到题库页面，应该显示33道题
3. 等待"正在加载完整列表..."提示消失
4. 点击任意题目进入详情页
5. 题目导航应该显示完整的33道题，而不是10道