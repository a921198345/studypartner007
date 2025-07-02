"use client"

// 临时解决方案：仅使用本地存储的答题历史功能

/**
 * 获取答题历史（仅本地存储版本）
 */
export const getAnswerHistoryLocal = () => {
  try {
    const historyStr = localStorage.getItem('answerHistory');
    if (!historyStr) {
      return {
        success: true,
        data: {
          answered: {},
          correct: {},
          results: {},
          totalAnswered: 0,
          totalCorrect: 0,
          records: []
        }
      };
    }

    const history = JSON.parse(historyStr);
    const answeredIds = Object.keys(history.answered || {});
    const correctIds = Object.keys(history.correct || {}).filter(id => history.correct[id]);

    return {
      success: true,
      data: {
        answered: history.answered || {},
        correct: history.correct || {},
        results: history.results || {},
        totalAnswered: answeredIds.length,
        totalCorrect: correctIds.length,
        records: [] // 本地版本不返回详细记录
      }
    };
  } catch (error) {
    console.error('获取本地答题历史失败:', error);
    return {
      success: false,
      message: '获取答题历史失败'
    };
  }
};

/**
 * 保存答题记录到本地存储
 */
export const saveAnswerToLocal = (questionId, submittedAnswer, isCorrect, correctAnswer, explanation) => {
  try {
    const historyStr = localStorage.getItem('answerHistory') || '{}';
    const history = JSON.parse(historyStr);

    // 确保对象结构存在
    if (!history.answered) history.answered = {};
    if (!history.correct) history.correct = {};
    if (!history.results) history.results = {};

    // 更新答题记录
    history.answered[questionId] = true;
    history.correct[questionId] = isCorrect;
    history.results[questionId] = {
      submittedAnswer,
      isCorrect,
      correctAnswer,
      explanation: explanation || "暂无解析",
      answeredAt: new Date().toISOString()
    };
    history.timestamp = Date.now();

    // 保存回本地存储
    localStorage.setItem('answerHistory', JSON.stringify(history));

    // 触发自定义事件，通知其他组件更新
    window.dispatchEvent(new Event('answerHistoryUpdated'));

    return true;
  } catch (error) {
    console.error('保存答题记录到本地失败:', error);
    return false;
  }
};

/**
 * 清空本地答题历史
 */
export const clearLocalAnswerHistory = () => {
  try {
    localStorage.removeItem('answerHistory');
    localStorage.removeItem('answerSessions');
    localStorage.removeItem('currentAnswerSession');
    
    // 触发更新事件
    window.dispatchEvent(new Event('answerHistoryUpdated'));
    return true;
  } catch (error) {
    console.error('清空本地答题历史失败:', error);
    return false;
  }
};