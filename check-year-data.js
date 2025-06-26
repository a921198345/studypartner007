// 检查数据库中各年份的题目数量
import mysql from 'mysql2/promise';

async function checkYearData() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'law_user',
      password: process.env.DB_PASSWORD || 'your_password',
      database: process.env.DB_NAME || 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查数据库中各年份的题目数量...\n');
    
    // 1. 获取所有年份的题目数量
    const [yearCounts] = await connection.execute(
      'SELECT year, COUNT(*) as count FROM questions GROUP BY year ORDER BY year DESC',
      []
    );

    console.log('📊 各年份题目数量:');
    let totalQuestions = 0;
    yearCounts.forEach(row => {
      console.log(`${row.year}年: ${row.count} 道题`);
      totalQuestions += row.count;
    });
    console.log(`\n总计: ${totalQuestions} 道题`);

    // 2. 检查2023年是否有数据
    const [year2023] = await connection.execute(
      'SELECT COUNT(*) as count FROM questions WHERE year = 2023',
      []
    );
    
    console.log(`\n✅ 2023年题目数量: ${year2023[0].count}`);
    
    if (year2023[0].count === 0) {
      console.log('⚠️  警告: 数据库中没有2023年的题目！');
      console.log('这就是为什么选择2019+2023年时，仍然只显示81道题的原因。');
    }

    // 3. 检查2019+2023年的组合查询
    const [combined] = await connection.execute(
      'SELECT COUNT(*) as count FROM questions WHERE year IN (2019, 2023)',
      []
    );
    
    console.log(`\n🔍 查询2019+2023年的题目总数: ${combined[0].count}`);
    
    // 4. 列出前5个2023年的题目（如果有的话）
    const [samples2023] = await connection.execute(
      'SELECT id, subject, question_text FROM questions WHERE year = 2023 LIMIT 5',
      []
    );
    
    if (samples2023.length > 0) {
      console.log('\n2023年题目示例:');
      samples2023.forEach(q => {
        console.log(`- ID ${q.id}: ${q.subject} - ${q.question_text.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果需要添加2023年的测试数据，运行这个函数
async function addTest2023Data() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'law_user',
      password: process.env.DB_PASSWORD || 'your_password',
      database: process.env.DB_NAME || 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('\n📝 准备添加2023年测试数据...');
    
    // 添加几道2023年的测试题目
    const testQuestions = [
      {
        subject: '刑法',
        year: 2023,
        question_type: 1,
        question_text: '2023年刑法测试题1：关于新修订的刑法条文...',
        options_json: JSON.stringify({
          A: '选项A',
          B: '选项B',
          C: '选项C',
          D: '选项D'
        }),
        correct_answer: 'A',
        explanation_text: '这是2023年的测试题目解析'
      },
      {
        subject: '民法',
        year: 2023,
        question_type: 1,
        question_text: '2023年民法测试题1：关于民法典的新规定...',
        options_json: JSON.stringify({
          A: '选项A',
          B: '选项B',
          C: '选项C',
          D: '选项D'
        }),
        correct_answer: 'B',
        explanation_text: '这是2023年的测试题目解析'
      }
    ];

    for (const q of testQuestions) {
      await connection.execute(
        `INSERT INTO questions (subject, year, question_type, question_text, options_json, correct_answer, explanation_text) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [q.subject, q.year, q.question_type, q.question_text, q.options_json, q.correct_answer, q.explanation_text]
      );
    }

    console.log('✅ 成功添加2023年测试数据');

  } catch (error) {
    console.error('❌ 添加数据失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行检查
checkYearData();

// 如果需要添加测试数据，取消下面的注释
// addTest2023Data();