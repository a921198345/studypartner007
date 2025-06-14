# AI关键词题目数量显示修复

## 问题描述

从AI聊天页面点击"相关真题"跳转到题库页面时，显示的筛选题目数量不正确：
- 搜索"盗窃"应该显示7道题目，但显示了253道（刑法科目的总题数）
- 切换科目筛选后，题目数量显示错误
- AI关键词筛选状态在页面操作过程中丢失

## 根本原因

1. `actualTotalQuestions` 初始值设置为25，导致初始显示不正确
2. 切换科目时没有保持AI关键词搜索状态
3. AI搜索状态没有持久化，页面刷新或组件重新渲染时状态丢失
4. 缺少用户界面反馈，用户不清楚当前处于AI关键词筛选状态

## 修复方案

### 1. 修正初始值
```typescript
// 修改前
const [actualTotalQuestions, setActualTotalQuestions] = useState(25)

// 修改后
const [actualTotalQuestions, setActualTotalQuestions] = useState(0)
```

### 2. 持久化AI搜索状态
```typescript
// 保存AI搜索状态到sessionStorage
sessionStorage.setItem('aiSearchState', JSON.stringify({
  keywords: keywordArray,
  isFromAiChat: true,
  timestamp: Date.now()
}))

// 恢复AI搜索状态
const savedAiState = sessionStorage.getItem('aiSearchState')
if (savedAiState) {
  const state = JSON.parse(savedAiState)
  if (state.timestamp && Date.now() - state.timestamp < 3600000) {
    setAiKeywords(state.keywords || [])
    setIsFromAiChat(state.isFromAiChat || false)
  }
}
```

### 3. 保持科目切换时的AI状态
```typescript
const handleSubjectChange = (value: string) => {
  setSelectedSubject(value);
  setPagination(prev => ({ ...prev, currentPage: 1 }));
  
  // 保持AI关键词状态
  if (isFromAiChat && aiKeywords.length > 0) {
    console.log('学科切换，保持AI关键词搜索:', aiKeywords);
  }
};
```

### 4. 添加用户界面反馈
```tsx
{/* AI搜索提示和清除按钮 */}
{isFromAiChat && aiKeywords.length > 0 && (
  <div className="bg-blue-50 p-3 mb-4 rounded-md flex items-center justify-between">
    <div className="text-sm">
      <span className="text-gray-600">正在显示 </span>
      <span className="font-medium text-blue-600">{aiKeywords.join('、')}</span>
      <span className="text-gray-600"> 的相关题目</span>
    </div>
    <Button onClick={clearAiFilter}>清除筛选</Button>
  </div>
)}
```

### 5. 添加调试信息
```tsx
{process.env.NODE_ENV === 'development' && (
  <div className="bg-gray-100 p-3 mb-4 rounded text-sm">
    <p>显示题目总数：{actualTotalQuestions}</p>
  </div>
)}
```

## 测试验证

1. **AI关键词跳转测试**
   - 访问: `/question-bank?subject=刑法&keywords=盗窃&source=ai-chat`
   - 期望: 显示"共 7 道题目"

2. **科目切换测试**
   - 在AI筛选状态下切换科目
   - 期望: 保持AI关键词筛选，题目数量正确

3. **页面刷新测试**
   - 刷新页面
   - 期望: AI筛选状态保持，显示正确的题目数量

4. **清除筛选测试**
   - 点击"清除筛选"按钮
   - 期望: 显示当前科目的所有题目

## 文件修改

- `/app/question-bank/page.tsx`: 主要修复逻辑
- 创建测试文件: `test-ai-keyword-count-fix.html`

## 注意事项

1. sessionStorage 用于存储临时状态，关闭标签页后会清除
2. AI搜索状态有效期设置为1小时，避免过期数据
3. 手动搜索会覆盖AI关键词筛选
4. 调试信息仅在开发环境显示