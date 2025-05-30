// 题目相关的API服务
export const questionApi = {
  // 获取题目列表
  async getQuestions(params = {}) {
    // 构建查询参数
    const queryParams = new URLSearchParams();
    
    // 添加筛选条件
    if (params.subject && params.subject !== 'all') {
      queryParams.append('subject', params.subject);
    }
    
    // 处理年份参数 - 支持单个年份或多个年份数组
    if (params.year) {
      if (Array.isArray(params.year)) {
        // 多个年份作为逗号分隔的字符串传递
        if (params.year.length > 0 && !params.year.includes('all')) {
          queryParams.append('year', params.year.join(','));
        }
      } else if (params.year !== 'all') {
        // 单个年份
        queryParams.append('year', params.year);
      }
    }
    
    if (params.question_type) {
      queryParams.append('question_type', params.question_type === '单选题' ? 1 : 2);
    }
    
    // 分页参数
    if (params.page) {
      queryParams.append('page', params.page);
    }
    
    if (params.limit) {
      queryParams.append('limit', params.limit);
    }
    
    // 添加 fetchAllIdsAndCodes 参数支持
    if (params.fetchAllIdsAndCodes) {
      queryParams.append('fetchAllIdsAndCodes', 'true');
    }
    
    // 发送请求
    try {
      const response = await fetch(`/api/exams/questions?${queryParams.toString()}`);
      
      if (!response.ok) {
        console.error(`获取题目列表失败: ${response.status} ${response.statusText}`);
        
        // 尝试从本地存储获取缓存数据
        const cachedDataStr = localStorage.getItem('cachedQuestions');
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < 86400000)) {
              console.log("使用本地缓存的题目列表数据");
              return cachedData.data;
            }
          } catch (cacheError) {
            console.error("解析缓存数据失败:", cacheError);
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 缓存成功的响应到本地存储
      if (data.success && data.data) {
        localStorage.setItem('cachedQuestions', JSON.stringify({
          data: data,
          timestamp: Date.now()
        }));
      }
      
      return data;
    } catch (error) {
      console.error('获取题目列表失败:', error);
      
      // 尝试从本地存储获取缓存数据
      const cachedDataStr = localStorage.getItem('cachedQuestions');
      if (cachedDataStr) {
        try {
          const cachedData = JSON.parse(cachedDataStr);
          if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < 86400000)) {
            console.log("API请求失败，使用本地缓存的题目列表数据");
            return cachedData.data;
          }
        } catch (cacheError) {
          console.error("解析缓存数据失败:", cacheError);
        }
      }
      
      throw error;
    }
  },
  
  // 获取题目总数
  async getQuestionsCount() {
    try {
      // 使用已有的getQuestions方法，但只请求1条记录以减少数据传输
      const response = await this.getQuestions({ limit: 1, page: 1 });
      
      if (response.success && response.data && response.data.pagination) {
        return {
          success: true,
          data: {
            total: response.data.pagination.total || 25
          }
        };
      }
      
      // 如果没有获取到正确的数据
      return {
        success: false,
        message: "无法获取题目总数",
        data: { total: 25 } // 默认25题
      };
    } catch (error) {
      console.error("获取题目总数失败:", error);
      return {
        success: false,
        message: "获取题目总数失败",
        data: { total: 25 } // 默认25题
      };
    }
  },
  
  // 获取单个题目详情
  async getQuestionById(id) {
    try {
      const response = await fetch(`/api/exams/questions/${id}`);
      
      if (!response.ok) {
        console.error(`获取题目 #${id} 失败: ${response.status} ${response.statusText}`);
        
        // 尝试从本地存储获取缓存数据
        const cachedQuestionStr = localStorage.getItem(`cachedQuestion_${id}`);
        if (cachedQuestionStr) {
          try {
            const cachedQuestion = JSON.parse(cachedQuestionStr);
            if (cachedQuestion && cachedQuestion.timestamp && (Date.now() - cachedQuestion.timestamp < 86400000)) {
              console.log(`使用本地缓存的题目 #${id} 数据`);
              return cachedQuestion.data;
            }
          } catch (cacheError) {
            console.error("解析缓存题目数据失败:", cacheError);
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 缓存成功的响应到本地存储
      if (data.success && data.data) {
        localStorage.setItem(`cachedQuestion_${id}`, JSON.stringify({
          data: data,
          timestamp: Date.now()
        }));
      }
      
      return data;
    } catch (error) {
      console.error(`获取题目 #${id} 失败:`, error);
      
      // 尝试从本地存储获取缓存数据
      const cachedQuestionStr = localStorage.getItem(`cachedQuestion_${id}`);
      if (cachedQuestionStr) {
        try {
          const cachedQuestion = JSON.parse(cachedQuestionStr);
          if (cachedQuestion && cachedQuestion.timestamp && (Date.now() - cachedQuestion.timestamp < 86400000)) {
            console.log(`API请求失败，使用本地缓存的题目 #${id} 数据`);
            return cachedQuestion.data;
          }
        } catch (cacheError) {
          console.error("解析缓存题目数据失败:", cacheError);
        }
      }
      
      throw error;
    }
  },
  
  // 改进提交答案的错误处理和本地降级逻辑
  // 提交答案
  async submitAnswer(questionId, answer) {
    try {
      const response = await fetch(`/api/exams/questions/${questionId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submitted_answer: answer }),
      });
      
      if (!response.ok) {
        console.error(`提交题目 #${questionId} 答案失败: ${response.status} ${response.statusText}`);
        
        // 降级使用本地处理
        return this.handleLocalAnswerCheck(questionId, answer);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`提交题目 #${questionId} 答案失败:`, error);
      
      // 降级使用本地处理
      return this.handleLocalAnswerCheck(questionId, answer);
    }
  },
  
  // 新增：处理本地答案验证的函数
  async handleLocalAnswerCheck(questionId, submittedAnswer) {
    console.log(`使用本地逻辑处理题目 #${questionId} 的答案验证`);
    
    try {
      // 首先尝试获取当前题目信息
      let questionData;
      let correctAnswer;
      let explanation = "暂无解析";
      
      // 优先从错题集查找，通常错题集中有较完整的信息
      const wrongQuestions = JSON.parse(localStorage.getItem('wrongQuestions') || '[]');
      const wrongQuestion = wrongQuestions.find(q => q.id === parseInt(questionId));
      
      if (wrongQuestion && wrongQuestion.correct_answer) {
        correctAnswer = wrongQuestion.correct_answer;
        explanation = wrongQuestion.explanation || "暂无解析";
        console.log(`从错题集获取题目 #${questionId} 的答案数据: ${correctAnswer}`);
      } else {
        // 尝试从缓存的题目数据获取
        const cachedQuestionStr = localStorage.getItem(`cachedQuestion_${questionId}`);
        if (cachedQuestionStr) {
          const cachedQuestion = JSON.parse(cachedQuestionStr);
          if (cachedQuestion && cachedQuestion.data && cachedQuestion.data.data) {
            questionData = cachedQuestion.data.data;
            correctAnswer = questionData.answer;
            explanation = questionData.analysis || "暂无解析";
            console.log(`从缓存题目获取题目 #${questionId} 的答案数据: ${correctAnswer}`);
          }
        }
      }
      
      // 如果找不到正确答案，尝试本地历史记录
      if (!correctAnswer) {
        const historyString = localStorage.getItem('answerHistory');
        if (historyString) {
          const history = JSON.parse(historyString);
          if (history && history.results && history.results[questionId]) {
            // 如果本地有这道题的答题记录，返回该记录
            const result = history.results[questionId];
            correctAnswer = result.correctAnswer;
            explanation = result.explanation || "暂无解析";
            console.log(`从答题历史获取题目 #${questionId} 的答案数据: ${correctAnswer}`);
          }
        }
      }
      
      // 如果还是找不到答案，使用默认值
      if (!correctAnswer) {
        console.warn(`无法找到题目 #${questionId} 的正确答案，使用默认值A`);
        correctAnswer = "A";
      }
      
      // 判断答案是否正确
      let isCorrect = false;
      let formattedSubmitted = typeof submittedAnswer === 'string' ? submittedAnswer : 
                             (Array.isArray(submittedAnswer) ? submittedAnswer.sort().join('') : String(submittedAnswer));
      
      let formattedCorrect = typeof correctAnswer === 'string' ? correctAnswer : 
                          (Array.isArray(correctAnswer) ? correctAnswer.sort().join('') : String(correctAnswer));
      
      // 对于多选题的特殊处理
      if (questionData && questionData.question_type === 2 || formattedSubmitted.length > 1) {
        // 多选题，需要排序后比较
        formattedSubmitted = formattedSubmitted.split('').sort().join('');
        formattedCorrect = formattedCorrect.split('').sort().join('');
      }
      
      isCorrect = formattedSubmitted === formattedCorrect;
      
      console.log(`本地判断: 题目 #${questionId} 提交答案=${formattedSubmitted}, 正确答案=${formattedCorrect}, 结果=${isCorrect ? '✓' : '✗'}`);
      
      return {
        success: true,
        message: "使用本地逻辑判断答题结果",
        source: "local",
        data: {
          is_correct: isCorrect,
          correct_answer: correctAnswer,
          explanation: explanation,
          question_type: questionData ? questionData.question_type : (formattedCorrect.length > 1 ? 2 : 1)
        }
      };
    } catch (e) {
      console.error("本地处理答案验证失败:", e);
      
      // 即使本地处理失败，也提供一个最基本的响应避免页面崩溃
      return {
        success: true,
        message: "由于错误，使用基础降级响应",
        source: "local-degraded",
        data: {
          is_correct: false, // 保守起见，默认为错误
          correct_answer: "A", // 提供默认答案
          explanation: "由于系统错误，无法获取准确解析。请稍后再试。",
          question_type: 1 // 假设为单选题
        }
      };
    }
  },
  
  // 收藏/取消收藏题目
  async toggleFavorite(questionId) {
    try {
      const response = await fetch(`/api/exams/questions/${questionId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`收藏题目 #${questionId} 失败: ${response.status} ${response.statusText}`);
        // 如果是401未授权错误，使用本地收藏功能
        if (response.status === 401) {
          console.log("用户未登录，使用本地收藏功能");
          return toggleLocalFavorite(questionId);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`收藏题目 #${questionId} 失败:`, error);
      
      // 错误处理 - 使用本地收藏功能
      console.log("使用本地收藏功能作为备选方案");
      return toggleLocalFavorite(questionId);
    }
  },
  
  // 获取上次练习进度
  async getLastPracticeProgress(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // 添加筛选条件
      if (filters.subject) {
        queryParams.append('subject', filters.subject);
      }
      
      if (filters.year) {
        queryParams.append('year', filters.year);
      }
      
      if (filters.question_type) {
        queryParams.append('question_type', filters.question_type);
      }
      
      const response = await fetch(`/api/exams/progress?${queryParams.toString()}`);
      
      if (!response.ok) {
        console.error(`获取练习进度失败: ${response.status} ${response.statusText}`);
        
        // 尝试从本地存储获取最后的答题记录
        const lastProgressFromLocal = getLastAnsweredQuestionFromLocalStorage();
        if (lastProgressFromLocal) {
          return {
            success: true,
            message: "使用本地存储的练习进度",
            data: {
              last_question_id: lastProgressFromLocal,
              offline: true
            }
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取练习进度失败:', error);
      
      // 尝试从本地存储获取最后的答题记录
      const lastProgressFromLocal = getLastAnsweredQuestionFromLocalStorage();
      if (lastProgressFromLocal) {
        return {
          success: true,
          message: "使用本地存储的练习进度",
          data: {
            last_question_id: lastProgressFromLocal,
            offline: true
          }
        };
      }
      
      // 如果没有本地记录，返回一个表示失败但不会阻止应用运行的响应
      return {
        success: false,
        message: "无法获取练习进度",
        offline: true
      };
    }
  },
  
  // 获取用户完整答题历史
  async getAnswerHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // 添加筛选条件
      if (filters.subject) {
        queryParams.append('subject', filters.subject);
      }
      
      if (filters.year) {
        queryParams.append('year', filters.year);
      }
      
      const response = await fetch(`/api/exams/answers/history?${queryParams.toString()}`);
      
      if (!response.ok) {
        console.error(`获取答题历史失败: ${response.status} ${response.statusText}`);
        
        // 尝试从本地存储获取缓存数据
        const localHistoryData = getAnswerHistoryFromLocalStorage();
        if (localHistoryData) {
          return {
            success: true,
            message: "使用本地存储的答题历史",
            data: localHistoryData,
            offline: true
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 成功获取服务器数据后，更新本地存储
      if (data.success && data.data) {
        localStorage.setItem('answerHistory', JSON.stringify({
          answered: data.data.answered || {},
          correct: data.data.correct || {},
          results: data.data.results || {},
          timestamp: Date.now()
        }));
      }
      
      return data;
    } catch (error) {
      console.error('获取答题历史失败:', error);
      
      // 尝试从本地存储获取缓存数据
      const localHistoryData = getAnswerHistoryFromLocalStorage();
      if (localHistoryData) {
        return {
          success: true,
          message: "使用本地存储的答题历史",
          data: localHistoryData,
          offline: true
        };
      }
      
      // 如果没有本地记录，返回一个空的但有效的响应
      return {
        success: false,
        message: "无法获取答题历史",
        data: {
          answered: {},
          correct: {},
          results: {},
          totalAnswered: 0,
          totalCorrect: 0
        },
        offline: true
      };
    }
  }
};

// 辅助函数：从本地存储获取最后一次答题的题目ID
function getLastAnsweredQuestionFromLocalStorage() {
  try {
    const historyString = localStorage.getItem('answerHistory');
    if (historyString) {
      const history = JSON.parse(historyString);
      if (history && history.answered) {
        const answeredIds = Object.keys(history.answered).map(Number);
        if (answeredIds.length > 0) {
          // 找出最大的ID作为最后答题的ID
          return Math.max(...answeredIds);
        }
      }
    }
    return null;
  } catch (e) {
    console.error("从本地存储获取最后答题ID失败:", e);
    return null;
  }
}

// 辅助函数：从本地存储获取答题历史
function getAnswerHistoryFromLocalStorage() {
  try {
    const historyString = localStorage.getItem('answerHistory');
    if (historyString) {
      const history = JSON.parse(historyString);
      if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
        const answered = history.answered || {};
        const correct = history.correct || {};
        const results = history.results || {};
        
        return {
          answered,
          correct,
          results,
          totalAnswered: Object.keys(answered).length,
          totalCorrect: Object.keys(correct).length
        };
      }
    }
    return null;
  } catch (e) {
    console.error("从本地存储获取答题历史失败:", e);
    return null;
  }
}

// 添加题目到错题集
export function addToWrongQuestions(questionData) {
  try {
    // 检查必要数据
    if (!questionData || !questionData.id) {
      console.error('添加错题失败: 缺少必要数据');
      return false;
    }

    console.log('准备添加错题到错题集:', questionData.id);
    
    // 从localStorage获取当前错题集
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    let wrongQuestions = [];
    
    try {
      if (wrongQuestionsStr) {
        const parsed = JSON.parse(wrongQuestionsStr);
        if (Array.isArray(parsed)) {
          wrongQuestions = parsed;
        } else {
          console.warn('错题集数据格式不正确，重置为空数组');
        }
      }
    } catch (parseError) {
      console.error('解析错题集数据失败，重置为空数组:', parseError);
    }
    
    // 检查题目是否已在错题集中
    const exists = wrongQuestions.some(q => q.id === questionData.id);
    
    if (!exists) {
      // 添加时间戳，如果没有的话
      const dataToAdd = {
        ...questionData,
        addedAt: questionData.timestamp || new Date().toISOString()
      };
      
      // 添加题目到错题集
      wrongQuestions.push(dataToAdd);
      
      // 保存回localStorage
      try {
        localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
        console.log(`题目 #${questionData.id} 已添加到错题集，当前错题集共有 ${wrongQuestions.length} 题`);
        
        // 为了调试，打印当前错题集的ID列表
        console.log('当前错题集IDs:', wrongQuestions.map(q => q.id));
        return true;
      } catch (storageError) {
        console.error('保存错题集到本地存储失败:', storageError);
        return false;
      }
    } else {
      console.log(`题目 #${questionData.id} 已存在于错题集中`);
      return false;
    }
  } catch (error) {
    console.error('添加错题过程中发生异常:', error);
    return false;
  }
}

// 从错题集移除题目
export function removeFromWrongQuestions(questionId) {
  try {
    console.log(`尝试从错题集移除题目 #${questionId}`);
    
    // 转换为数字确保类型匹配
    const numericId = parseInt(questionId);
    if (isNaN(numericId)) {
      console.error(`移除错题失败: 无效的题目ID ${questionId}`);
      return false;
    }
    
    // 从localStorage获取当前错题集
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    if (!wrongQuestionsStr) {
      console.log('错题集为空，无需移除');
      return false;
    }
    
    let wrongQuestions;
    try {
      wrongQuestions = JSON.parse(wrongQuestionsStr);
      if (!Array.isArray(wrongQuestions)) {
        console.error('错题集格式不正确，重置为空数组');
        localStorage.setItem('wrongQuestions', JSON.stringify([]));
        return false;
      }
    } catch (parseError) {
      console.error('解析错题集数据失败:', parseError);
      localStorage.setItem('wrongQuestions', JSON.stringify([]));
      return false;
    }
    
    // 找到要移除的题目的具体索引
    const indexToRemove = wrongQuestions.findIndex(q => {
      // 同时检查字符串和数字类型匹配
      return q.id === numericId || q.id === questionId;
    });
    
    // 没有找到对应题目
    if (indexToRemove === -1) {
      console.log(`题目 #${questionId} 不在错题集中，无需移除`);
      return false;
    }
    
    // 移除题目
    wrongQuestions.splice(indexToRemove, 1);
    
    // 保存更新后的错题集
    try {
      localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
      console.log(`题目 #${questionId} 已从错题集移除，当前剩余 ${wrongQuestions.length} 题`);
      
      // 触发事件通知页面刷新
      if (typeof window !== 'undefined') {
        try {
          // 触发两种不同名称的事件，确保兼容性
          // 1. wrongQuestionsChanged 事件
          const event1 = new CustomEvent('wrongQuestionsChanged', {
            detail: { 
              removedId: numericId,
              newCount: wrongQuestions.length 
            }
          });
          window.dispatchEvent(event1);
          
          // 2. wrongQuestionsUpdated 事件 
          const event2 = new CustomEvent('wrongQuestionsUpdated', {
            detail: { 
              removedQuestionId: numericId,
              newCount: wrongQuestions.length 
            }
          });
          window.dispatchEvent(event2);
          
          console.log(`已触发错题集更新事件，通知组件错题集已更新`);
        } catch (eventError) {
          console.error('触发错题集更新事件失败:', eventError);
          // 事件触发失败不影响主要功能
        }
      }
      
      return true;
    } catch (saveError) {
      console.error('保存更新后的错题集失败:', saveError);
      return false;
    }
  } catch (error) {
    console.error('移除错题过程中发生异常:', error);
    return false;
  }
}

// 获取错题集
export function getWrongQuestions() {
  try {
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    let wrongQuestions = [];
    
    if (wrongQuestionsStr) {
      try {
        const parsed = JSON.parse(wrongQuestionsStr);
        if (Array.isArray(parsed)) {
          wrongQuestions = parsed;
          console.log(`成功获取错题集，共有 ${wrongQuestions.length} 题`);
          // 打印错题ID列表，便于调试
          if (wrongQuestions.length > 0) {
            console.log('错题ID列表:', wrongQuestions.map(q => q.id).join(', '));
          }
        } else {
          console.warn('错题集数据格式不正确，返回空数组');
        }
      } catch (parseError) {
        console.error('解析错题集数据失败:', parseError);
      }
    } else {
      console.log('本地存储中没有错题集数据');
    }
    
    return wrongQuestions;
  } catch (error) {
    console.error('获取错题集失败:', error);
    return [];
  }
}

// 获取本地收藏列表
export function getFavoriteQuestions() {
  try {
    const favoritesStr = localStorage.getItem('favoriteQuestions');
    return favoritesStr ? JSON.parse(favoritesStr) : [];
  } catch (error) {
    console.error('获取收藏题目失败:', error);
    return [];
  }
}

// 检查题目是否被收藏
export function isQuestionFavorited(questionId) {
  try {
    const favorites = getFavoriteQuestions();
    return favorites.includes(Number(questionId));
  } catch (error) {
    console.error('检查题目是否收藏失败:', error);
    return false;
  }
}

// 本地收藏/取消收藏功能
export function toggleLocalFavorite(questionId) {
  try {
    const numId = Number(questionId);
    const favorites = getFavoriteQuestions();
    const isCurrentlyFavorited = favorites.includes(numId);
    
    if (isCurrentlyFavorited) {
      // 取消收藏
      const newFavorites = favorites.filter(id => id !== numId);
      localStorage.setItem('favoriteQuestions', JSON.stringify(newFavorites));
      console.log(`题目 #${questionId} 已从本地收藏中移除`);
      
      return {
        success: true,
        message: "已取消收藏",
        data: { is_favorite: false },
        source: "local"
      };
    } else {
      // 添加收藏
      favorites.push(numId);
      localStorage.setItem('favoriteQuestions', JSON.stringify(favorites));
      console.log(`题目 #${questionId} 已添加到本地收藏`);
      
      return {
        success: true,
        message: "已收藏",
        data: { is_favorite: true },
        source: "local"
      };
    }
  } catch (error) {
    console.error('本地收藏操作失败:', error);
    return {
      success: false,
      message: "收藏操作失败，请稍后再试",
      source: "local"
    };
  }
} 