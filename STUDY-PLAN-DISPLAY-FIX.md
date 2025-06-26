# 学习计划显示问题分析与解决方案

## 问题分析

### 根本原因
从代码分析发现，学习计划无法显示的根本原因是：**数据结构不匹配**

1. **页面期望的数据结构**（`app/learning-plan/page.tsx` 第242-348行）：
   - 页面检查是否存在 `currentPlan.generatedContent`
   - 如果没有 `generatedContent`，会显示"学习计划未完成"的提示

2. **实际保存的数据结构**：
   - 从 `PlanPreviewSimple` 组件（第113-122行）可以看到，计划确认时会创建一个包含 `generatedContent` 的完整数据结构
   - 但这个数据可能没有正确保存到 localStorage

### 问题定位

1. **数据传递流程**：
   ```
   StudyPlanWizardV2 → PlanPreviewSimple → handleConfirmPlan → onComplete(父组件回调)
   ```

2. **关键代码分析**：
   - `PlanPreviewSimple.handleConfirmPlan` (第113-122行) 正确创建了包含 `generatedContent` 的数据
   - `page.tsx` 的 `handlePlanGenerated` (第110-170行) 应该接收这个数据
   - 但第120-130行的处理逻辑可能导致 `generatedContent` 丢失

## 问题原因

在 `page.tsx` 的 `handlePlanGenerated` 函数中（第120-130行）：

```typescript
// 确保获取到正确的生成内容
const generatedContent = planData.generatedContent || {
  overallStrategy: planData.overallStrategy || '',
  dailyPlan: planData.dailyPlan || '',
  weeklyPlan: planData.weeklyPlan || '',
  generatedAt: new Date().toISOString(),
  settings: {
    dailyHours: planData.study_schedule?.daily_hours || 2,
    weeklyDays: planData.study_schedule?.weekly_days || 5,
    subjects: activeSubjects
  }
}
```

这段代码试图从 `planData` 中提取 `generatedContent`，但实际上 `PlanPreviewSimple` 传递的数据中，AI生成的内容已经在 `generatedContent` 字段中了。

## 解决方案

### 临时解决方案（用户可立即使用）

1. 在浏览器中打开 `/test-study-plan-display.html`
2. 点击"修复计划结构"按钮
3. 刷新学习计划页面

### 永久解决方案（代码修复）

修改 `app/learning-plan/page.tsx` 的 `handlePlanGenerated` 函数：

```typescript
const handlePlanGenerated = async (planData: any) => {
  try {
    console.log('收到的计划数据:', planData)
    
    // 直接使用传递过来的数据，不需要重新构造
    const newPlan: StudyPlan = {
      id: Date.now().toString(),
      title: "我的学习计划",
      description: "AI智能生成的个性化学习计划",
      subjects: planData.subjects || Object.keys(planData.subject_progress || {}).filter(
        subject => planData.subject_progress[subject]?.status !== 'completed'
      ),
      totalWeeks: planData.stats?.estimatedWeeks || 12,
      currentWeek: 1,
      progressPercentage: 0,
      generatedContent: planData.generatedContent, // 直接使用
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
    
    console.log('最终保存的计划:', newPlan)
    
    // 保存到状态和本地存储
    setCurrentPlan(newPlan)
    localStorage.setItem("current-study-plan", JSON.stringify(newPlan))
    
    // 关闭向导
    setShowPlanWizard(false)
    
    toast({
      title: "学习计划创建成功！",
      description: "您的个性化学习计划已生成，开始学习之旅吧！"
    })
    
  } catch (error) {
    console.error('保存计划失败:', error)
    toast({
      variant: "destructive",
      title: "保存计划失败",
      description: "请重试"
    })
  }
}
```

## 验证步骤

1. 修改代码后，重新创建学习计划
2. 检查 localStorage 中的数据结构是否包含 `generatedContent`
3. 刷新页面，确认计划能正常显示

## 调试工具

已创建调试工具：`/public/test-study-plan-display.html`

功能：
- 检查 localStorage 数据
- 分析数据结构问题
- 提供一键修复功能
- 创建测试计划