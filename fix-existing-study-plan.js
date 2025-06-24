// 修复现有学习计划数据的脚本
// 可以在浏览器控制台中运行

(function fixExistingStudyPlan() {
  console.log('=== 开始修复现有学习计划 ===');
  
  const savedPlan = localStorage.getItem('current-study-plan');
  
  if (!savedPlan) {
    console.log('❌ 没有找到保存的学习计划');
    return;
  }
  
  try {
    const plan = JSON.parse(savedPlan);
    console.log('原始计划数据:', plan);
    
    // 检查是否需要修复
    if (plan.generatedContent && 
        plan.generatedContent.dailyPlan && 
        plan.generatedContent.weeklyPlan && 
        plan.generatedContent.overallStrategy) {
      console.log('✓ 计划数据结构正常，无需修复');
      return;
    }
    
    console.log('⚠️ 检测到数据结构问题，开始修复...');
    
    // 构建修复后的generatedContent
    const fixedGeneratedContent = {
      overallStrategy: plan.generatedContent?.overallStrategy || plan.overallStrategy || 
        `## 总体学习策略\n\n### 第一阶段：基础知识学习\n- 系统学习各科目基础知识\n- 每天学习${plan.study_schedule?.daily_hours || 2}小时\n\n### 第二阶段：深入理解\n- 深入理解重点法条\n- 开始做练习题\n\n### 第三阶段：冲刺复习\n- 大量做题\n- 查漏补缺`,
      
      dailyPlan: plan.generatedContent?.dailyPlan || plan.dailyPlan || 
        `## 今日学习任务\n\n□ 任务1：学习今日重点内容（1小时）\n□ 任务2：复习昨日知识点（30分钟）\n□ 任务3：完成练习题（30分钟）`,
      
      weeklyPlan: plan.generatedContent?.weeklyPlan || plan.weeklyPlan || 
        `## 本周学习计划\n\n### 周一至周三\n□ 完成本周重点章节学习\n□ 复习上周内容\n\n### 周四至周五\n□ 练习题训练\n□ 案例分析\n\n### 周末\n□ 本周知识点总结\n□ 错题复习`,
      
      generatedAt: plan.generatedContent?.generatedAt || new Date().toISOString(),
      settings: plan.generatedContent?.settings || {
        dailyHours: plan.study_schedule?.daily_hours || 2,
        weeklyDays: plan.study_schedule?.weekly_days || 5,
        subjects: plan.subjects || []
      }
    };
    
    // 修复计划数据
    const fixedPlan = {
      ...plan,
      generatedContent: fixedGeneratedContent,
      lastUpdated: new Date().toISOString()
    };
    
    // 确保必要字段存在
    if (!fixedPlan.id) fixedPlan.id = Date.now().toString();
    if (!fixedPlan.title) fixedPlan.title = "我的学习计划";
    if (!fixedPlan.description) fixedPlan.description = "AI智能生成的个性化学习计划";
    if (!fixedPlan.subjects || fixedPlan.subjects.length === 0) {
      fixedPlan.subjects = ["民法", "刑法"]; // 默认科目
    }
    if (!fixedPlan.totalWeeks) fixedPlan.totalWeeks = 12;
    if (!fixedPlan.currentWeek) fixedPlan.currentWeek = 1;
    if (!fixedPlan.progressPercentage) fixedPlan.progressPercentage = 0;
    if (!fixedPlan.createdAt) fixedPlan.createdAt = new Date().toISOString();
    
    // 保存修复后的数据
    localStorage.setItem('current-study-plan', JSON.stringify(fixedPlan));
    
    console.log('✓ 计划已成功修复！');
    console.log('修复后的计划数据:', fixedPlan);
    console.log('请刷新页面查看效果');
    
    // 返回修复结果
    return {
      success: true,
      original: plan,
      fixed: fixedPlan
    };
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
})();