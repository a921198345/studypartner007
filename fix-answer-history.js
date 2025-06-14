// 答题历史修复脚本
// 在浏览器控制台中运行此脚本

(function() {
    console.log('=== 答题历史修复工具 ===');
    
    // 1. 检查当前状态
    function checkCurrentState() {
        console.log('\n1. 检查当前状态:');
        
        const answerHistory = localStorage.getItem('answerHistory');
        const answerSessions = localStorage.getItem('answerSessions');
        const currentSession = localStorage.getItem('currentAnswerSession');
        
        console.log('- answerHistory:', answerHistory ? '存在' : '不存在');
        console.log('- answerSessions:', answerSessions ? '存在' : '不存在');
        console.log('- currentAnswerSession:', currentSession ? '存在' : '不存在');
        
        if (answerHistory) {
            try {
                const history = JSON.parse(answerHistory);
                console.log(`- 已答题数: ${Object.keys(history.answered || {}).length}`);
                console.log(`- 正确题数: ${Object.values(history.correct || {}).filter(v => v).length}`);
            } catch (e) {
                console.error('- answerHistory 数据格式错误');
            }
        }
        
        return { answerHistory, answerSessions, currentSession };
    }
    
    // 2. 创建默认数据结构
    function createDefaultHistory() {
        return {
            answered: {},
            correct: {},
            results: {},
            timestamp: Date.now()
        };
    }
    
    // 3. 修复数据
    function fixAnswerHistory() {
        console.log('\n2. 开始修复:');
        
        let fixed = false;
        
        // 修复 answerHistory
        const historyStr = localStorage.getItem('answerHistory');
        if (!historyStr) {
            console.log('- 创建新的 answerHistory');
            localStorage.setItem('answerHistory', JSON.stringify(createDefaultHistory()));
            fixed = true;
        } else {
            try {
                const history = JSON.parse(historyStr);
                if (!history.answered || !history.correct || !history.results) {
                    console.log('- 修复 answerHistory 结构');
                    const fixedHistory = {
                        answered: history.answered || {},
                        correct: history.correct || {},
                        results: history.results || {},
                        timestamp: history.timestamp || Date.now()
                    };
                    localStorage.setItem('answerHistory', JSON.stringify(fixedHistory));
                    fixed = true;
                }
            } catch (e) {
                console.log('- 重建损坏的 answerHistory');
                localStorage.setItem('answerHistory', JSON.stringify(createDefaultHistory()));
                fixed = true;
            }
        }
        
        // 修复 answerSessions
        const sessionsStr = localStorage.getItem('answerSessions');
        if (!sessionsStr) {
            console.log('- 创建新的 answerSessions');
            localStorage.setItem('answerSessions', JSON.stringify([]));
            fixed = true;
        } else {
            try {
                JSON.parse(sessionsStr);
            } catch (e) {
                console.log('- 重建损坏的 answerSessions');
                localStorage.setItem('answerSessions', JSON.stringify([]));
                fixed = true;
            }
        }
        
        return fixed;
    }
    
    // 4. 尝试从数据库恢复（需要用户登录）
    async function tryRecoverFromDatabase() {
        console.log('\n3. 尝试从数据库恢复:');
        
        try {
            const response = await fetch('/api/exams/answers/history');
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('- 从数据库获取到数据');
                
                if (result.data.records && result.data.records.length > 0) {
                    console.log(`- 找到 ${result.data.records.length} 条答题记录`);
                    
                    // 转换为 localStorage 格式
                    const history = createDefaultHistory();
                    
                    result.data.records.forEach(record => {
                        const questionId = record.question_id.toString();
                        history.answered[questionId] = true;
                        history.correct[questionId] = record.is_correct === 1;
                        history.results[questionId] = {
                            submittedAnswer: record.submitted_answer,
                            isCorrect: record.is_correct === 1,
                            correctAnswer: record.correct_answer,
                            explanation: record.explanation_text || "暂无解析",
                            questionType: record.question_type,
                            answeredAt: record.created_at
                        };
                    });
                    
                    // 保存到 localStorage
                    localStorage.setItem('answerHistory', JSON.stringify(history));
                    console.log('✅ 成功从数据库恢复答题历史');
                    return true;
                } else {
                    console.log('- 数据库中没有答题记录');
                }
            } else {
                console.log('- 无法从数据库获取数据（可能未登录）');
            }
        } catch (error) {
            console.error('- 数据库请求失败:', error.message);
        }
        
        return false;
    }
    
    // 5. 创建测试数据（仅用于测试）
    function createTestData() {
        console.log('\n4. 创建测试数据:');
        
        const testHistory = {
            answered: {
                '1': true,
                '2': true,
                '3': true
            },
            correct: {
                '1': true,
                '2': false,
                '3': true
            },
            results: {
                '1': {
                    submittedAnswer: 'A',
                    isCorrect: true,
                    correctAnswer: 'A',
                    explanation: '测试题目1的解析',
                    questionType: 1,
                    answeredAt: new Date().toISOString()
                },
                '2': {
                    submittedAnswer: 'B',
                    isCorrect: false,
                    correctAnswer: 'C',
                    explanation: '测试题目2的解析',
                    questionType: 1,
                    answeredAt: new Date().toISOString()
                },
                '3': {
                    submittedAnswer: 'AB',
                    isCorrect: true,
                    correctAnswer: 'AB',
                    explanation: '测试题目3的解析',
                    questionType: 2,
                    answeredAt: new Date().toISOString()
                }
            },
            timestamp: Date.now()
        };
        
        localStorage.setItem('answerHistory', JSON.stringify(testHistory));
        console.log('✅ 已创建测试数据');
    }
    
    // 执行修复
    async function runFix() {
        console.log('开始执行修复流程...\n');
        
        // 步骤1：检查状态
        const state = checkCurrentState();
        
        // 步骤2：修复本地数据
        const fixed = fixAnswerHistory();
        
        // 步骤3：如果本地没有数据，尝试从数据库恢复
        if (!state.answerHistory || fixed) {
            const recovered = await tryRecoverFromDatabase();
            
            // 步骤4：如果无法恢复，询问是否创建测试数据
            if (!recovered) {
                const createTest = confirm('无法恢复答题历史。是否创建测试数据？');
                if (createTest) {
                    createTestData();
                }
            }
        }
        
        // 步骤5：刷新页面
        console.log('\n✅ 修复完成！');
        const refresh = confirm('修复完成。是否刷新页面？');
        if (refresh) {
            window.location.reload();
        }
    }
    
    // 运行修复
    runFix();
})();