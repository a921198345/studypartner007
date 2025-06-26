#!/usr/bin/env node
import mysql from 'mysql2/promise';

// 数据库配置
const dbConfig = {
    host: '8.141.4.192',
    user: 'law_user',
    password: 'Accd0726351x.',
    database: 'law_exam_assistant',
    charset: 'utf8mb4'
};

async function checkDatabaseStructure() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');

        // 1. 查看questions表结构
        const [tableStructure] = await connection.execute('DESCRIBE questions');
        console.log('\n=== Questions表结构 ===');
        tableStructure.forEach(field => {
            console.log(`${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Key ? `(${field.Key})` : ''}`);
        });

        // 2. 查看现有数据的年份分布
        const [yearStats] = await connection.execute(`
            SELECT year, COUNT(*) as count 
            FROM questions 
            GROUP BY year 
            ORDER BY year DESC
        `);
        
        console.log('\n=== 题目年份分布 ===');
        yearStats.forEach(row => {
            console.log(`${row.year}: ${row.count} 道题`);
        });

        // 3. 查看科目分布（所有年份）
        const [subjectStats] = await connection.execute(`
            SELECT subject, COUNT(*) as count 
            FROM questions 
            GROUP BY subject 
            ORDER BY count DESC
        `);
        
        console.log('\n=== 科目分布（所有年份）===');
        subjectStats.forEach(row => {
            console.log(`${row.subject}: ${row.count} 道题`);
        });

        // 4. 查看最近的几条题目记录
        const [recentQuestions] = await connection.execute(`
            SELECT id, subject, year, 
                   SUBSTRING(question_text, 1, 100) as question_preview
            FROM questions 
            ORDER BY id DESC 
            LIMIT 10
        `);
        
        console.log('\n=== 最近的10条题目记录 ===');
        recentQuestions.forEach(q => {
            console.log(`ID: ${q.id}, 科目: ${q.subject}, 年份: ${q.year}`);
            console.log(`题目预览: ${q.question_preview}...`);
            console.log('---');
        });

    } catch (error) {
        console.error('检查数据库结构时出现错误:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStructure();