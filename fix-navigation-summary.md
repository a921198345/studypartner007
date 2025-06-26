# 导航数量显示问题修复总结

## 问题描述
1. 题目列表页显示"共 72 道题目"（选择2021年）
2. 进入题目详情页后，导航显示"第1/1页 (25题)"
3. 实际应该显示"第1/3页 (72题)"

## 问题原因
1. **数据保存问题**：虽然API返回了72条记录，但可能没有正确保存到localStorage
2. **数据读取问题**：导航页在读取筛选数据时，可能使用了错误的字段
3. **备用方案问题**：当找不到筛选数据时，API请求没有包含筛选条件，导致返回默认的25条记录

## 已实施的修复

### 1. 修复导航页的总数计算逻辑
- 文件：`/app/question-bank/[id]/page.tsx`
- 修改：优先使用`actualTotal`字段，确保显示正确的总数

### 2. 修复备用API请求
- 文件：`/app/question-bank/[id]/page.tsx`
- 修改：当找不到筛选数据时，从URL参数恢复筛选条件进行API请求

## 验证步骤
1. 刷新题目列表页面
2. 选择2021年
3. 点击任意题目进入详情页
4. 检查导航是否显示"第1/3页 (72题)"

## 如果问题仍然存在
在浏览器控制台运行以下代码查看数据：
```javascript
// 查看筛选数据
const data = localStorage.getItem('filteredQuestionsList');
if (data) {
  const parsed = JSON.parse(data);
  console.log('题目数量:', parsed.questions?.length);
  console.log('actualTotal:', parsed.actualTotal);
  console.log('筛选条件:', parsed.filters);
}
```

## 临时解决方案
如果导航仍显示错误，在题目列表页面运行：
```javascript
// 手动保存2021年的题目数据
fetch('/api/exams/questions?year=2021&fetchAllIdsAndCodes=true')
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data) {
      const questions = data.data.questions.map(q => ({
        id: q.id,
        question_code: q.question_code
      }));
      
      localStorage.setItem('filteredQuestionsList', JSON.stringify({
        questions: questions,
        filters: { years: ['2021'] },
        actualTotal: questions.length,
        timestamp: Date.now()
      }));
      
      console.log('✅ 已保存', questions.length, '条题目');
    }
  });
```