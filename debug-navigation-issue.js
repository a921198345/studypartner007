// 调试导航显示问题的脚本
// 在浏览器控制台中运行此脚本

console.log('🔍 开始诊断导航显示问题...\n');

// 1. 检查localStorage中的筛选数据
console.log('1. 检查localStorage中的筛选数据:');
const filteredData = localStorage.getItem('filteredQuestionsList');
if (filteredData) {
  const parsed = JSON.parse(filteredData);
  console.log('- 找到筛选数据');
  console.log('- 题目数量:', parsed.questions ? parsed.questions.length : 0);
  console.log('- actualTotal字段:', parsed.actualTotal);
  console.log('- partial标记:', parsed.partial);
  console.log('- 筛选条件:', parsed.filters);
  console.log('- 时间戳:', new Date(parsed.timestamp).toLocaleString());
  
  if (parsed.questions && parsed.questions.length > 0) {
    console.log('- 前5个题目ID:', parsed.questions.slice(0, 5).map(q => q.id));
  }
} else {
  console.log('❌ 未找到筛选数据');
}

// 2. 检查是否正确调用了fetchAllIdsAndCodes
console.log('\n2. 检查API调用情况:');
console.log('请确认在选择2021年后，控制台是否有以下日志:');
console.log('- "fetchAllFilteredQuestionInfoAndSave 被调用"');
console.log('- "执行SQL查询: SELECT id, question_code FROM questions WHERE year = ?"');
console.log('- "查询到 72 条记录"');
console.log('- "成功保存 72 条筛选后的题目信息到localStorage"');

// 3. 手动修复数据的方法
console.log('\n3. 临时修复方法:');
console.log('如果数据确实没有正确保存，可以在题目列表页面运行以下代码:');
console.log(`
// 手动触发获取完整题目列表
const yearFilter = '2021';
fetch(\`/api/exams/questions?year=\${yearFilter}&fetchAllIdsAndCodes=true\`)
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data && data.data.questions) {
      const allQuestions = data.data.questions.map(q => ({
        id: q.id,
        question_code: q.question_code || null
      }));
      
      localStorage.setItem('filteredQuestionsList', JSON.stringify({
        questions: allQuestions,
        filters: {
          subject: 'all',
          years: [yearFilter],
          types: ['全部题型'],
          search: ''
        },
        actualTotal: allQuestions.length,
        timestamp: Date.now()
      }));
      
      console.log('✅ 成功保存', allQuestions.length, '条题目到localStorage');
      console.log('现在进入题目详情页应该能看到正确的导航数量了');
    }
  });
`);

// 4. 检查可能的问题原因
console.log('\n4. 可能的问题原因:');
console.log('- fetchAllFilteredQuestionInfoAndSave函数没有被正确调用');
console.log('- API请求失败或返回格式不正确');
console.log('- localStorage保存失败（存储空间不足等）');
console.log('- 导航页面读取数据时解析错误');

console.log('\n请将以上信息反馈，以便进一步调试问题。');