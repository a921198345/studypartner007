#!/usr/bin/env node
import mysql from 'mysql2/promise';

// 数据库配置 - 使用环境变量或默认值
const dbConfig = {
    host: '8.141.4.192',
    user: 'law_user',
    password: 'Accd0726351x.',
    database: 'law_exam_assistant',
    charset: 'utf8mb4'
};

async function analyzeSubjectDistribution() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');

        // 1. 查看所有科目的分布
        const [subjectStats] = await connection.execute(`
            SELECT subject, COUNT(*) as count 
            FROM questions 
            WHERE year = 2023 
            GROUP BY subject 
            ORDER BY count DESC
        `);
        
        console.log('\n=== 23年法考题科目分布统计 ===');
        let total = 0;
        subjectStats.forEach(row => {
            console.log(`${row.subject}: ${row.count} 道题`);
            total += row.count;
        });
        console.log(`总计: ${total} 道题`);

        // 2. 随机抽取一些题目分析
        console.log('\n=== 随机抽取题目分析 ===');
        
        // 抽取刑法相关题目（如果有的话）
        const [criminalLawQuestions] = await connection.execute(`
            SELECT id, question_text, answer_explanation, subject
            FROM questions 
            WHERE year = 2023 AND subject = '刑法'
            LIMIT 5
        `);
        
        if (criminalLawQuestions.length > 0) {
            console.log('\n找到的刑法题目:');
            criminalLawQuestions.forEach((q, index) => {
                console.log(`\n${index + 1}. [ID: ${q.id}]`);
                console.log(`题目: ${q.question_text.substring(0, 200)}...`);
                if (q.answer_explanation) {
                    console.log(`解析: ${q.answer_explanation.substring(0, 200)}...`);
                }
            });
        } else {
            console.log('\n未找到刑法题目，让我看看是否有题目包含刑法关键词...');
            
            // 搜索包含刑法关键词但被分到其他科目的题目
            const [possibleCriminalQuestions] = await connection.execute(`
                SELECT id, question_text, answer_explanation, subject
                FROM questions 
                WHERE year = 2023 
                AND (question_text LIKE '%刑法%' 
                     OR question_text LIKE '%犯罪%' 
                     OR question_text LIKE '%刑罚%'
                     OR question_text LIKE '%故意杀人%'
                     OR question_text LIKE '%盗窃%'
                     OR question_text LIKE '%诈骗%'
                     OR answer_explanation LIKE '%刑法%'
                     OR answer_explanation LIKE '%犯罪%')
                LIMIT 10
            `);
            
            if (possibleCriminalQuestions.length > 0) {
                console.log('\n发现可能的刑法题目被错误分类:');
                possibleCriminalQuestions.forEach((q, index) => {
                    console.log(`\n${index + 1}. [ID: ${q.id}, 当前分类: ${q.subject}]`);
                    console.log(`题目: ${q.question_text.substring(0, 150)}...`);
                    if (q.answer_explanation) {
                        console.log(`解析: ${q.answer_explanation.substring(0, 150)}...`);
                    }
                });
            }
        }

        // 3. 抽取民法题目样本分析
        console.log('\n=== 民法题目样本分析 ===');
        const [civilLawSamples] = await connection.execute(`
            SELECT id, question_text, answer_explanation
            FROM questions 
            WHERE year = 2023 AND subject = '民法'
            ORDER BY RAND()
            LIMIT 5
        `);
        
        civilLawSamples.forEach((q, index) => {
            console.log(`\n民法题目 ${index + 1}:`);
            console.log(`题目: ${q.question_text.substring(0, 200)}...`);
            if (q.answer_explanation) {
                console.log(`解析: ${q.answer_explanation.substring(0, 200)}...`);
            }
        });

        // 4. 抽取商经知题目样本分析  
        console.log('\n=== 商经知题目样本分析 ===');
        const [commercialLawSamples] = await connection.execute(`
            SELECT id, question_text, answer_explanation
            FROM questions 
            WHERE year = 2023 AND subject = '商经知'
            ORDER BY RAND()
            LIMIT 5
        `);
        
        commercialLawSamples.forEach((q, index) => {
            console.log(`\n商经知题目 ${index + 1}:`);
            console.log(`题目: ${q.question_text.substring(0, 200)}...`);
            if (q.answer_explanation) {
                console.log(`解析: ${q.answer_explanation.substring(0, 200)}...`);
            }
        });

        // 5. 查看答案解析中的法条引用情况
        console.log('\n=== 答案解析中的法条引用分析 ===');
        const [lawReferences] = await connection.execute(`
            SELECT subject, 
                   COUNT(*) as total_questions,
                   SUM(CASE WHEN answer_explanation LIKE '%第%条%' THEN 1 ELSE 0 END) as has_article_ref,
                   SUM(CASE WHEN answer_explanation LIKE '%刑法%' THEN 1 ELSE 0 END) as mentions_criminal_law,
                   SUM(CASE WHEN answer_explanation LIKE '%民法%' THEN 1 ELSE 0 END) as mentions_civil_law,
                   SUM(CASE WHEN answer_explanation LIKE '%公司法%' THEN 1 ELSE 0 END) as mentions_company_law
            FROM questions 
            WHERE year = 2023 AND answer_explanation IS NOT NULL
            GROUP BY subject
            ORDER BY total_questions DESC
        `);
        
        lawReferences.forEach(row => {
            console.log(`\n${row.subject}:`);
            console.log(`  总题数: ${row.total_questions}`);
            console.log(`  包含法条引用: ${row.has_article_ref} (${(row.has_article_ref/row.total_questions*100).toFixed(1)}%)`);
            console.log(`  提到刑法: ${row.mentions_criminal_law}`);
            console.log(`  提到民法: ${row.mentions_civil_law}`);
            console.log(`  提到公司法: ${row.mentions_company_law}`);
        });

    } catch (error) {
        console.error('分析过程中出现错误:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

analyzeSubjectDistribution();