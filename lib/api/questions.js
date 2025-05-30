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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`提交题目 #${questionId} 答案失败:`, error);
      
      // 服务器请求失败时，返回一个本地处理的结果以允许应用继续工作
      // 注意：这只是一个应急方案，不会保存答题记录到服务器
      const historyString = localStorage.getItem('answerHistory');
      if (historyString) {
        try {
          const history = JSON.parse(historyString);
          if (history && history.results && history.results[questionId]) {
            // 如果本地有这道题的答题记录，返回该记录
            const result = history.results[questionId];
            return {
              success: true,
              message: "使用本地缓存的答题结果",
              data: {
                is_correct: result.isCorrect,
                correct_answer: result.correctAnswer,
                explanation: result.explanation || "暂无解析",
                question_type: result.questionType
              }
            };
          }
        } catch (e) {
          console.error("解析本地答题历史失败:", e);
        }
      }
      
      // 如果没有本地记录，抛出原始错误
      throw error;
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
    // 从localStorage获取当前错题集
    const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
    if (!wrongQuestionsStr) return false;
    
    let wrongQuestions = JSON.parse(wrongQuestionsStr);
    
    // 过滤掉要移除的题目
    const newWrongQuestions = wrongQuestions.filter(q => q.id !== questionId);
    
    // 如果长度变化，说明成功移除
    if (newWrongQuestions.length < wrongQuestions.length) {
      localStorage.setItem('wrongQuestions', JSON.stringify(newWrongQuestions));
      console.log(`题目 #${questionId} 已从错题集移除`);
      return true;
    }
    
    return false; // 题目不在错题集中
  } catch (error) {
    console.error('移除错题失败:', error);
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