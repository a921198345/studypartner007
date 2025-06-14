import mysql from 'mysql2/promise';

async function clearAllQuestions() {
    let connection;
    try {
        // 连接数据库
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '8.141.4.192',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'law_user',
            password: process.env.DB_PASSWORD || 'Accd0726351x.',
            database: process.env.DB_NAME || 'law_exam_assistant',
            connectTimeout: 10000
        });
        
        console.log('数据库连接成功');
        
        // 先查询当前所有题目的统计
        const [beforeStats] = await connection.execute(
            "SELECT subject, COUNT(*) as count FROM questions GROUP BY subject"
        );
        
        console.log('清除前的题目统计：');
        let totalBefore = 0;
        beforeStats.forEach(row => {
            console.log(`${row.subject}: ${row.count} 题`);
            totalBefore += row.count;
        });
        console.log(`总计: ${totalBefore} 题\n`);
        
        // 清空整个questions表
        const [result] = await connection.execute(
            "DELETE FROM questions"
        );
        
        console.log(`✅ 已成功删除 ${result.affectedRows} 个题目`);
        
        // 重置自增ID（可选）
        await connection.execute("ALTER TABLE questions AUTO_INCREMENT = 1");
        console.log('✅ 已重置题目ID自增计数器');
        
        // 验证清空结果
        const [afterCount] = await connection.execute(
            "SELECT COUNT(*) as total FROM questions"
        );
        
        console.log(`\n当前题库状态: ${afterCount[0].total} 个题目`);
        
        // 同时清理相关的用户收藏和错题记录（如果需要）
        console.log('\n是否需要清理相关数据：');
        
        // 检查收藏表
        const [favorites] = await connection.execute(
            "SELECT COUNT(*) as count FROM user_favorites"
        );
        console.log(`- 用户收藏: ${favorites[0].count} 条记录`);
        
        // 检查错题表
        const [wrongAnswers] = await connection.execute(
            "SELECT COUNT(*) as count FROM user_wrong_answers"
        );
        console.log(`- 错题记录: ${wrongAnswers[0].count} 条记录`);
        
        console.log('\n如需清理收藏和错题记录，请运行: node clear-user-data.js');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n数据库连接已关闭');
        }
    }
}

// 执行清空操作
console.log('========== 清空所有题库数据 ==========\n');
clearAllQuestions();