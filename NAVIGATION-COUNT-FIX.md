# 题目导航数量显示修复

## 问题描述
从AI聊天页面跳转到题库页面后，筛选条件正确应用（如显示33道题），但点击进入题目详情页时，题目导航显示的总数不正确（可能显示全部958道题而不是筛选后的33道题）。

## 问题原因
1. 题库页面在筛选题目后，只有当结果数量≤100时才会获取完整的题目ID列表
2. 当筛选结果超过100道题时，不会保存完整列表到localStorage
3. 题目详情页读取不到完整的筛选列表，导致导航显示错误的题目总数

## 修复方案

### 1. 题库页面修改 (`app/question-bank/page.tsx`)
- 将获取完整题目列表的阈值从100提高到200
- 对于超过200道题的情况，保存`actualTotal`字段记录实际筛选总数
- 添加`partial`标记表示这是部分数据

```javascript
} else if (newTotal <= 200) {
  // 题目数量不太多时获取完整列表
  fetchAllFilteredQuestionInfoAndSave(newTotal, {...});
} else {
  // 题目数量太多时，只保存基本信息
  localStorage.setItem('filteredQuestionsList', JSON.stringify({
    questions: [],
    actualTotal: newTotal, // 保存实际总数
    partial: true
  }));
}
```

### 2. 题目详情页修改 (`app/question-bank/[id]/page.tsx`)
- 增强导航初始化逻辑，支持处理部分数据的情况
- 当没有完整列表但有`actualTotal`时，创建虚拟列表用于导航
- 确保导航显示正确的筛选后题目总数

```javascript
} else if (filteredData.actualTotal) {
  // 没有完整列表但有实际总数
  const totalCount = filteredData.actualTotal;
  questionsToDisplay = Array.from({ length: totalCount }, (_, i) => ({ 
    id: i + 1, 
    question_code: `题目${i + 1}` 
  }));
}
```

## 测试场景
1. 筛选少量题目（如33道）- 应该获取完整列表并正确显示
2. 筛选中等数量题目（如100道）- 应该获取完整列表并正确显示
3. 筛选大量题目（如300道）- 使用虚拟列表，仍能正确显示总数
4. AI搜索跳转（如"盗窃"55道）- 应该正确显示搜索结果数量

## 测试文件
- `test-navigation-count-fix.html` - 用于测试和验证修复效果

## 注意事项
1. 性能考虑：不能无限制地获取所有题目ID，需要设置合理的阈值
2. 用户体验：即使没有完整列表，导航也应该显示正确的题目总数
3. 兼容性：需要同时支持有完整列表和只有总数两种情况