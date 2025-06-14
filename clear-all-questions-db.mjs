import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

async function clearAllQuestions() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'law_exam_assistant',
      port: process.env.DB_PORT || 3306
    });

    console.log('已连接到数据库');

    // 1. 删除所有答题记录
    const deleteAnswers = await connection.execute('DELETE FROM user_answers');
    console.log(`已删除 ${deleteAnswers[0].affectedRows} 条答题记录`);

    // 2. 删除所有收藏记录
    const deleteFavorites = await connection.execute('DELETE FROM user_favorites');
    console.log(`已删除 ${deleteFavorites[0].affectedRows} 条收藏记录`);

    // 3. 删除所有错题记录
    const deleteWrongAnswers = await connection.execute('DELETE FROM user_wrong_answers');
    console.log(`已删除 ${deleteWrongAnswers[0].affectedRows} 条错题记录`);

    // 4. 删除所有题目
    const deleteQuestions = await connection.execute('DELETE FROM questions');
    console.log(`已删除 ${deleteQuestions[0].affectedRows} 道题目`);

    // 5. 重置自增ID（可选）
    await connection.execute('ALTER TABLE questions AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE user_answers AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE user_favorites AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE user_wrong_answers AUTO_INCREMENT = 1');
    console.log('已重置所有表的自增ID');

    console.log('\n✅ 所有题目及相关数据已清空！');
    console.log('您现在可以重新上传题目了。');
    console.log('\n上传地址: http://localhost:3000/admin/upload-questions');

  } catch (error) {
    console.error('清空数据时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 确认提示
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  警告：此操作将删除数据库中的所有题目及相关数据！');
console.log('包括：题目、答题记录、收藏记录、错题记录等');
console.log('');

rl.question('确定要继续吗？(yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    clearAllQuestions().then(() => {
      rl.close();
    });
  } else {
    console.log('操作已取消');
    rl.close();
  }
});