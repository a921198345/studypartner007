/**
 * 数据库和Question模型测试脚本
 */

import { testConnection } from '../lib/db.js';
import Question from '../models/Question.js';

async function testDatabase() {
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      console.error('数据库连接测试失败');
      return;
    }
    
    console.log('开始Question模型测试...');
    
    // 测试创建题目
    const newQuestion = {
      subject: '民法',
      year: 2023,
      question_text: '关于民事法律行为效力，下列哪一选项是错误的？',
      options_json: {
        'A': '无民事行为能力人实施的民事法律行为无效',
        'B': '行为人与相对人恶意串通，损害第三人利益的民事法律行为无效',
        'C': '以欺诈手段使对方在违背真实意思的情况下实施的民事法律行为可撤销',
        'D': '违背公序良俗的民事法律行为无效'
      },
      correct_answer: 'C',
      explanation_text: '选项C错误。《民法典》第148条规定，一方以欺诈手段使对方在违背真实意思的情况下实施的民事法律行为，受欺诈方有权请求人民法院或者仲裁机构予以撤销。',
      question_type: 1 // 单选题
    };
    
    console.log('尝试创建测试题目...');
    const result = await Question.create(newQuestion);
    console.log('创建成功，插入ID:', result.insertId);
    
    // 测试查询题目
    console.log('尝试查询刚插入的题目...');
    const question = await Question.getById(result.insertId);
    console.log('查询结果:', question);
    
    // 测试按条件查询
    console.log('尝试按学科年份查询题目...');
    const questions = await Question.getBySubjectAndYear('民法', 2023, 1, 10);
    console.log(`共查询到 ${questions.length} 条题目`);
    
    // 清理测试数据
    console.log('清理测试数据...');
    await Question.delete(result.insertId);
    console.log('测试完成!');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 执行测试
testDatabase();