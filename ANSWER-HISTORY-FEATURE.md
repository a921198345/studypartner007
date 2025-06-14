# 答题历史功能实现

## 功能概述
在真题库页面左下角，将原来的"学习统计"替换为"答题历史"功能，记录用户的答题会话，支持继续练习和重新练习。

## 实现细节

### 1. 答题历史组件
- **文件**: `/components/question-bank/answer-history.tsx`
- **功能**:
  - 显示历史答题会话列表
  - 每个会话显示：标题、时间、答题数、正确数、正确率
  - 支持"继续练习"和"重新练习"操作
  - 时间显示：刚刚、n分钟前、n小时前、今天、昨天、n天前

### 2. 答题会话管理
- **文件**: `/lib/answer-sessions.js`
- **功能**:
  - `createAnswerSession`: 创建新会话
  - `updateCurrentSession`: 更新当前会话进度
  - `endCurrentSession`: 结束会话并保存到历史
  - `getCurrentSession`: 获取当前会话
  - `getOrCreateSession`: 获取或创建会话

### 3. 数据结构
```javascript
// 答题会话
{
  sessionId: string,        // 会话ID
  startTime: string,        // 开始时间
  endTime?: string,         // 结束时间
  questionsAnswered: number, // 已答题数
  correctCount: number,      // 答对题数
  lastQuestionId: number,    // 最后答题ID
  filters: {                 // 筛选条件
    subject?: string,
    years?: string[],
    types?: string[],
    search?: string
  }
}
```

### 4. 使用方式

#### 开始新练习
1. 点击"开始练习"时创建新会话
2. 记录当前筛选条件
3. 跳转到第一题

#### 继续练习
1. 恢复会话的筛选条件
2. 跳转到上次答题位置
3. 保持答题进度

#### 重新练习
1. 清空答题记录
2. 恢复会话的筛选条件
3. 创建新会话
4. 从第一题开始

### 5. 集成位置
- **真题库页面**: `/app/question-bank/page.tsx`
  - 导入 `AnswerHistory` 组件
  - 替换原有的学习统计卡片
  - 开始练习时创建会话

- **答题页面**: `/app/question-bank/[id]/page.tsx`
  - 导入 `updateCurrentSession`
  - 提交答案后更新会话进度

## 测试步骤

1. 访问真题库页面
2. 查看左下角答题历史
3. 开始新的练习
4. 答几道题后返回题库
5. 查看答题历史是否记录
6. 测试"继续练习"功能
7. 测试"重新练习"功能

## 状态
✅ 功能已实现完成