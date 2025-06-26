// 修复学习计划localStorage key不一致的问题

// 检查所有相关的localStorage keys
console.log('=== 检查学习计划相关的localStorage keys ===');

const keys = [
  'studyPlan',
  'current-study-plan',
  'study-plan-store',
  'currentStudyPlan'
];

keys.forEach(key => {
  const data = localStorage.getItem(key);
  if (data) {
    console.log(`\n发现数据 - key: ${key}`);
    try {
      const parsed = JSON.parse(data);
      console.log('数据内容:', parsed);
    } catch (e) {
      console.log('数据内容 (非JSON):', data);
    }
  }
});

// 将studyPlan的数据复制到current-study-plan
const studyPlanData = localStorage.getItem('studyPlan');
if (studyPlanData) {
  console.log('\n=== 开始修复 ===');
  console.log('从 studyPlan 复制数据到 current-study-plan...');
  
  try {
    const plan = JSON.parse(studyPlanData);
    
    // 确保数据结构正确
    if (plan && plan.generatedContent) {
      localStorage.setItem('current-study-plan', JSON.stringify(plan));
      console.log('✅ 修复成功！数据已复制到 current-study-plan');
      console.log('请刷新页面查看学习计划');
    } else {
      console.error('❌ studyPlan 数据结构不正确，缺少 generatedContent');
    }
  } catch (e) {
    console.error('❌ 解析 studyPlan 数据失败:', e);
  }
} else {
  console.log('\n❌ 未找到 studyPlan 数据');
  console.log('请确保已经生成了学习计划');
}

// 提供清理函数
window.cleanupStudyPlanKeys = () => {
  console.log('\n=== 清理多余的localStorage keys ===');
  const keysToRemove = ['studyPlan', 'currentStudyPlan'];
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`已删除: ${key}`);
    }
  });
  console.log('清理完成，保留 current-study-plan 作为主要存储key');
};

console.log('\n提示：运行 cleanupStudyPlanKeys() 可以清理多余的keys');