// 诊断学习计划显示问题
console.log('=== 诊断学习计划显示问题 ===');

// 1. 检查localStorage中的数据
const savedPlan = localStorage.getItem('current-study-plan');
console.log('1. localStorage中的current-study-plan:');
if (savedPlan) {
  try {
    const planData = JSON.parse(savedPlan);
    console.log('   - 计划存在，数据结构:', planData);
    console.log('   - generatedContent字段:', planData.generatedContent);
    console.log('   - dailyPlan内容:', planData.generatedContent?.dailyPlan);
    console.log('   - weeklyPlan内容:', planData.generatedContent?.weeklyPlan);
    console.log('   - overallStrategy内容:', planData.generatedContent?.overallStrategy);
  } catch (e) {
    console.error('   - JSON解析错误:', e);
  }
} else {
  console.log('   - 没有找到保存的计划');
}

// 2. 检查其他相关的localStorage数据
console.log('\n2. 其他相关localStorage数据:');
console.log('   - daily-tasks:', localStorage.getItem('daily-tasks'));
console.log('   - weekly-tasks:', localStorage.getItem('weekly-tasks'));
console.log('   - completed-study-tasks:', localStorage.getItem('completed-study-tasks'));

// 3. 分析问题
console.log('\n3. 问题分析:');
if (savedPlan) {
  const plan = JSON.parse(savedPlan);
  if (!plan.generatedContent) {
    console.log('   ❌ 问题: 计划数据中缺少generatedContent字段');
    console.log('   - 这会导致页面显示"学习计划未完成"的提示');
  } else if (!plan.generatedContent.dailyPlan || !plan.generatedContent.weeklyPlan || !plan.generatedContent.overallStrategy) {
    console.log('   ❌ 问题: generatedContent中缺少必要的计划内容');
    console.log('   - dailyPlan存在:', !!plan.generatedContent.dailyPlan);
    console.log('   - weeklyPlan存在:', !!plan.generatedContent.weeklyPlan);
    console.log('   - overallStrategy存在:', !!plan.generatedContent.overallStrategy);
  } else {
    console.log('   ✓ 计划数据结构完整');
  }
}

// 4. 建议的修复方案
console.log('\n4. 修复建议:');
console.log('   - 检查StudyPlanWizardV2组件是否正确传递generatedContent');
console.log('   - 确保handlePlanGenerated函数正确处理AI生成的内容');
console.log('   - 可能需要检查AI接口返回的数据格式');