// 题目相关的API服务
import { getAuthHeaders } from '../auth-utils.js';

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
    
    // 添加搜索参数
    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
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
      const response = await fetch(`/api/exams/questions?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      
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
      // 发送专门的总数查询请求，不带任何筛选条件，确保获取全部题目总数
      const response = await fetch('/api/exams/questions?limit=1&page=1&getAllCount=true', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error(`获取题目总数失败: ${response.status} ${response.statusText}`);
        // 如果API请求失败，尝试从localStorage获取缓存
        const cachedTotal = localStorage.getItem('questionTotalCount');
        if (cachedTotal && !isNaN(parseInt(cachedTotal))) {
          return {
            success: true,
            data: { total: parseInt(cachedTotal) }
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.pagination) {
        const total = data.data.pagination.total || 25;
        // 缓存总数到localStorage
        localStorage.setItem('questionTotalCount', total.toString());
        return {
          success: true,
          data: { total: total }
        };
      }
      
      // 如果没有获取到正确的数据，尝试从localStorage获取缓存
      const cachedTotal = localStorage.getItem('questionTotalCount');
      if (cachedTotal && !isNaN(parseInt(cachedTotal))) {
        return {
          success: true,
          data: { total: parseInt(cachedTotal) }
        };
      }
      
      return {
        success: false,
        message: "无法获取题目总数",
        data: { total: 25 } // 默认25题
      };
    } catch (error) {
      console.error("获取题目总数失败:", error);
      
      // 尝试从localStorage获取缓存的总数
      const cachedTotal = localStorage.getItem('questionTotalCount');
      if (cachedTotal && !isNaN(parseInt(cachedTotal))) {
        console.log("使用缓存的题目总数:", cachedTotal);
        return {
          success: true,
          data: { total: parseInt(cachedTotal) }
        };
      }
      
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
      const response = await fetch(`/api/exams/questions/${id}`, {
        headers: getAuthHeaders()
      });
      
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
      // 获取当前会话ID
      let sessionId = null;
      const currentSessionStr = localStorage.getItem('currentAnswerSession');
      if (currentSessionStr) {
        try {
          const currentSession = JSON.parse(currentSessionStr);
          sessionId = currentSession.sessionId;
        } catch (e) {
          console.error('解析当前会话失败:', e);
        }
      }
      
      const response = await fetch(`/api/exams/questions/${questionId}/submit`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          submitted_answer: answer,
          session_id: sessionId
        }),
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
      
      // 如果还是找不到答案，记录错误但不使用默认值
      if (!correctAnswer) {
        console.error(`无法找到题目 #${questionId} 的正确答案，无法进行答案判断`);
        return {
          success: false,
          message: "无法获取题目答案，请稍后再试",
          source: "local-error",
          data: {
            is_correct: false,
            correct_answer: "未知",
            explanation: "无法获取题目答案数据，请检查网络连接或联系技术支持。",
            question_type: 1
          }
        };
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
        success: false,
        message: "由于系统错误，无法处理答案验证",
        source: "local-degraded",
        data: {
          is_correct: false, // 保守起见，默认为错误
          correct_answer: "未知", // 不提供默认答案
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
          ...getAuthHeaders(),
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
      
      // 获取当前session_id
      const currentSessionStr = localStorage.getItem('currentAnswerSession');
      if (currentSessionStr) {
        try {
          const currentSession = JSON.parse(currentSessionStr);
          if (currentSession.sessionId) {
            queryParams.append('session_id', currentSession.sessionId);
          }
        } catch (e) {
          console.error('解析当前会话失败:', e);
        }
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
  },

  // 修复fetchAnswerHistory函数
  async fetchAnswerHistory(question_id, source = null) {
    try {
      console.log('fetchAnswerHistory called:', { question_id, source });
      
      // 如果从错题集进入，不加载当前题目的答案记录，保持答题界面为未答状态
      const shouldLoadCurrentAnswer = source !== 'wrong-questions';
      
      const response = await fetch(`/api/exams/answers/history?question_id=${question_id}&loadCurrent=${shouldLoadCurrentAnswer}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('fetchAnswerHistory failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('fetchAnswerHistory response:', data);
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('fetchAnswerHistory error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // 修复loadAnswerHistoryFromCache函数
  async loadAnswerHistoryFromCache(question_id, source = null) {
    try {
      console.log('loadAnswerHistoryFromCache called:', { question_id, source });
      
      // 从错题集进入时，不加载答案记录，保持初始状态
      if (source === 'wrong-questions') {
        console.log('From wrong-questions, not loading answer history');
        return null;
      }
      
      const cacheKey = `answer_history_${question_id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsedData = JSON.parse(cached);
        console.log('Loaded from cache:', parsedData);
        return parsedData;
      }
      
      return null;
    } catch (error) {
      console.error('loadAnswerHistoryFromCache error:', error);
      return null;
    }
  },

  // 增强removeFromWrongQuestions函数 - 使用本地存储实现
  async removeFromWrongQuestions(question_id) {
    try {
      console.log('removeFromWrongQuestions called:', { question_id });
      
      // 转换为数字类型以便匹配
      const numId = parseInt(question_id);
      
      // 从本地存储中获取错题集
      const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
      if (!wrongQuestionsStr) {
        console.log('错题集为空，无需移除');
        return {
          success: true,
          message: '错题集为空，无需移除'
        };
      }
      
      let wrongQuestions = JSON.parse(wrongQuestionsStr);
      const originalLength = wrongQuestions.length;
      
      // 移除指定题目（按ID匹配）
      wrongQuestions = wrongQuestions.filter(q => {
        const qId = parseInt(q.id);
        return qId !== numId;
      });
      
      const newLength = wrongQuestions.length;
      const wasRemoved = originalLength > newLength;
      
      if (wasRemoved) {
        // 保存更新后的错题集
        localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
        console.log(`题目 #${question_id} 已从错题集移除，错题集从 ${originalLength} 减少到 ${newLength}`);
        
        // 触发自定义事件通知其他组件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wrongQuestionsChanged', {
            detail: { removed: question_id, action: 'remove', newCount: newLength }
          }));
        }
        
        return {
          success: true,
          message: `题目已从错题集移除`,
          data: { removed: true, newCount: newLength }
        };
      } else {
        console.log(`题目 #${question_id} 不在错题集中`);
        return {
          success: true,
          message: '题目不在错题集中',
          data: { removed: false, newCount: newLength }
        };
      }
    } catch (error) {
      console.error('removeFromWrongQuestions error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // 获取收藏题目列表（包含完整题目信息）
  async getFavorites(withDetails = true) {
    try {
      const response = await fetch(`/api/exams/questions/favorites?withDetails=${withDetails}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error(`获取收藏题目列表失败: ${response.status} ${response.statusText}`);
        
        // 尝试从本地存储获取缓存数据
        const cachedFavoritesStr = localStorage.getItem('cachedFavorites');
        if (cachedFavoritesStr) {
          try {
            const cachedFavorites = JSON.parse(cachedFavoritesStr);
            if (cachedFavorites && cachedFavorites.timestamp && (Date.now() - cachedFavorites.timestamp < 86400000)) {
              console.log("使用本地缓存的收藏题目列表数据");
              return cachedFavorites.data;
            }
          } catch (cacheError) {
            console.error("解析缓存收藏数据失败:", cacheError);
          }
        }
        
        // 如果没有本地缓存或缓存已过期，则使用本地收藏ID列表和题目缓存数据组装
        return this.assembleLocalFavorites(withDetails);
      }
      
      const data = await response.json();
      
      // 缓存成功的响应到本地存储
      if (data.success && data.data) {
        localStorage.setItem('cachedFavorites', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
      
      return data;
    } catch (error) {
      console.error('获取收藏题目列表失败:', error);
      
      // 尝试从本地存储获取缓存数据
      const cachedFavoritesStr = localStorage.getItem('cachedFavorites');
      if (cachedFavoritesStr) {
        try {
          const cachedFavorites = JSON.parse(cachedFavoritesStr);
          if (cachedFavorites && cachedFavorites.timestamp && (Date.now() - cachedFavorites.timestamp < 86400000)) {
            console.log("API请求失败，使用本地缓存的收藏题目列表数据");
            return cachedFavorites.data;
          }
        } catch (cacheError) {
          console.error("解析缓存收藏数据失败:", cacheError);
        }
      }
      
      // 如果没有本地缓存或缓存已过期，则使用本地收藏ID列表和题目缓存数据组装
      return this.assembleLocalFavorites(withDetails);
    }
  },
  
  // 从本地存储组装收藏题目信息
  async assembleLocalFavorites(withDetails = true) {
    try {
      // 获取本地收藏题目ID列表
      const favoritesStr = localStorage.getItem('favoriteQuestions');
      let favoriteIds = [];
      
      if (favoritesStr) {
        favoriteIds = JSON.parse(favoritesStr);
      }
      
      if (favoriteIds.length === 0) {
        return {
          success: true,
          message: "本地收藏列表为空",
          source: "local",
          data: {
            favorites: [],
            total: 0
          }
        };
      }
      
      // 如果不需要详细信息，直接返回ID列表
      if (!withDetails) {
        return {
          success: true,
          message: "使用本地收藏ID列表",
          source: "local",
          data: {
            favorites: favoriteIds.map(id => ({ id })),
            total: favoriteIds.length
          }
        };
      }
      
      // 需要详细信息时，尝试从缓存中组装完整题目数据
      const favorites = [];
      
      // 从本地缓存优先加载题目信息
      const cachedQuestionsStr = localStorage.getItem('cachedQuestions');
      let cachedQuestions = [];
      
      if (cachedQuestionsStr) {
        try {
          const parsed = JSON.parse(cachedQuestionsStr);
          if (parsed && parsed.data && parsed.data.data && parsed.data.data.questions) {
            cachedQuestions = parsed.data.data.questions;
          }
        } catch (e) {
          console.error("解析缓存题目数据失败:", e);
        }
      }
      
      // 从缓存中查找收藏题目详细信息
      for (const id of favoriteIds) {
        let question = null;
        
        // 先从题目列表缓存查找
        if (cachedQuestions.length > 0) {
          question = cachedQuestions.find(q => q.id === Number(id) || q.id === id);
        }
        
        // 如果题目列表缓存没有找到，尝试从单题缓存获取
        if (!question) {
          const cachedQuestionStr = localStorage.getItem(`cachedQuestion_${id}`);
          if (cachedQuestionStr) {
            try {
              const parsedCache = JSON.parse(cachedQuestionStr);
              if (parsedCache && parsedCache.data && parsedCache.data.data) {
                question = parsedCache.data.data;
              }
            } catch (e) {
              console.error(`解析缓存的题目 #${id} 数据失败:`, e);
            }
          }
        }
        
        // 如果找到了题目数据，添加到收藏列表
        if (question) {
          // 确保数据格式正确，添加默认值
          favorites.push({
            ...question,
            id: question.id || id,
            question_code: question.question_code || `题目${id}`,
            year: question.year || '未知年份',
            subject: question.subject || '未分类',
            question_type: question.question_type || 1,
            question_text: question.question_text || '题目内容未加载',
            is_favorite: true
          });
        } else {
          // 没有详细信息时，添加占位数据
          favorites.push({
            id,
            question_code: `题目${id}`,
            year: '未知年份',
            subject: '未分类',
            question_type: 1,
            question_text: '题目内容未加载，请刷新页面',
            is_favorite: true
          });
        }
      }
      
      return {
        success: true,
        message: "使用本地数据组装收藏题目列表",
        source: "local-assembled",
        data: {
          favorites,
          total: favorites.length
        }
      };
    } catch (error) {
      console.error('组装本地收藏题目失败:', error);
      return {
        success: false,
        message: '无法获取收藏题目信息',
        source: "local-error",
        data: {
          favorites: [],
          total: 0
        }
      };
    }
  },

  // 多关键词搜索API
  async searchWithMultipleKeywords(params = {}) {
    try {
      const { keywords, subject, year, questionType, page = 1, limit = 100 } = params;
      
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return {
          success: false,
          message: "请提供搜索关键词"
        };
      }

      console.log('调用多关键词搜索API:', { keywords, subject, year, questionType, page, limit });

      const response = await fetch('/api/exams/questions/search', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          keywords,
          subject: subject !== 'all' ? subject : undefined,
          year: year && !year.includes('all') ? year : undefined,
          questionType,
          page,
          limit
        })
      });

      if (!response.ok) {
        console.error(`多关键词搜索失败: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('多关键词搜索响应:', {
        success: data.success,
        total: data.data?.pagination?.total,
        returned: data.data?.questions?.length,
        keywords: data.keywords
      });
      
      return data;
    } catch (error) {
      console.error('多关键词搜索失败:', error);
      return {
        success: false,
        message: "搜索失败，请稍后再试",
        error: error.message
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