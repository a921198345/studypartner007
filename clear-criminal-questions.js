import mysql from 'mysql2/promise';

async function clearCriminalQuestions() {
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
        
        // 删除所有刑法题目
        const [result] = await connection.execute(
            "DELETE FROM questions WHERE subject = '刑法'"
        );
        
        console.log(`已删除 ${result.affectedRows} 个刑法题目`);
        
        // 查询剩余题目数量
        const [countResult] = await connection.execute(
            "SELECT subject, COUNT(*) as count FROM questions GROUP BY subject"
        );
        
        console.log('\n当前数据库中的题目统计：');
        countResult.forEach(row => {
            console.log(`${row.subject}: ${row.count} 题`);
        });
        
    } catch (error) {
        console.error('错误:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

clearCriminalQuestions();