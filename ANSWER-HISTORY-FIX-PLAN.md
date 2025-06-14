# 答题历史功能修复方案

## 问题分析

### 当前状态
1. 答题历史使用 **localStorage** 存储（前端组件依赖）
2. 数据库 `user_answers` 表已存在但未被前端使用
3. 用户反馈"答过的题目不显示"可能因为：
   - 浏览器清除了缓存
   - 使用了不同的浏览器/设备
   - localStorage 数据丢失

### 系统架构
```
用户答题 
  ↓
提交答案 → API (/api/exams/questions/[id]/submit)
  ↓         ↓
保存到     保存到
localStorage  数据库(需登录)
  ↓         ↓
AnswerHistory组件
只读取localStorage ❌ 不读取数据库
```

## 修复方案

### 方案一：快速修复（推荐）
保持现有架构，优化 localStorage 使用：

1. **增加数据持久性检查**
```javascript
// 在 AnswerHistory 组件中增加数据恢复逻辑
const recoverAnswerHistory = async () => {
  // 如果本地没有数据，尝试从服务器恢复
  if (!localStorage.getItem('answerHistory')) {
    const response = await fetch('/api/exams/answers/history');
    if (response.ok) {
      const data = await response.json();
      // 转换数据格式并保存到 localStorage
    }
  }
};
```

2. **增加数据备份机制**
```javascript
// 定期备份到 sessionStorage
// 页面刷新时从 sessionStorage 恢复
```

### 方案二：完整重构
改造 AnswerHistory 组件支持双数据源：

1. **优先使用数据库数据**（已登录用户）
2. **降级到 localStorage**（未登录用户）
3. **实现数据同步机制**

## 立即可执行的步骤

### 1. 验证问题
```bash
# 在浏览器控制台执行
localStorage.getItem('answerHistory')
localStorage.getItem('answerSessions')
```

### 2. 手动恢复数据
如果数据丢失，可以：
- 从数据库恢复（如果用户已登录）
- 手动创建初始数据结构

### 3. 预防措施
- 增加数据有效性检查
- 实现自动备份机制
- 添加数据恢复功能

## 实施建议

1. **短期方案**（1-2小时）
   - 修复 localStorage 数据丢失问题
   - 增加数据恢复机制
   - 添加错误处理

2. **长期方案**（1-2天）
   - 实现完整的双数据源支持
   - 优化数据同步逻辑
   - 改进用户体验

## 测试用例

1. 清除浏览器数据后能否恢复历史
2. 切换浏览器/设备后的数据同步
3. 登录/未登录状态的数据处理
4. 大量答题记录的性能测试