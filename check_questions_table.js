const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: '.env.local' });

async function checkQuestionsTable() {
    let connection;
    
    try {
        // 创建数据库连接
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 10000
        });
        
        console.log('✅ 数据库连接成功');
        
        // 1. 检查questions表结构
        console.log('\n📋 questions表结构:');
        console.log('=====================================');
        const [columns] = await connection.execute('DESCRIBE questions');
        columns.forEach(col => {
            console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可为空)' : '(不可为空)'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `默认值: ${col.Default}` : ''}`);
        });
        
        // 2. 检查是否有subject字段
        const subjectField = columns.find(col => col.Field === 'subject');
        if (subjectField) {
            console.log(`\n✅ subject字段存在: ${subjectField.Type}`);
        } else {
            console.log('\n❌ subject字段不存在');
        }
        
        // 3. 检查表中的数据量
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM questions');
        console.log(`\n📊 总题目数量: ${countResult[0].total}`);
        
        // 4. 如果有subject字段，检查有哪些科目
        if (subjectField) {
            const [subjects] = await connection.execute('SELECT DISTINCT subject, COUNT(*) as count FROM questions GROUP BY subject ORDER BY count DESC');
            console.log('\n📚 科目分布:');
            subjects.forEach(s => {
                console.log(`  ${s.subject}: ${s.count}题`);
            });
        }
        
        // 5. 检查questions表的索引
        console.log('\n🔍 questions表索引:');
        console.log('=====================================');
        const [indexes] = await connection.execute('SHOW INDEX FROM questions');
        const indexGroups = {};
        indexes.forEach(idx => {
            if (!indexGroups[idx.Key_name]) {
                indexGroups[idx.Key_name] = [];
            }
            indexGroups[idx.Key_name].push(idx.Column_name);
        });
        
        Object.entries(indexGroups).forEach(([indexName, columns]) => {
            console.log(`${indexName}: [${columns.join(', ')}]`);
        });
        
        // 6. 检查最近几条记录的样本
        console.log('\n📄 最近3条记录样本:');
        console.log('=====================================');
        const [samples] = await connection.execute('SELECT id, question_code, subject, year, question_type FROM questions ORDER BY id DESC LIMIT 3');
        samples.forEach(sample => {
            console.log(`ID: ${sample.id}, 题号: ${sample.question_code}, 科目: ${sample.subject}, 年份: ${sample.year}, 类型: ${sample.question_type}`);
        });
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('questions表不存在，需要创建');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📤 数据库连接已关闭');
        }
    }
}

// 运行检查
checkQuestionsTable();