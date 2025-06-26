// 检查数据库中year字段的数据类型
import mysql from 'mysql2/promise';

async function checkYearType() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查year字段的数据类型...\n');
    
    // 检查几个2022年题目的year字段
    const [rows] = await connection.execute(
      'SELECT id, year, CAST(year AS CHAR) as year_str FROM questions WHERE year = 2022 OR year = "2022" LIMIT 5',
      []
    );

    console.log('📊 查询结果:');
    rows.forEach(row => {
      console.log(`ID ${row.id}:`);
      console.log(`  - year原始值: ${row.year}`);
      console.log(`  - year类型: ${typeof row.year}`);
      console.log(`  - year转字符串: ${row.year_str}`);
      console.log(`  - 相等性测试:`);
      console.log(`    - year === 2022: ${row.year === 2022}`);
      console.log(`    - year === "2022": ${row.year === "2022"}`);
      console.log(`    - String(year) === "2022": ${String(row.year) === "2022"}`);
      console.log('');
    });

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkYearType();