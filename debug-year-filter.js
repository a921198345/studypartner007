// 调试年份筛选问题
console.log('🔍 调试年份筛选问题...\n');

// 在浏览器控制台运行以下代码来查看当前的筛选状态

console.log('1. 检查当前selectedYears状态:');
console.log('请在React DevTools中查看QuestionBankPage组件的selectedYears状态');

console.log('\n2. 监听年份选择变化:');
console.log('在handleYearChange函数中添加日志:');
console.log(`
const handleYearChange = (yearId, checked) => {
  console.log('年份选择变化:', { yearId, checked, currentYears: selectedYears });
  setSelectedYears(prev => {
    let newYears;
    if (yearId === 'all') {
      newYears = checked ? ['all'] : [];
    } else {
      // 关键：选择具体年份时，需要移除'all'
      newYears = prev.filter(y => y !== 'all');
      
      if (checked) {
        if (!newYears.includes(yearId)) {
          newYears.push(yearId);
        }
      } else {
        newYears = newYears.filter(y => y !== yearId);
      }

      // 如果没有选择任何年份，默认选择'all'
      if (newYears.length === 0) {
        newYears = ['all'];
      }
    }
    
    console.log('新的年份选择:', newYears);
    return newYears;
  });
};
`);

console.log('\n3. 检查API请求参数:');
console.log('在fetchQuestions中查看传递给API的参数:');
console.log(`
const apiParams = {
  subject: selectedSubject !== 'all' ? selectedSubject : undefined,
  year: selectedYears.includes('all') ? undefined : selectedYears,
  ...
};
console.log('API请求参数:', apiParams);
console.log('selectedYears当前值:', selectedYears);
`);

console.log('\n4. 可能的问题原因:');
console.log('- 初始状态selectedYears包含["all"]');
console.log('- 点击2020年时，可能没有正确移除"all"');
console.log('- 或者selectedYears同时包含了["all", "2020"]');

console.log('\n5. 临时修复方案:');
console.log('在控制台运行以下代码手动设置年份筛选:');
console.log(`
// 模拟点击2020年
const yearCheckbox = document.querySelector('input[type="checkbox"][value="2020"]');
if (yearCheckbox) {
  // 先取消全部年份
  const allCheckbox = document.querySelector('input[type="checkbox"][value="all"]');
  if (allCheckbox && allCheckbox.checked) {
    allCheckbox.click();
  }
  // 然后选择2020年
  if (!yearCheckbox.checked) {
    yearCheckbox.click();
  }
}
`);

console.log('\n6. 检查checkbox的实际值:');
console.log('运行以下代码查看所有年份checkbox的状态:');
console.log(`
document.querySelectorAll('.space-y-2 input[type="checkbox"]').forEach(cb => {
  const label = cb.parentElement.querySelector('span');
  console.log(label?.textContent, ':', cb.checked);
});
`);