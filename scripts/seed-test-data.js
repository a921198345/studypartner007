require('dotenv').config();
const { pool } = require('../config/database');

// 示例测试数据
const sampleQuestions = [
  {
    subject: '民法',
    year: 2023,
    question_type: 'single',
    question_text: '根据我国民法典规定，下列关于民事法律行为的效力说法正确的是：',
    options_json: JSON.stringify({
      A: '行为人与相对人恶意串通，损害他人合法权益的民事法律行为无效',
      B: '行为人与相对人恶意串通，损害国家利益的民事法律行为可撤销',
      C: '基于重大误解实施的民事法律行为无效',
      D: '显失公平的民事法律行为自始无效'
    }),
    correct_answer: 'A',
    explanation_text: '《民法典》第一百五十四条规定，行为人与相对人恶意串通，损害他人合法权益的民事法律行为无效。第一百五十七条规定，基于重大误解实施的民事法律行为，行为人有权请求人民法院或者仲裁机构予以撤销。所以C选项错误。第一百五十一条规定，一方利用对方处于危困状态、缺乏判断能力等情形，致使民事法律行为成立时显失公平的，受损害方有权请求人民法院或者仲裁机构予以撤销。所以D选项错误。所以本题选A。',
    difficulty: 3
  },
  {
    subject: '民法',
    year: 2023,
    question_type: 'multiple',
    question_text: '下列关于建筑物区分所有权的说法中，正确的有：',
    options_json: JSON.stringify({
      A: '建筑区划内的道路属于业主共有',
      B: '建筑区划内的绿地可以由部分业主专有',
      C: '建筑物的承重结构属于业主共有',
      D: '建筑物的外墙属于业主共有'
    }),
    correct_answer: 'ACD',
    explanation_text: '《民法典》第二百七十四条规定："建筑区划内的道路，属于业主共有，但是属于城镇公共道路的除外。建筑区划内的绿地，属于业主共有，但是属于城镇公共绿地或者明示属于个人的除外。建筑区划内的其他公共场所、公用设施和物业服务用房，属于业主共有。"因此A正确，B错误。《民法典》第二百七十三条规定："建筑物内的住宅、经营性用房等专有部分以外的共有部分，属于业主共有。以下共有部分，不能分割转让以及设定抵押权或者单独赠与：（一）建筑物的基础、承重结构、外墙、屋顶等基本结构；（二）建筑物的电梯等必要的公共设备、场所。"因此C、D正确。本题选ACD。',
    difficulty: 4
  },
  {
    subject: '民法',
    year: 2022,
    question_type: 'judge',
    question_text: '民事诉讼的既判力只及于判决主文，而不及于判决理由。',
    options_json: JSON.stringify({
      A: '正确',
      B: '错误'
    }),
    correct_answer: 'B',
    explanation_text: '《民事诉讼法》理论认为，既判力不仅及于判决主文，也及于判决理由中对实体权利义务关系的判断。例如，在确认房屋买卖合同无效的诉讼中，法院以买卖合同无效为由，驳回原告要求被告交付房屋的诉讼请求，那么在后诉中，该买卖合同被确认无效的判断对后诉具有既判力，当事人不得再主张买卖合同有效。本题说法错误。',
    difficulty: 5
  },
  {
    subject: '刑法',
    year: 2023,
    question_type: 'single',
    question_text: '甲欲实施故意伤害罪，朝乙腹部猛刺一刀，导致乙当场死亡。以下关于甲的定罪说法正确的是：',
    options_json: JSON.stringify({
      A: '甲主观上有伤害的故意，但不具有杀人的故意，应当以故意伤害罪定罪处罚',
      B: '甲的主观恶性大，客观危害后果严重，应当以故意杀人罪定罪处罚',
      C: '甲对乙的死亡持放任态度，应认定为间接故意杀人，以故意杀人罪定罪处罚',
      D: '甲对乙的死亡结果应有预见，但轻信能够避免，属于过失致人死亡罪'
    }),
    correct_answer: 'A',
    explanation_text: '本题考查间接故意与直接故意的区分。甲对乙实施伤害行为，没有证据表明其有杀人的故意或对乙的死亡持放任态度。在刑法理论中，行为人只有故意伤害的故意，造成被害人死亡的，应当以故意伤害罪（致人死亡）定罪处罚。故本题答案选A。',
    difficulty: 3
  },
  {
    subject: '刑法',
    year: 2022,
    question_type: 'multiple',
    question_text: '关于共同犯罪的说法，下列哪些是正确的？',
    options_json: JSON.stringify({
      A: '教唆犯罪是指故意唆使他人犯罪的行为',
      B: '被胁迫者承担刑事责任的，应当减轻或者免除处罚',
      C: '共同犯罪的成立要件之一是犯罪行为具有关联性',
      D: '犯罪集团的首要分子对集团所犯的全部犯罪承担全部责任'
    }),
    correct_answer: 'ABCD',
    explanation_text: '《刑法》第二十九条规定："教唆他人犯罪的，应当按照他在共同犯罪中所起的作用处罚。"教唆犯罪是指故意唆使他人犯罪的行为，A正确。《刑法》第二十九条规定："对于被胁迫参加犯罪的，应当按照他的犯罪情节减轻处罚或者免除处罚。"B正确。共同犯罪的成立要件之一是犯罪行为具有关联性，C正确。《刑法》第二十六条规定："组织、领导犯罪集团进行犯罪活动的或者在犯罪集团中起主要作用的，是犯罪集团的首要分子，应当按照集团所犯的全部罪行处罚。"D正确。本题选ABCD。',
    difficulty: 4
  }
];

// 插入示例数据
const seedTestData = async () => {
  try {
    for (const question of sampleQuestions) {
      const sql = `
        INSERT INTO questions 
        (subject, year, question_type, question_text, options_json, correct_answer, explanation_text, difficulty) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // 确保options_json是字符串
      const options = typeof question.options_json === 'string' 
        ? question.options_json 
        : JSON.stringify(question.options_json);
      
      await pool.execute(sql, [
        question.subject,
        question.year,
        question.question_type,
        question.question_text,
        options,
        question.correct_answer,
        question.explanation_text,
        question.difficulty
      ]);
      
      console.log(`Added question: ${question.question_text.substring(0, 30)}...`);
    }
    
    console.log(`Successfully added ${sampleQuestions.length} test questions to the database.`);
    return true;
  } catch (error) {
    console.error('Error seeding test data:', error);
    return false;
  }
};

// 如果直接运行此脚本，则执行数据填充
if (require.main === module) {
  seedTestData()
    .then(success => {
      if (success) {
        console.log('Test data seeding completed successfully');
        process.exit(0);
      } else {
        console.error('Test data seeding failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error during data seeding:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { seedTestData }; 