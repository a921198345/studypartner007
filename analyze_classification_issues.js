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

// 分析关键词匹配逻辑
const SUBJECT_KEYWORDS = {
    '民法': [
        '民法', '合同', '物权', '债权', '侵权', '婚姻', '继承', '人格权', '担保', '抵押', '质押', 
        '买卖', '租赁', '借款', '赠与', '保证', '定金', '违约', '损害赔偿', '所有权', '用益物权',
        '占有', '善意取得', '不当得利', '无因管理', '婚姻家庭', '离婚', '抚养', '赡养', '遗嘱',
        '法定继承', '遗赠', '著作权', '专利权', '商标权', '知识产权', '隐私权', '名誉权'
    ],
    '刑法': [
        '刑法', '犯罪', '刑罚', '故意', '过失', '正当防卫', '紧急避险', '犯罪构成', '主观要件',
        '客观要件', '共同犯罪', '主犯', '从犯', '教唆犯', '累犯', '自首', '立功', '缓刑', '假释',
        '盗窃', '抢劫', '诈骗', '贪污', '受贿', '行贿', '挪用', '职务侵占', '故意杀人', '故意伤害',
        '强奸', '绑架', '非法拘禁', '敲诈勒索', '寻衅滋事', '聚众斗殴', '毒品', '走私', '伪造',
        '危险驾驶', '交通肇事', '渎职', '玩忽职守', '徇私枉法', '量刑', '死刑', '无期徒刑', '有期徒刑',
        '拘役', '管制', '罚金', '没收财产', '剥夺政治权利'
    ],
    '商经知': [
        '商法', '经济法', '公司法', '公司', '股东', '董事', '监事', '股权', '股份', '有限责任公司',
        '股份有限公司', '合伙', '合伙企业', '个人独资', '破产', '清算', '重整', '和解', '证券',
        '股票', '债券', '基金', '期货', '保险', '保险合同', '投保人', '被保险人', '受益人', '保险金',
        '票据', '汇票', '本票', '支票', '背书', '承兑', '保证', '追索权', '信托', '信托财产',
        '反垄断', '反不正当竞争', '消费者权益', '产品质量', '食品安全', '环境保护', '劳动法',
        '劳动合同', '社会保险', '工伤', '税法', '增值税', '所得税', '房地产', '建设工程', '招投标'
    ]
};

function analyzeQuestionClassification(questionText, explanationText, actualSubject) {
    // 合并题目和解析文本
    const fullText = (questionText + ' ' + (explanationText || '')).toLowerCase();
    
    // 统计每个科目的关键词匹配数
    const subjectScores = {};
    const matchDetails = {};
    
    for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        let score = 0;
        const matches = [];
        
        for (const keyword of keywords) {
            const regex = new RegExp(keyword, 'gi');
            const matchCount = (fullText.match(regex) || []).length;
            if (matchCount > 0) {
                const weight = keyword.length >= 4 ? 3 : keyword.length >= 3 ? 2 : 1;
                score += matchCount * weight;
                matches.push({ keyword, count: matchCount, weight });
            }
        }
        
        if (score > 0) {
            subjectScores[subject] = score;
            matchDetails[subject] = matches;
        }
    }
    
    // 预测科目
    const predictedSubject = Object.keys(subjectScores).length > 0 
        ? Object.keys(subjectScores).reduce((a, b) => subjectScores[a] > subjectScores[b] ? a : b)
        : '未分类';
    
    return {
        actualSubject,
        predictedSubject,
        isCorrect: actualSubject === predictedSubject,
        scores: subjectScores,
        matchDetails: matchDetails
    };
}

async function analyzeClassificationIssues() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功');

        // 1. 随机抽取各科目的题目进行分析
        console.log('\n=== 随机抽取题目进行分类准确性分析 ===');
        
        const subjects = ['刑法', '民法', '商经知', '理论法', '行政法与行政诉讼法'];
        const analysisResults = [];
        
        for (const subject of subjects) {
            console.log(`\n--- 分析${subject}题目 ---`);
            
            const [questions] = await connection.execute(`
                SELECT id, question_text, explanation_text, subject
                FROM questions 
                WHERE subject = ? AND explanation_text IS NOT NULL
                ORDER BY RAND()
                LIMIT 3
            `, [subject]);
            
            for (const question of questions) {
                const analysis = analyzeQuestionClassification(
                    question.question_text, 
                    question.explanation_text, 
                    question.subject
                );
                
                analysisResults.push(analysis);
                
                console.log(`\n题目ID: ${question.id}`);
                console.log(`实际科目: ${analysis.actualSubject}`);
                console.log(`预测科目: ${analysis.predictedSubject}`);
                console.log(`分类${analysis.isCorrect ? '正确' : '错误'}`);
                
                if (!analysis.isCorrect) {
                    console.log('得分详情:', analysis.scores);
                    console.log('题目预览:', question.question_text.substring(0, 100) + '...');
                }
            }
        }

        // 2. 寻找被错误分类的刑法题目
        console.log('\n\n=== 寻找可能被错误分类的刑法题目 ===');
        
        const [possibleCriminalQuestions] = await connection.execute(`
            SELECT id, question_text, explanation_text, subject
            FROM questions 
            WHERE subject != '刑法' 
            AND (question_text LIKE '%刑法%' 
                 OR question_text LIKE '%犯罪%' 
                 OR question_text LIKE '%故意杀人%'
                 OR question_text LIKE '%盗窃%'
                 OR question_text LIKE '%诈骗%'
                 OR explanation_text LIKE '%刑法%'
                 OR explanation_text LIKE '%犯罪%')
            LIMIT 10
        `);
        
        if (possibleCriminalQuestions.length > 0) {
            console.log('找到可能被错误分类的刑法题目:');
            for (const question of possibleCriminalQuestions) {
                const analysis = analyzeQuestionClassification(
                    question.question_text, 
                    question.explanation_text, 
                    question.subject
                );
                
                console.log(`\n题目ID: ${question.id}`);
                console.log(`当前分类: ${question.subject}`);
                console.log(`我们的预测: ${analysis.predictedSubject}`);
                console.log(`题目内容: ${question.question_text.substring(0, 150)}...`);
                if (question.explanation_text) {
                    console.log(`解析内容: ${question.explanation_text.substring(0, 150)}...`);
                }
            }
        } else {
            console.log('未发现明显被错误分类的刑法题目');
        }

        // 3. 分析民法和商经知题目数量过多的原因
        console.log('\n\n=== 分析民法和商经知分类过多的原因 ===');
        
        // 检查民法题目是否包含其他科目的关键词
        const [civilLawSamples] = await connection.execute(`
            SELECT id, question_text, explanation_text
            FROM questions 
            WHERE subject = '民法'
            ORDER BY RAND()
            LIMIT 5
        `);
        
        console.log('\n民法题目样本分析:');
        for (const question of civilLawSamples) {
            const analysis = analyzeQuestionClassification(
                question.question_text, 
                question.explanation_text, 
                '民法'
            );
            
            console.log(`\n题目ID: ${question.id}`);
            console.log(`关键词匹配得分:`, analysis.scores);
            console.log(`题目内容: ${question.question_text.substring(0, 100)}...`);
            
            // 检查是否应该分到其他科目
            if (Object.keys(analysis.scores).length > 1) {
                const sortedScores = Object.entries(analysis.scores).sort((a, b) => b[1] - a[1]);
                if (sortedScores[0][1] !== analysis.scores['民法']) {
                    console.log(`*** 可能应该分类为: ${sortedScores[0][0]} (得分: ${sortedScores[0][1]})`);
                }
            }
        }

        // 4. 总结分析结果
        console.log('\n\n=== 分类准确性总结 ===');
        const correctCount = analysisResults.filter(r => r.isCorrect).length;
        const totalCount = analysisResults.length;
        console.log(`总分析题目: ${totalCount}`);
        console.log(`分类正确: ${correctCount}`);
        console.log(`准确率: ${(correctCount / totalCount * 100).toFixed(1)}%`);
        
        // 统计错误分类的情况
        const errors = analysisResults.filter(r => !r.isCorrect);
        if (errors.length > 0) {
            console.log('\n错误分类详情:');
            for (const error of errors) {
                console.log(`${error.actualSubject} -> ${error.predictedSubject}`);
            }
        }

    } catch (error) {
        console.error('分析过程中出现错误:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// 运行分析
analyzeClassificationIssues().then(() => {
    console.log('\n分析完成！');
}).catch(error => {
    console.error('程序执行出错:', error);
});