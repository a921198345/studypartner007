// 检查刑法相关题目
import { pool } from './lib/db.js';

async function checkCriminalLawQuestions() {
  const connection = await pool.getConnection();
  
  try {
    console.log('=== 检查刑法相关题目 ===\n');
    
    // 1. 检查刑法题目数量
    const [criminalCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM questions WHERE subject = ?',
      ['刑法']
    );
    console.log(`刑法题目总数: ${criminalCount[0].count}`);
    
    // 2. 检查抢劫相关的题目
    const robberyKeywords = ['抢劫', '抢夺', '盗窃', '强奸', '杀人'];
    
    console.log('\n2. 检查刑法罪名相关题目:');
    for (const keyword of robberyKeywords) {
      const [results] = await connection.execute(
        `SELECT COUNT(*) as count FROM questions 
         WHERE (question_text LIKE ? OR options_json LIKE ? OR explanation_text LIKE ?)`,
        [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
      );
      
      console.log(`   "${keyword}": ${results[0].count} 条题目`);
      
      // 显示示例
      if (results[0].count > 0) {
        const [sample] = await connection.execute(
          `SELECT id, question_code, subject, question_text 
           FROM questions 
           WHERE question_text LIKE ?
           LIMIT 1`,
          [`%${keyword}%`]
        );
        
        if (sample.length > 0) {
          console.log(`      例: [${sample[0].subject}] ${sample[0].question_code}`);
          console.log(`          ${sample[0].question_text.substring(0, 60)}...`);
        }
      }
    }
    
    // 3. 检查一些刑法理论术语
    const theoreticalTerms = ['犯罪构成', '犯罪客体', '犯罪主体', '犯罪主观', '犯罪客观', '既遂', '未遂', '中止', '预备'];
    
    console.log('\n3. 检查刑法理论术语:');
    for (const term of theoreticalTerms) {
      const [results] = await connection.execute(
        `SELECT COUNT(*) as count FROM questions 
         WHERE (question_text LIKE ? OR options_json LIKE ? OR explanation_text LIKE ?)`,
        [`%${term}%`, `%${term}%`, `%${term}%`]
      );
      
      console.log(`   "${term}": ${results[0].count} 条题目`);
    }
    
    // 4. 显示几个刑法题目的示例
    console.log('\n4. 刑法题目示例:');
    const [criminalSamples] = await connection.execute(
      `SELECT id, question_code, subject, year, question_text 
       FROM questions 
       WHERE subject = ? 
       LIMIT 5`,
      ['刑法']
    );
    
    criminalSamples.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.question_code}] ${q.year}年`);
      console.log(`      ${q.question_text.substring(0, 80)}...`);
    });
    
    // 5. 测试模糊搜索
    console.log('\n5. 测试模糊搜索策略:');
    
    const fuzzyTests = [
      { keyword: '抢劫', desc: '包含"抢劫"' },
      { keyword: '转化', desc: '包含"转化"' },
      { keyword: '事后', desc: '包含"事后"' },
      { keyword: '客观', desc: '包含"客观"' },
      { keyword: '处分', desc: '包含"处分"' },
      { keyword: '行为', desc: '包含"行为"' }
    ];
    
    for (const test of fuzzyTests) {
      const [results] = await connection.execute(
        `SELECT COUNT(*) as count FROM questions 
         WHERE question_text LIKE ?`,
        [`%${test.keyword}%`]
      );
      
      console.log(`   ${test.desc}: ${results[0].count} 条`);
      
      if (results[0].count > 0 && results[0].count <= 3) {
        // 如果结果不多，显示具体题目
        const [samples] = await connection.execute(
          `SELECT question_code, subject, question_text 
           FROM questions 
           WHERE question_text LIKE ?
           LIMIT 3`,
          [`%${test.keyword}%`]
        );
        
        samples.forEach(s => {
          console.log(`      - [${s.subject}] ${s.question_code}: ${s.question_text.substring(0, 50)}...`);
        });
      }
    }
    
  } catch (error) {
    console.error('检查过程出错:', error);
  } finally {
    connection.release();
  }
}

// 运行检查
checkCriminalLawQuestions()
  .then(() => {
    console.log('\n检查完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  });