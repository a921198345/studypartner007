"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Star, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { QuestionDetail } from "@/components/question-bank/question-detail"
import { AnswerCard } from "@/components/question-bank/answer-card"
import { questionApi, addToWrongQuestions, isQuestionFavorited } from "@/lib/api/questions"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { updateCurrentSession, endCurrentSession, getCurrentSession } from "@/lib/answer-sessions"

// 获取当前页面模式（普通、错题、收藏）
const getCurrentPageMode = (searchParams: URLSearchParams | null): string => {
  const source = searchParams?.get('source');
  
  if (source === 'wrong' || source === 'wrong-questions') {
    return 'wrong';
  } else if (source === 'favorites') {
    return 'favorites';
  } else {
    return 'normal';
  }
};

// 根据不同模式返回对应的localStorage键名
const getStorageKeyForMode = (mode: string): string => {
  switch(mode) {
    case 'wrong':
      return 'wrongAnswerHistory';
    case 'favorites':
      return 'favoriteAnswerHistory';
    default:
      return 'answerHistory';
  }
};

// 获取当前模式的答题历史
const getAnswerHistoryForMode = (mode: string): Record<string, any> => {
  try {
    const storageKey = getStorageKeyForMode(mode);
    const historyString = localStorage.getItem(storageKey);
    if (historyString) {
      const history = JSON.parse(historyString);
      if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
        return history;
      }
    }
  } catch (e) {
    console.error(`获取${mode}模式答题历史失败:`, e);
  }
  // 返回空的历史记录结构
  return { answered: {}, correct: {}, results: {}, timestamp: Date.now() };
};

// 保存当前模式的答题历史
const saveAnswerHistoryForMode = (mode: string, historyData: Record<string, any>): void => {
  try {
    const storageKey = getStorageKeyForMode(mode);
    localStorage.setItem(storageKey, JSON.stringify({
      ...historyData,
      timestamp: Date.now()
    }));
    console.log(`保存${mode}模式答题历史成功`);
  } catch (e) {
    console.error(`保存${mode}模式答题历史失败:`, e);
  }
};

// 清除特定模式的答题状态
const clearModeAnswerState = (mode, questionId = null) => {
  try {
    // 如果提供了questionId，则只清除该题的状态
    if (questionId) {
      const history = getAnswerHistoryForMode(mode);
      if (history.answered && history.answered[questionId]) {
        delete history.answered[questionId];
      }
      if (history.correct && history.correct[questionId]) {
        delete history.correct[questionId];
      }
      if (history.results && history.results[questionId]) {
        delete history.results[questionId];
      }
      saveAnswerHistoryForMode(mode, history);
      console.log(`已清除${mode}模式题目#${questionId}的答题状态`);
    } else {
      // 如果未提供questionId，则清除整个模式的状态
      saveAnswerHistoryForMode(mode, { answered: {}, correct: {}, results: {}, timestamp: Date.now() });
      console.log(`已清除${mode}模式的所有答题状态`);
    }
  } catch (e) {
    console.error(`清除${mode}模式答题状态失败:`, e);
  }
};

export default function QuestionPage() {
  const params = useParams()
  const router = useRouter()
  const questionId = params.id as string
  const [question, setQuestion] = useState<any>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>("")
  const [submittedAnswer, setSubmittedAnswer] = useState<string | string[] | null>(null)
  const [answerResult, setAnswerResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  // 题目导航状态
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({})
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, boolean>>({})
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)

  // 在组件顶部添加新的状态
  const [isAuthenticated, setIsAuthenticated] = useState(true);  // 默认假设已登录
  const [usingLocalStorage, setUsingLocalStorage] = useState(false); // 标记是否正在使用本地存储
  
  // 优化导航相关状态
  const [currentNavPage, setCurrentNavPage] = useState(1);
  const [filteredQuestions, setFilteredQuestions] = useState<{id: number, question_code?: string}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [totalAllQuestions, setTotalAllQuestions] = useState(25); // 应用级别的总题数
  const [filteredTotalCount, setFilteredTotalCount] = useState(25); // 用于导航面板的筛选后题目总数，确保与filteredQuestions.length同步
  const questionsPerPage = 25; // 导航面板每页显示的题目按钮数量
  
  // 添加一个新状态来跟踪当前会话中的答题记录
  // 初始化时从 sessionStorage 读取，确保页面切换时状态不丢失
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, {isCorrect: boolean}>>(() => {
    try {
      const saved = sessionStorage.getItem('currentSessionAnswers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // 使用ref避免不必要的重渲染
  const navigationInitializedRef = useRef(false);
  const apiCallAttemptedRef = useRef(false);
  
  // 添加一个通用的导航刷新触发器
  const [navigationRefreshTrigger, setNavigationRefreshTrigger] = useState(0);
  
  // 从URL获取查询参数
  const searchParams = useSearchParams();

  useEffect(() => {
    // 检查用户登录状态
    const checkAuthStatus = async () => {
      try {
        // 添加超时处理，避免API请求长时间挂起
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('检查登录状态超时')), 3000)
        );
        
        const fetchPromise = fetch('/api/auth/session');
        
        // 同时运行请求和超时
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        // 进一步检查响应格式
        if (!response.ok) {
          console.log(`用户未登录或API返回错误状态码: ${response.status}，使用本地存储模式`);
          setIsAuthenticated(false);
          setUsingLocalStorage(true);
          return;
        }
        
        // 尝试解析响应JSON
        try {
          const text = await response.text();
          
          // 检查是否为空响应
          if (!text || text.trim() === '') {
            console.log('API返回空响应，使用本地存储模式');
            setIsAuthenticated(false);
            setUsingLocalStorage(true);
            return;
          }
          
          const data = JSON.parse(text);
          setIsAuthenticated(!!data.user);
        } catch (jsonError) {
          console.error('解析登录状态响应失败，使用本地存储作为降级策略', jsonError);
          setIsAuthenticated(false);
          setUsingLocalStorage(true);
        }
      } catch (error) {
        console.error('检查登录状态失败，使用本地存储作为降级策略', error);
        setIsAuthenticated(false);
        setUsingLocalStorage(true);
      }
    };

    checkAuthStatus();
  }, []);
  
  // 获取筛选信息的方法
  const getFilteredInfo = useCallback(() => {
    try {
      console.log("尝试读取localStorage中的筛选题目列表");
      const filteredListStr = localStorage.getItem('filteredQuestionsList');
      if (filteredListStr) {
        const filteredData = JSON.parse(filteredListStr);
        console.log("原始筛选数据:", {
          questionsLength: filteredData.questions?.length,
          actualTotal: filteredData.actualTotal,
          partial: filteredData.partial,
          filters: filteredData.filters
        });
        if (filteredData && filteredData.timestamp && (Date.now() - filteredData.timestamp < 3600000)) {
          console.log(`找到有效的筛选题目列表，共${filteredData.questions?.length || 0}题，实际总数${filteredData.actualTotal || '未知'}`);
          return filteredData;
        }
      }
    } catch (e) {
      console.error("解析localStorage筛选数据失败:", e);
    }
    return null;
  }, []);

  // 初始化导航的方法
  const initializeNavigation = useCallback(() => {
    if (navigationInitializedRef.current) return;
    
    try {
      const currentId = parseInt(questionId);
      if (isNaN(currentId)) return;
      
      const filteredData = getFilteredInfo();
      const urlIndex = searchParams.get('index');

      let questionsToDisplay: {id: number, question_code?: string}[] = [];
      let currentIndex = -1;

      // 检测是否来自错题页面
      const source = searchParams.get('source');
      const wrongIndex = searchParams.get('wrongIndex');
      const resetWrong = searchParams.get('resetWrong') === 'true';
      
      if (source === 'wrong') {
        // 从错题集加载导航数据
        console.log('从错题集加载导航数据');
        const wrongQuestions = JSON.parse(localStorage.getItem('wrongQuestions') || '[]');
        if (Array.isArray(wrongQuestions) && wrongQuestions.length > 0) {
          questionsToDisplay = wrongQuestions.map(q => ({
            id: q.id,
            question_code: q.question_code || `错题${q.id}`
          }));
          
          // 使用wrongIndex参数或查找当前题目在错题集中的位置
          if (wrongIndex && !isNaN(parseInt(wrongIndex))) {
            currentIndex = parseInt(wrongIndex);
          } else {
            currentIndex = questionsToDisplay.findIndex(q => q.id === currentId);
          }
          
          // 错题页面：只在真正的初次进入时重置状态
          const isFirstEnter = !searchParams.get('continue');
          const isNavigationRefresh = navigationInitializedRef.current; // 如果已经初始化过，说明是导航刷新
          
          if ((resetWrong || isFirstEnter) && !isNavigationRefresh) {
            // 清空当前会话中的答题记录
            setSessionAnswers({});
            // 清空错题模式的答题历史
            clearModeAnswerState('wrong');
            console.log("错题页面：重置所有错题的状态为未作答");
          } else {
            console.log("错题页面：保持现有的答题状态，不重置");
          }
          
          console.log(`从错题集加载的导航数据：共${questionsToDisplay.length}题，当前索引：${currentIndex}，重置状态：${resetWrong}`);
        }
      } else if (source === 'favorites') {
        // 从收藏页面加载导航数据
        console.log('从收藏页面加载导航数据');
        try {
          const favoritesListStr = localStorage.getItem('favoriteQuestionsList');
          if (favoritesListStr) {
            const favoritesList = JSON.parse(favoritesListStr);
            if (favoritesList && favoritesList.questions && favoritesList.questions.length > 0) {
              questionsToDisplay = favoritesList.questions.map(q => ({
                id: q.id,
                question_code: q.question_code || `收藏${q.id}`
              }));
              
              // 使用index参数或查找当前题目在收藏列表中的位置
              const favIndex = searchParams.get('index');
              if (favIndex && !isNaN(parseInt(favIndex))) {
                currentIndex = parseInt(favIndex);
              } else {
                currentIndex = questionsToDisplay.findIndex(q => q.id === currentId);
              }
              
              console.log(`从收藏列表加载的导航数据：共${questionsToDisplay.length}题，当前索引：${currentIndex}`);
              
              // 设置题目来源为收藏页面
              console.log('设置收藏页面来源');
            }
          }
        } catch (e) {
          console.error("解析收藏列表数据失败:", e);
        }
      } else if (filteredData) {
        // 处理筛选数据
        if (filteredData.questions && filteredData.questions.length > 0) {
          // 有完整的题目列表
          console.log(`从localStorage加载筛选后的题目列表，共${filteredData.questions.length}题`);
          console.log('前10个题目ID:', filteredData.questions.slice(0, 10).map(q => q.id));
          questionsToDisplay = [...filteredData.questions];
          
          if (urlIndex) {
            const parsedUrlIndex = parseInt(urlIndex);
            if (!isNaN(parsedUrlIndex) && parsedUrlIndex >= 0 && parsedUrlIndex < questionsToDisplay.length && questionsToDisplay[parsedUrlIndex].id === currentId) {
              currentIndex = parsedUrlIndex;
            }
          }
          if (currentIndex === -1) {
            currentIndex = questionsToDisplay.findIndex(q => q.id === currentId);
          }

          if (currentIndex === -1) { 
            console.log(`题目ID ${currentId} 不在筛选列表中，尝试添加到列表`);
            questionsToDisplay.push({ id: currentId, question_code: `Q${currentId}` }); // 确保当前题目在列表中
            currentIndex = questionsToDisplay.findIndex(q => q.id === currentId); // 重新查找索引
          }
        } else if (filteredData.actualTotal) {
          // 没有完整列表但有实际总数（性能优化情况）
          console.log(`筛选数据包含实际总数: ${filteredData.actualTotal}，但没有完整列表`);
          // 创建虚拟列表用于导航
          const totalCount = filteredData.actualTotal;
          questionsToDisplay = Array.from({ length: totalCount }, (_, i) => ({ 
            id: i + 1, 
            question_code: `题目${i + 1}` 
          }));
          
          // 确保当前题目在合理范围内
          if (currentId > 0 && currentId <= totalCount) {
            currentIndex = currentId - 1;
          } else {
            currentIndex = 0;
            console.warn(`当前题目ID ${currentId} 超出筛选范围 1-${totalCount}`);
          }
        }
      } else {
        console.log("没有筛选后的题目列表或列表为空，创建备用导航");
        // 使用已通过 fetchTotalQuestions 获取的 totalAllQuestions，如果它大于0
        const dummyCount = totalAllQuestions > 0 ? totalAllQuestions : 25; 
        questionsToDisplay = Array.from({ length: dummyCount }, (_, i) => ({ id: i + 1, question_code: `DUMMY${i + 1}` }));
        currentIndex = questionsToDisplay.findIndex(q => q.id === currentId);
        
        if (currentIndex === -1) { // 如果在生成的虚拟列表中还是找不到
            if (currentId > 0 && currentId <= dummyCount) { // ID在范围内
                 currentIndex = currentId -1; 
            } else { // ID超出范围，或者 dummyCount 为0的极端情况
                 questionsToDisplay.push({ id: currentId, question_code: `Q${currentId}`});
                 // 如果添加了，需要重新排序或决定其位置
                 // questionsToDisplay.sort((a,b) => a.id - b.id);
                 currentIndex = questionsToDisplay.findIndex(q => q.id === currentId);
            }
        }
      }
      
      setFilteredQuestions(questionsToDisplay);
      setFilteredTotalCount(questionsToDisplay.length); // 关键：确保显示的总数与实际列表长度一致
      console.log(`导航初始化完成: 共 ${questionsToDisplay.length} 题可导航, 当前题目索引: ${currentIndex}`);

      if (currentIndex !== -1) {
        setCurrentQuestionIndex(currentIndex);
        const navPage = Math.ceil((currentIndex + 1) / questionsPerPage);
        setCurrentNavPage(navPage);
      } else {
         setCurrentQuestionIndex(0); 
         setCurrentNavPage(1);
         console.warn(`初始化后，无法定位当前题目ID ${currentId} 在列表中的位置。默认显示第一题/第一页。`);
      }
      
      navigationInitializedRef.current = true;
    } catch (e) {
      console.error("初始化导航严重失败:", e);
      const fallbackQuestions = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, question_code: `FB${i+1}` }));
      setFilteredQuestions(fallbackQuestions);
      setFilteredTotalCount(fallbackQuestions.length);
      const currentId = parseInt(questionId);
      const fallbackIndex = fallbackQuestions.findIndex(q => q.id === currentId);
      setCurrentQuestionIndex(fallbackIndex !== -1 ? fallbackIndex : 0);
      setCurrentNavPage(1);
      navigationInitializedRef.current = true;
    }
  }, [questionId, searchParams, getFilteredInfo, questionsPerPage, totalAllQuestions]);

  // 获取题目总数 (此函数现在主要设置 totalAllQuestions)
  const fetchTotalQuestions = async () => {
    try {
      const storedTotalCount = localStorage.getItem('questionTotalCount');
      if (storedTotalCount && !isNaN(parseInt(storedTotalCount))) {
        const total = parseInt(storedTotalCount);
        console.log(`从localStorage获取应用总题数: ${total}`);
        setTotalAllQuestions(total);
        return; 
      }
      
      const response = await questionApi.getQuestionsCount();
      if (response.success && response.data && response.data.total) {
        const total = response.data.total;
        console.log(`从API获取应用总题数: ${total}`);
        setTotalAllQuestions(total);
        localStorage.setItem('questionTotalCount', total.toString());
      } else {
          console.warn("从API获取总题数失败或无数据，使用默认值 25");
          setTotalAllQuestions(25); 
      }
    } catch (error) {
      console.error("获取应用总题数失败:", error);
      setTotalAllQuestions(25); 
    }
  };
  
  // 主要初始化逻辑：确保 fetchTotalQuestions 在 initializeNavigation 之前或其依赖数据准备好
  useEffect(() => {
    if (apiCallAttemptedRef.current) return;
    apiCallAttemptedRef.current = true;
    
    console.log(`页面加载，题目ID: ${questionId}`);

    const init = async () => {
      // 检查URL参数中是否有筛选条件（从答题历史跳转过来的情况）
      const filtersParam = searchParams.get('filters');
      const sessionIdParam = searchParams.get('sessionId');
      
      if (filtersParam) {
        try {
          const filters = JSON.parse(decodeURIComponent(filtersParam));
          console.log('从URL参数恢复筛选条件:', filters);
          
          // 根据筛选条件重新获取题目列表
          if (filters.aiKeywords && filters.aiKeywords.length > 0) {
            // AI关键词搜索
            console.log('使用AI关键词重新获取题目列表:', filters.aiKeywords);
            const response = await questionApi.searchWithMultipleKeywords({
              keywords: filters.aiKeywords,
              subject: filters.subject,
              year: filters.year,
              questionType: filters.question_type,
              page: 1,
              limit: 1000
            });
            
            if (response.success && response.data && response.data.questions) {
              const questions = response.data.questions.map(q => ({
                id: q.id,
                question_code: q.question_code || `Q${q.id}`
              }));
              
              // 保存到localStorage供导航使用
              localStorage.setItem('filteredQuestionsList', JSON.stringify({
                questions: questions,
                filters: filters,
                actualTotal: questions.length,
                timestamp: Date.now()
              }));
              console.log(`恢复了${questions.length}道筛选题目到localStorage`);
            }
          } else if (filters.search) {
            // 普通搜索
            console.log('使用搜索关键词重新获取题目列表:', filters.search);
            const response = await questionApi.searchQuestions({
              keyword: filters.search,
              subject: filters.subject,
              year: filters.year,
              questionType: filters.question_type,
              page: 1,
              limit: 1000
            });
            
            if (response.success && response.data && response.data.questions) {
              const questions = response.data.questions.map(q => ({
                id: q.id,
                question_code: q.question_code || `Q${q.id}`
              }));
              
              // 保存到localStorage供导航使用
              localStorage.setItem('filteredQuestionsList', JSON.stringify({
                questions: questions,
                filters: filters,
                actualTotal: questions.length,
                timestamp: Date.now()
              }));
              console.log(`恢复了${questions.length}道筛选题目到localStorage`);
            }
          } else {
            // 其他筛选条件
            console.log('使用普通筛选条件重新获取题目列表:', filters);
            const response = await questionApi.getQuestions({
              page: 1,
              limit: 1000,
              subject: filters.subject,
              year: filters.year,
              questionType: filters.question_type
            });
            
            if (response.success && response.data && response.data.questions) {
              const questions = response.data.questions.map(q => ({
                id: q.id,
                question_code: q.question_code || `Q${q.id}`
              }));
              
              // 保存到localStorage供导航使用
              localStorage.setItem('filteredQuestionsList', JSON.stringify({
                questions: questions,
                filters: filters,
                actualTotal: questions.length,
                timestamp: Date.now()
              }));
              console.log(`恢复了${questions.length}道筛选题目到localStorage`);
            }
          }
          
          // 如果有sessionId，设置当前会话
          if (sessionIdParam) {
            sessionStorage.setItem('currentSessionId', sessionIdParam);
            console.log('恢复会话ID:', sessionIdParam);
          }
        } catch (e) {
          console.error('解析筛选条件失败:', e);
        }
      }
      
      await fetchTotalQuestions(); // 先获取全局总数
      initializeNavigation();     // 然后用这个总数（如果需要）初始化导航
      
      fetchAnswerHistory().catch(err => {
        console.log("获取答题历史出错，但页面将继续加载", err);
      });
      fetchQuestionDetails();
    };

    init();
  }, [questionId, searchParams]); // 添加 searchParams 依赖

  const fetchAnswerHistory = async () => {
    // 获取当前页面的模式
    const currentMode = getCurrentPageMode(searchParams);
    console.log(`[DEBUG] fetchAnswerHistory开始执行，当前模式: ${currentMode}`, {
      questionId,
      currentSessionAnswers: sessionAnswers
    });
    
    // 是否需要重置当前题目状态 - 根据查询参数决定
    const isContinue = searchParams.get('continue') === 'true';
    const shouldResetState = !isContinue;
    
    if (shouldResetState) {
      console.log(`[DEBUG] ${currentMode}模式，重置当前题目状态为未答状态`);
      // 清空当前题目的答题状态
      setSelectedAnswer("");
      setSubmittedAnswer(null);
      setAnswerResult(null);
    }
      
    // 加载当前模式的答题历史
    const historyKey = getStorageKeyForMode(currentMode);
    console.log(`[DEBUG] 加载${currentMode}模式的答题历史，使用键: ${historyKey}`);
    
    try {
      // 如果是收藏模式，首先检查是否需要从普通模式同步数据
      if (currentMode === 'favorites') {
        if (isContinue) {
          console.log('[DEBUG] 收藏模式(continue=true)：从普通模式同步答题数据');
          
          // 1. 获取收藏的题目列表
          let favoriteQuestions = [];
          try {
            const favoritesListStr = localStorage.getItem('favoriteQuestionsList');
            if (favoritesListStr) {
              const favoritesList = JSON.parse(favoritesListStr);
              if (favoritesList && favoritesList.questions) {
                favoriteQuestions = favoritesList.questions.map(q => q.id.toString());
                console.log(`[DEBUG] 获取到收藏题目列表，共${favoriteQuestions.length}道题`);
              }
            } else {
              // 如果没有favoriteQuestionsList，尝试从favoriteQuestions获取
              const favoritesStr = localStorage.getItem('favoriteQuestions');
              if (favoritesStr) {
                const favorites = JSON.parse(favoritesStr);
                favoriteQuestions = favorites.map(id => id.toString());
                console.log(`[DEBUG] 从favoriteQuestions获取收藏题目ID列表，共${favoriteQuestions.length}道题`);
          }
        }
      } catch (e) {
            console.error('[DEBUG] 获取收藏题目列表失败:', e);
          }
          
          // 2. 获取普通模式的答题历史
          const normalHistoryStr = localStorage.getItem('answerHistory');
          if (normalHistoryStr && favoriteQuestions.length > 0) {
            try {
              const normalHistory = JSON.parse(normalHistoryStr);
              if (normalHistory && normalHistory.timestamp && 
                  Date.now() - normalHistory.timestamp < 86400000) {
                
                // 3. 获取当前收藏模式的答题历史（如果存在）
                let favoriteHistory = getAnswerHistoryForMode('favorites');
                let hasNewData = false;
                
                // 4. 遍历收藏题目，检查在普通模式中是否已答过，如果是则复制状态
                favoriteQuestions.forEach(fqId => {
                  if (normalHistory.results && normalHistory.results[fqId]) {
                    console.log(`[DEBUG] 题目#${fqId}在普通模式下已答过，复制状态到收藏模式`);
                    
                    // 复制答题状态
                    favoriteHistory.answered[fqId] = true;
                    favoriteHistory.correct[fqId] = normalHistory.correct[fqId] || false;
                    favoriteHistory.results[fqId] = normalHistory.results[fqId];
                    hasNewData = true;
                    
                    // 如果当前题目是这道题，并且不需要重置状态，则恢复答题状态
                    if (fqId === questionId && !shouldResetState) {
                      const qResult = normalHistory.results[fqId];
                      setSubmittedAnswer(qResult.submittedAnswer);
            setAnswerResult({
                        is_correct: qResult.isCorrect,
                        correct_answer: qResult.correctAnswer,
                        explanation: qResult.explanation || "暂无解析"
                      });
                      
                      // 更新当前会话状态
                      setSessionAnswers(prev => ({
                        ...prev,
                        [fqId]: {
                          submitted: qResult.submittedAnswer,
                          correct: qResult.correctAnswer,
                          isCorrect: qResult.isCorrect
                        }
                      }));
                      
                      console.log(`[DEBUG] 从普通模式恢复当前题目#${fqId}的答题状态`);
                    }
                  }
                });
                
                // 5. 如果有新数据，保存更新后的收藏模式答题历史
                if (hasNewData) {
                  saveAnswerHistoryForMode('favorites', favoriteHistory);
                  console.log('[DEBUG] 已从普通模式同步答题状态到收藏模式');
                }
              }
            } catch (e) {
              console.error('[DEBUG] 同步答题历史数据失败:', e);
            }
          }
        } else {
          // 不是继续模式，检查是否是第一次进入收藏练习
          const isFirstEntry = !sessionStorage.getItem('favorites_session_started');
          
          if (isFirstEntry) {
            // 只在第一次进入时清空历史记录
            console.log('[DEBUG] 收藏模式(开始练习)：首次进入，清空所有答题记录');
            saveAnswerHistoryForMode('favorites', { answered: {}, correct: {}, results: {}, timestamp: Date.now() });
            sessionStorage.setItem('favorites_session_started', 'true');
            
            // 更新状态变量，确保UI显示正确的未答状态
            setAnsweredQuestions({});
            setCorrectAnswers({});
            setTotalAnswered(0);
            setTotalCorrect(0);
            setSessionAnswers({});
          } else {
            console.log('[DEBUG] 收藏模式(开始练习)：非首次进入，加载当前会话的答题记录');
            // 即使不是第一次进入，也需要加载收藏模式的历史记录
            // 这样可以在题目间切换时保持答题状态
          }
        }
      }
      
      // 读取本地存储中的答题历史
      const historyString = localStorage.getItem(historyKey);
      
      if (historyString) {
        try {
        const history = JSON.parse(historyString);
        
          // 检查历史记录是否有效且未过期
          if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
            // 使用历史数据更新状态
          setAnsweredQuestions(history.answered || {});
          setCorrectAnswers(history.correct || {});
          setTotalAnswered(Object.keys(history.answered || {}).length);
          setTotalCorrect(Object.keys(history.correct || {}).length);
          
            // 如果没有重置状态，且有当前题目的答题记录，恢复答题状态
            if (!shouldResetState && history.results && history.results[questionId]) {
              const questionResult = history.results[questionId];
              console.log(`[DEBUG] 恢复题目 #${questionId} 的答题状态:`, questionResult);
              
              setSubmittedAnswer(questionResult.submittedAnswer);
            setAnswerResult({
                is_correct: questionResult.isCorrect,
                correct_answer: questionResult.correctAnswer,
                explanation: questionResult.explanation || "暂无解析"
              });
              
              // 更新当前会话状态
              setSessionAnswers(prev => ({
                ...prev,
                [questionId]: {
                  submitted: questionResult.submittedAnswer,
                  correct: questionResult.correctAnswer,
                  isCorrect: questionResult.isCorrect
                }
              }));
            }
            
            console.log(`[DEBUG] 成功加载${currentMode}模式答题历史`);
            return;
      }
    } catch (e) {
          console.error(`[DEBUG] 解析${currentMode}模式答题历史失败:`, e);
        }
      }
      
      // 如果没有有效历史记录，则初始化为空状态
      console.log(`[DEBUG] ${currentMode}模式无有效答题历史，初始化为空状态`);
      setAnsweredQuestions({});
      setCorrectAnswers({});
      setTotalAnswered(0);
      setTotalCorrect(0);
      
    } catch (error) {
      console.error(`[DEBUG] 获取${currentMode}模式答题历史失败:`, error);
      setError(`加载答题历史失败: ${error.message}`);
    }
  };

  const fetchQuestionDetails = async () => {
    setLoading(true);
    setError(null);
    setQuestion(null);
    
    try {
      // 尝试获取题目详情
      const data = await questionApi.getQuestionById(questionId);
      
      if (data.success) {
        // 预处理选项数据，确保它是可用的数组格式
        let processedOptions = [];
        if (Array.isArray(data.data.options) && data.data.options.length > 0) {
          processedOptions = data.data.options;
        } else if (typeof data.data.options === 'string') {
          try {
            const parsed = JSON.parse(data.data.options);
            if (Array.isArray(parsed) && parsed.length > 0) {
              processedOptions = parsed;
            }
          } catch (e) {
            console.error("解析选项JSON字符串失败:", e);
          }
        }
        
        // 如果没有有效选项，创建默认选项
        if (processedOptions.length === 0) {
          processedOptions = ['A', 'B', 'C', 'D'].map(key => ({
            key: key,
            text: `选项${key}` 
          }));
        }
        
        // 确保每个选项都有key和text属性
        processedOptions = processedOptions.map((opt, index) => {
          if (typeof opt === 'object' && opt !== null) {
            return {
              key: opt.key || opt.value || opt.id || String.fromCharCode(65 + index),
              text: opt.text || opt.label || opt.content || `选项${String.fromCharCode(65 + index)}`
            };
          } else if (typeof opt === 'string') {
            return { key: String.fromCharCode(65 + index), text: opt };
          } else {
            return { key: String.fromCharCode(65 + index), text: `选项${String.fromCharCode(65 + index)}` };
          }
        });
        
        // 确保answer字段为正确格式
        let processedAnswer = data.data.correct_answer || data.data.answer;
        
        // 如果API没有返回答案数据，设置错误状态而不是默认值
        if (processedAnswer === undefined || processedAnswer === null) {
          console.error(`题目 #${questionId} 没有答案数据，无法进行答题`);
          setError(`题目数据不完整，缺少正确答案信息`);
          
          // 仍然加载题目其他数据，但不设置答案字段
          setQuestion({
            ...data.data,
            options: processedOptions,
            // 不设置answer字段，确保不会有默认的'A'
            analysis: data.data.explanation || data.data.analysis || "暂无解析"
          });
          setLoading(false);
          return;
        }
        
        // 正常情况下处理答案格式
        if (typeof processedAnswer === 'string') {
          // 如果答案是字符串，转换为数组
          processedAnswer = processedAnswer.split('');
        } else if (!Array.isArray(processedAnswer)) {
          // 如果不是数组，强制转换
          processedAnswer = [String(processedAnswer)];
        }
        
        // 确保解析文本存在
        const processedAnalysis = data.data.explanation || data.data.analysis || "暂无解析";
        
        setQuestion({
          ...data.data,
          options: processedOptions,
          answer: processedAnswer,
          analysis: processedAnalysis
        });
        setIsFavorite(data.data.is_favorite);

        // 检查是否从错题集进入并进行额外处理
        const currentMode = getCurrentPageMode(searchParams);
        
        if (currentMode === 'wrong') {
          console.log(`从错题集进入题目 #${questionId}，检查错题数据`);
          try {
            // 从错题集获取题目的详细信息
            const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
            if (wrongQuestionsStr) {
              const wrongQuestions = JSON.parse(wrongQuestionsStr);
              const wrongQuestion = wrongQuestions.find(q => q.id === parseInt(questionId) || q.id === questionId);
              
              if (wrongQuestion) {
                console.log(`找到错题数据:`, wrongQuestion);
                
                // 确保题目对象中有正确的答案字段，错题集中存储的是correct_answer
                if ((!processedAnswer || processedAnswer.length === 0) && wrongQuestion.correct_answer) {
                  console.log(`从错题集补充答案数据: ${wrongQuestion.correct_answer}`);
                  
                  // 确保答案格式正确
                  let wrongAnswerData = wrongQuestion.correct_answer;
                  if (typeof wrongAnswerData === 'string') {
                    wrongAnswerData = wrongAnswerData.split('');
                  } else if (!Array.isArray(wrongAnswerData)) {
                    wrongAnswerData = [String(wrongAnswerData)];
                  }
                  
                  setQuestion(prev => ({
                    ...prev,
                    answer: wrongAnswerData
                  }));
                }
                
                // 确保题目对象中有解析字段，错题集中存储的是explanation
                if ((!processedAnalysis || processedAnalysis === "暂无解析") && wrongQuestion.explanation) {
                  console.log(`从错题集补充解析数据: ${wrongQuestion.explanation}`);
                  setQuestion(prev => ({
                    ...prev,
                    analysis: wrongQuestion.explanation
                  }));
                }
              }
            }
          } catch (err) {
            console.error("处理错题集数据失败:", err);
          }
        }

      } else {
        setError(data.message || "获取题目详情失败");
      }
    } catch (err) {
      console.error("获取题目详情出错:", err);
      setError("获取题目详情时发生错误，请稍后再试");
      
      // 降级策略：尝试从错题集加载数据
      try {
        const currentMode = getCurrentPageMode(searchParams);
        
        if (currentMode === 'wrong') {
          console.log(`API获取题目失败，尝试从错题集直接加载题目 #${questionId}`);
          const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
          if (wrongQuestionsStr) {
            const wrongQuestions = JSON.parse(wrongQuestionsStr);
            const wrongQuestion = wrongQuestions.find(q => q.id === parseInt(questionId) || q.id === questionId);
            
            if (wrongQuestion) {
              console.log(`成功从错题集找到题目数据:`, wrongQuestion);
              
              // 确保有正确答案数据
              if (!wrongQuestion.correct_answer) {
                console.error(`错题集中的题目 #${questionId} 没有正确答案数据`);
                setError("错题集中的题目数据不完整，缺少正确答案");
                setLoading(false);
                return;
              }
              
              // 创建一个基本题目对象
              setQuestion({
                id: wrongQuestion.id,
                question_text: wrongQuestion.question_text,
                question_type: wrongQuestion.question_type,
                options: wrongQuestion.options || ['A', 'B', 'C', 'D'].map(key => ({ key, text: `选项${key}` })),
                subject: wrongQuestion.subject || '未知',
                year: wrongQuestion.year || '未知年份',
                answer: typeof wrongQuestion.correct_answer === 'string' ? 
                  wrongQuestion.correct_answer.split('') : 
                  (Array.isArray(wrongQuestion.correct_answer) ? 
                    wrongQuestion.correct_answer : [String(wrongQuestion.correct_answer)]),
                analysis: wrongQuestion.explanation || '暂无解析',
                question_code: wrongQuestion.question_code || `#${questionId}`
              });
              
              // 清除错误状态
              setError(null);
            }
          }
        }
      } catch (fallbackErr) {
        console.error("降级策略从错题集加载失败:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answer: string | string[]) => {
    // 根据题目类型(单选还是多选)处理答案
    if (question && question.question_type === 1) {
      // 单选题
      setSelectedAnswer(answer);
    } else {
      // 多选题
      setSelectedAnswer(Array.isArray(answer) ? answer : [answer]);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)) {
      return;
    }

    setSubmitting(true);
    try {
      // 获取当前页面模式
      const currentMode = getCurrentPageMode(searchParams);
      console.log(`提交答案 - 当前模式: ${currentMode}`);
      
      // 安全获取和格式化答案
      const formattedAnswer = Array.isArray(selectedAnswer) 
        ? [...selectedAnswer].sort().join('') 
        : selectedAnswer;

      // 提交答案到服务器
      const result = await questionApi.submitAnswer(questionId, formattedAnswer);
      console.log('提交答案结果:', result);
      
      if (result.success) {
        setSubmittedAnswer(formattedAnswer);
        setAnswerResult({
          is_correct: result.data.is_correct,
          correct_answer: result.data.correct_answer,
          explanation: result.data.explanation || '暂无解析'
        });
        
        // 将当前答题结果保存到当前模式的历史记录中
        const historyKey = getStorageKeyForMode(currentMode);
        console.log(`保存答题结果到: ${historyKey}`);
        
        // 获取当前模式的历史记录
        const historyString = localStorage.getItem(historyKey) || '{}';
        let history = { answered: {}, correct: {}, results: {}, timestamp: Date.now() };
        
        try {
          const parsedHistory = JSON.parse(historyString);
          if (parsedHistory && typeof parsedHistory === 'object') {
            history = {
              answered: parsedHistory.answered || {},
              correct: parsedHistory.correct || {},
              results: parsedHistory.results || {},
              timestamp: Date.now()
            };
          }
      } catch (e) {
          console.error(`解析${currentMode}模式答题历史失败:`, e);
        }
        
        // 更新历史记录
        history.answered[questionId] = true;
        history.correct[questionId] = result.data.is_correct;
        history.results[questionId] = {
          submittedAnswer: formattedAnswer,
          isCorrect: result.data.is_correct,
          correctAnswer: result.data.correct_answer,
          explanation: result.data.explanation || '暂无解析',
          questionType: question?.question_type || (result.data.correct_answer.length > 1 ? 2 : 1),
            answeredAt: new Date().toISOString()
        };
        
        // 保存更新后的历史记录
        localStorage.setItem(historyKey, JSON.stringify(history));
        
        // 如果当前模式是wrong，同时更新原始答题历史，用于错题集计算
        if (currentMode !== 'normal') {
          // 保存到常规模式记录中以保持数据一致性
          updateNormalModeHistory(questionId, formattedAnswer, result.data);
        }
        
        // 更新当前答题会话（所有模式都需要更新）
        // 根据不同模式获取正确的统计数据
        let sessionAnsweredCount = 0;
        let sessionCorrectCount = 0;
        
        if (currentMode === 'wrong' || currentMode === 'favorites') {
          // 错题和收藏模式：使用历史记录计算（与普通模式一致）
          sessionAnsweredCount = Object.keys(history.answered || {}).length;
          sessionCorrectCount = Object.keys(history.correct || {}).filter(qId => history.correct[qId]).length;
          
          console.log(`[会话统计] ${currentMode}模式 - 历史记录:`, {
            answered: Object.keys(history.answered || {}),
            correct: Object.keys(history.correct || {}).filter(qId => history.correct[qId]),
            sessionAnsweredCount,
            sessionCorrectCount
          });
        } else {
          // 普通模式：使用历史记录
          sessionAnsweredCount = Object.keys(history.answered || {}).length;
          sessionCorrectCount = Object.keys(history.correct || {}).filter(qId => history.correct[qId]).length;
        }
        
        const updateData = {
          questionsAnswered: sessionAnsweredCount,
          correctCount: sessionCorrectCount,
          lastQuestionId: parseInt(questionId)
        };
        
        console.log(`[会话更新] 更新当前会话 - 模式: ${currentMode}, 数据:`, updateData);
        updateCurrentSession(updateData);
        
        // 更新状态管理
        setSessionAnswers(prev => {
          const newState = {
            ...prev,
            [questionId]: {
              submitted: formattedAnswer,
              correct: result.data.correct_answer,
              isCorrect: result.data.is_correct
            }
          };
          console.log(`更新sessionAnswers，题目${questionId}状态:`, newState[questionId]);
          console.log(`当前sessionAnswers全量:`, newState);
          
          // 同时保存到 sessionStorage，确保页面切换时不丢失
          try {
            sessionStorage.setItem('currentSessionAnswers', JSON.stringify(newState));
          } catch (e) {
            console.error('保存会话答题状态失败:', e);
          }
          
          return newState;
        });
        
        // 同时更新 answeredQuestions 和 correctAnswers 状态（与全部题目模式保持一致）
        setAnsweredQuestions(prev => {
          const isNewAnswer = !prev[questionId];
          const newState = {
            ...prev,
            [questionId]: true
          };
          
          // 如果是新答题，更新统计
          if (isNewAnswer) {
            setTotalAnswered(total => total + 1);
          }
          
          return newState;
        });
        
        setCorrectAnswers(prev => {
          const wasCorrect = prev[questionId];
          const newState = {
            ...prev,
            [questionId]: result.data.is_correct
          };
          
          // 更新正确题数统计
          if (result.data.is_correct && !wasCorrect) {
            setTotalCorrect(total => total + 1);
          } else if (!result.data.is_correct && wasCorrect) {
            setTotalCorrect(total => Math.max(0, total - 1));
          }
          
          return newState;
        });
        
        // 使用setTimeout确保状态更新完成后再触发导航刷新
        setTimeout(() => {
          setNavigationRefreshTrigger(prev => {
            console.log(`触发导航刷新: ${prev} -> ${prev + 1}`);
            return prev + 1;
          });
        }, 100); // 给一点延迟确保React完成状态更新
        
        // 如果在错题模式下答对了题目，标记为待移除（退出页面时处理）
        if (currentMode === 'wrong' && result.data.is_correct) {
          console.log(`错题模式下答对题目 #${questionId}，标记为待移除`);
          
          // 将答对的错题添加到待移除列表
          try {
            const pendingRemovalStr = sessionStorage.getItem('pendingWrongQuestionsRemoval') || '[]';
            const pendingRemoval = JSON.parse(pendingRemovalStr);
            
            if (!pendingRemoval.includes(questionId)) {
              pendingRemoval.push(questionId);
              sessionStorage.setItem('pendingWrongQuestionsRemoval', JSON.stringify(pendingRemoval));
              console.log(`题目 #${questionId} 已添加到待移除列表，将在退出答题页面时移除`);
            }
          } catch (e) {
            console.error('添加到待移除列表失败:', e);
          }
        }
          } else {
        console.error('提交答案失败:', result.message || '未知错误');
        setError('提交答案失败，请稍后重试');
      }
    } catch (error) {
      console.error('提交答案出错:', error);
      setError('提交答案出错，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 同步更新普通模式的历史记录（用于错题集统计）
  const updateNormalModeHistory = (qId, submitted, resultData) => {
    try {
      const normalHistoryKey = getStorageKeyForMode('normal');
      const normalHistoryString = localStorage.getItem(normalHistoryKey) || '{}';
      let normalHistory = { answered: {}, correct: {}, results: {}, timestamp: Date.now() };
      
      try {
        const parsedHistory = JSON.parse(normalHistoryString);
        if (parsedHistory && typeof parsedHistory === 'object') {
          normalHistory = {
            answered: parsedHistory.answered || {},
            correct: parsedHistory.correct || {},
            results: parsedHistory.results || {},
            timestamp: Date.now()
          };
        }
      } catch (e) {
        console.error('解析普通模式答题历史失败:', e);
      }
      
      // 更新普通模式历史记录
      normalHistory.answered[qId] = true;
      normalHistory.correct[qId] = resultData.is_correct;
      normalHistory.results[qId] = {
        submittedAnswer: submitted,
        isCorrect: resultData.is_correct,
        correctAnswer: resultData.correct_answer,
        explanation: resultData.explanation || '暂无解析',
        questionType: question?.question_type || (resultData.correct_answer.length > 1 ? 2 : 1),
        answeredAt: new Date().toISOString()
      };
      
      // 保存更新后的普通模式历史记录
      localStorage.setItem(normalHistoryKey, JSON.stringify(normalHistory));
      
      console.log('同步更新了普通模式历史记录');
    } catch (e) {
      console.error('更新普通模式历史记录失败:', e);
    }
  };

  // 获取当前导航页应该显示的题目范围
  const getNavRange = () => {
    const start = (currentNavPage - 1) * questionsPerPage + 1;
    const end = Math.min(start + questionsPerPage - 1, totalAllQuestions);
    return { start, end };
  };

  // 翻页函数
  const handleNavPageChange = (pageNum) => {
    console.log(`导航页切换到: ${pageNum}`);
    setCurrentNavPage(pageNum);
  };

  const handleNextQuestion = useCallback(() => {
    // 优先使用筛选后的题目列表进行导航
    if (filteredQuestions.length > 0 && currentQuestionIndex >= 0) {
      // 当前不是列表中的最后一题
      if (currentQuestionIndex < filteredQuestions.length - 1) {
        const nextQuestion = filteredQuestions[currentQuestionIndex + 1];
        console.log(`导航到下一题: ID=${nextQuestion.id}, 位置=${currentQuestionIndex+2}/${filteredQuestions.length}`);
        
        // 保留当前URL参数，确保筛选条件在导航时不丢失
        const currentParams = new URLSearchParams(searchParams.toString());
        // 更新索引参数
        currentParams.set('index', (currentQuestionIndex + 1).toString());
        
        // 如果来源是错题集，确保保持source=wrong参数
        const source = searchParams.get('source');
        if (source === 'wrong') {
          currentParams.set('source', 'wrong');
          currentParams.set('wrongIndex', (currentQuestionIndex + 1).toString());
          currentParams.set('continue', 'true'); // 添加continue参数
        } else if (source === 'favorites') {
          currentParams.set('source', 'favorites');
          // 检查是否已开始收藏练习会话，如果是则添加continue参数保持状态
          const hasStartedSession = sessionStorage.getItem('favorites_session_started');
          if (hasStartedSession) {
            currentParams.set('continue', 'true');
          }
          // 否则保持当前页面的continue状态
          const currentContinue = searchParams.get('continue');
          if (currentContinue === 'true') {
            currentParams.set('continue', 'true');
          }
        }
        
        try {
          const nextUrl = `/question-bank/${nextQuestion.id}?${currentParams.toString()}`;
          router.push(nextUrl);
        } catch (err) {
          console.error(`跳转失败：`, err);
          window.location.href = `/question-bank/${nextQuestion.id}?${currentParams.toString()}`;
        }
        return;
      } else {
        console.log(`已经是筛选列表中的最后一题`);
      }
    }
    
    // 筛选列表不可用时，退回到基于ID的导航
    const nextId = parseInt(questionId) + 1;
    console.log(`基于ID跳转到下一题: ${nextId}`);
    router.push(`/question-bank/${nextId}`);
  }, [filteredQuestions, currentQuestionIndex, questionId, searchParams, router]);

  const handlePrevQuestion = useCallback(() => {
    // 优先使用筛选后的题目列表进行导航
    if (filteredQuestions.length > 0 && currentQuestionIndex > 0) {
      const prevQuestion = filteredQuestions[currentQuestionIndex - 1];
      console.log(`导航到上一题: ID=${prevQuestion.id}, 位置=${currentQuestionIndex}/${filteredQuestions.length}`);
      
      // 保留当前URL参数，确保筛选条件在导航时不丢失
      const currentParams = new URLSearchParams(searchParams.toString());
      // 更新索引参数
      currentParams.set('index', (currentQuestionIndex - 1).toString());
      
      // 如果来源是错题集，确保保持source=wrong参数
      const source = searchParams.get('source');
      if (source === 'wrong') {
        currentParams.set('source', 'wrong');
        currentParams.set('wrongIndex', (currentQuestionIndex - 1).toString());
        currentParams.set('continue', 'true'); // 添加continue参数
      } else if (source === 'favorites') {
        currentParams.set('source', 'favorites');
        // 检查是否已开始收藏练习会话，如果是则添加continue参数保持状态
        const hasStartedSession = sessionStorage.getItem('favorites_session_started');
        if (hasStartedSession) {
          currentParams.set('continue', 'true');
        }
        // 否则保持当前页面的continue状态
        const currentContinue = searchParams.get('continue');
        if (currentContinue === 'true') {
          currentParams.set('continue', 'true');
        }
      }
      
      try {
        const prevUrl = `/question-bank/${prevQuestion.id}?${currentParams.toString()}`;
        router.replace(prevUrl);
      } catch (err) {
        console.error(`跳转失败：`, err);
        window.location.href = `/question-bank/${prevQuestion.id}?${currentParams.toString()}`;
      }
      return;
    }
    
    // 筛选列表不可用或已是第一题
    const prevId = Math.max(parseInt(questionId) - 1, 1);
    console.log(`基于ID跳转到上一题: ${prevId}`);
    router.push(`/question-bank/${prevId}`);
  }, [filteredQuestions, currentQuestionIndex, questionId, searchParams, router]);

  const toggleFavorite = async () => {
    try {
      // 如果已知用户未登录，直接使用本地处理
      if (!isAuthenticated || usingLocalStorage) {
        handleLocalFavorite();
        return;
      }
      
      // 否则尝试API调用
      const result = await questionApi.toggleFavorite(questionId);
      if (result.success) {
        setIsFavorite(!isFavorite);
        
        // 显示反馈信息
        if (result.source === "local") {
          console.log("使用本地收藏功能:", result.message);
        }
      } else {
        // API调用失败，切换到本地模式
        handleLocalFavorite();
      }
    } catch (err) {
      console.error("收藏操作失败:", err);
      // 出错时使用本地存储作为后备
      handleLocalFavorite();
    }
    
    // 本地收藏处理函数
    function handleLocalFavorite() {
      try {
        // 获取当前收藏列表
        const favoritesStr = localStorage.getItem('favoriteQuestions');
        let favorites = [];
        
        if (favoritesStr) {
          favorites = JSON.parse(favoritesStr);
        }
        
        // 切换收藏状态
        const newIsFavorite = !isFavorite;
        
        if (newIsFavorite) {
          // 添加到收藏
          if (!favorites.includes(parseInt(questionId))) {
            favorites.push(parseInt(questionId));
          }
        } else {
          // 从收藏中移除
          favorites = favorites.filter(id => id !== parseInt(questionId));
        }
        
        // 保存到本地存储
        localStorage.setItem('favoriteQuestions', JSON.stringify(favorites));
        
        // 更新UI状态
        setIsFavorite(newIsFavorite);
        console.log(`使用本地存储${newIsFavorite ? '添加' : '移除'}收藏`);
      } catch (e) {
        console.error("本地收藏处理出错:", e);
        setError("收藏操作失败");
      }
    }
  };

  // 在页面加载时检查题目收藏状态
  useEffect(() => {
    // 加载完题目后检查是否已经在错题集中
    if (question) {
      try {
        const wrongQuestions = localStorage.getItem('wrongQuestions');
        if (wrongQuestions) {
          const wrongQsList = JSON.parse(wrongQuestions);
          const isInWrongQuestions = wrongQsList.some(q => q.id === question.id);
          if (isInWrongQuestions) {
            console.log(`题目 #${question.id} 已在错题集中`);
          }
        }
      } catch (err) {
        console.error("检查错题集状态失败:", err);
      }
    }
  }, [question]);

  // 页面初始化逻辑
  useEffect(() => {
    // 除了加载答题历史等，还要检查本地收藏状态
    if (question) {
      const isFav = isQuestionFavorited(question.id);
      if (isFav) {
        setIsFavorite(true);
        console.log(`题目 #${question.id} 在本地已被收藏`);
      }
    }
  }, [question]);

  // 在页面加载逻辑的末尾添加一个辅助函数，用于检测用户之前是否已答错此题
  useEffect(() => {
    const checkIfWrongQuestion = () => {
      if (!question) return;
      
      try {
        const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
        if (wrongQuestionsStr) {
          const wrongQuestions = JSON.parse(wrongQuestionsStr);
          const isInWrongQuestions = Array.isArray(wrongQuestions) && 
                                    wrongQuestions.some(q => q.id === question.id);
          if (isInWrongQuestions) {
            console.log(`发现题目 #${question.id} 已在错题集中`);
          }
        }
      } catch (e) {
        console.error("检查错题状态失败:", e);
      }
    };
    
    checkIfWrongQuestion();
  }, [question]);

  // 在提交答案完成后，处理错误答案和正确答案的情况
  useEffect(() => {
    // 当答题结果出现并且回答错误时，确保添加到错题集
    if (answerResult && !answerResult.is_correct && question) {
      console.log("检测到错误答案，确保添加到错题集");
      
      const wrongQuestionData = {
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options || [],
        subject: question.subject,
        year: question.year,
        correct_answer: answerResult.correct_answer,
        submitted_answer: Array.isArray(submittedAnswer) ? 
                         submittedAnswer.join('') : 
                         submittedAnswer,
        explanation: answerResult.explanation || "暂无解析",
        timestamp: new Date().toISOString()
      };
      
      addToWrongQuestions(wrongQuestionData);
    }
    
    // 当答题结果出现且回答正确时，我们标记这道题，等用户离开页面时再移除
    if (answerResult && answerResult.is_correct && question) {
      const source = searchParams.get('source');
      if (source === 'wrong') {
        console.log("错题集模式：检测到正确答案，标记待移除");
        
        // 存储待移除的错题ID到会话存储中，确保页面刷新时不会丢失
        try {
          // 获取当前待移除错题列表
          let pendingRemovalStr = sessionStorage.getItem('pendingWrongQuestionsRemoval') || '[]';
          let pendingRemoval = JSON.parse(pendingRemovalStr);
          
          // 添加当前题目ID到列表中（如果不存在）
          if (!pendingRemoval.includes(question.id)) {
            pendingRemoval.push(question.id);
            sessionStorage.setItem('pendingWrongQuestionsRemoval', JSON.stringify(pendingRemoval));
            console.log(`题目 #${question.id} 已标记为待移除，将在用户离开页面时从错题集移除`);
          }
        } catch (e) {
          console.error("标记待移除错题失败:", e);
        }
      }
    }
  }, [answerResult, question, submittedAnswer, searchParams]);

  // 格式化题目编号，使用question_code字段
  const formatQuestionNumber = () => {
    if (!question) return '';
    
    // 使用question_code字段作为题号显示
    if (question.question_code) {
      return `题号: ${question.question_code}`;
    }
    
    // 如果没有question_code，则使用ID作为备选
    return `题号: ${question.id}`;
  };

  // 使用useMemo优化导航按钮渲染
  const navigationButtons = useMemo(() => {
    console.log('[导航渲染] 开始渲染导航按钮');
    console.log('[导航渲染] sessionAnswers:', sessionAnswers);
    console.log('[导航渲染] refreshTrigger:', navigationRefreshTrigger);
    // 如果没有题目数据，显示加载中
    if (filteredQuestions.length === 0) {
      return (
        <div className="col-span-5 text-center py-4 text-gray-500">
          加载题目导航中...
        </div>
      );
    }
    
    const currentId = parseInt(questionId);
    const startIndex = (currentNavPage - 1) * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, filteredQuestions.length);
    
    console.log(`渲染导航按钮: 页码=${currentNavPage}, 范围=${startIndex}-${endIndex}, 总数=${filteredQuestions.length}`);
    console.log(`当前sessionAnswers状态:`, sessionAnswers);
    console.log(`navigationRefreshTrigger: ${navigationRefreshTrigger}`);
    
    // 获取当前导航来源
    const source = searchParams.get('source');
    const isFromWrong = source === 'wrong';
    const isFromFavorites = source === 'favorites';
    
    // 生成要显示的按钮
    const buttons = [];
    
    // 确保我们显示当前页的所有题目，使用网格布局
    for (let i = startIndex; i < endIndex; i++) {
      const q = filteredQuestions[i];
      const absoluteIndex = i;
      let buttonStyle = "outline"; // 默认未做
      let extraStyle = "";
      
      // 高亮当前题目
      const isCurrentQuestion = q.id === currentId;
      const qIdStr = q.id.toString();
      
      if (isCurrentQuestion) {
        buttonStyle = "default";
        extraStyle = "bg-blue-500 text-white font-bold";
      } 
      // 错题页面状态指示 - 使用与全部题目模式相同的逻辑
      else if (isFromWrong) {
        // 直接使用 answeredQuestions 和 correctAnswers，与全部题目模式保持一致
        if (answeredQuestions[qIdStr]) {
          console.log(`错题导航: 题目${qIdStr}已作答，状态：${correctAnswers[qIdStr] ? '正确' : '错误'}`);
          
          if (correctAnswers[qIdStr]) {
            // 答对的错题显示为绿色，表示已完成
            extraStyle = "border-green-500 text-green-500 bg-green-50";
          } else {
            // 答错的错题显示为红色
            extraStyle = "border-red-500 text-red-500";
          }
        } else {
          console.log(`错题导航: 题目${qIdStr}未作答`);
        }
      } 
      // 收藏页面状态指示 - 使用与全部题目模式相同的逻辑
      else if (isFromFavorites) {
        // 直接使用 answeredQuestions 和 correctAnswers，与全部题目模式保持一致
        if (answeredQuestions[qIdStr]) {
          console.log(`收藏导航: 题目${qIdStr}已作答，状态：${correctAnswers[qIdStr] ? '正确' : '错误'}`);
          
          if (correctAnswers[qIdStr]) {
            extraStyle = "border-green-500 text-green-500";
          } else {
            extraStyle = "border-red-500 text-red-500";
          }
        } else {
          console.log(`收藏导航: 题目${qIdStr}未作答`);
        }
      } 
      // 普通页面使用常规状态指示逻辑
      else if (answeredQuestions[qIdStr]) {
        if (correctAnswers[qIdStr]) {
          extraStyle = "border-green-500 text-green-500";
        } else {
          extraStyle = "border-red-500 text-red-500";
        }
      }
      
      // 使用相对序号(从1开始)而不是题目ID
      const displayText = absoluteIndex + 1;
      
      // 生成唯一的key，强制React重新渲染按钮
      const sessionState = sessionAnswers[qIdStr];
      const sessionKey = sessionState ? `${sessionState.isCorrect ? 'correct' : 'incorrect'}` : 'unanswered';
      // 使用navigationRefreshTrigger确保按钮能够重新渲染
      const buttonKey = `nav-${q.id}-${absoluteIndex}-${sessionKey}-${navigationRefreshTrigger}`;
      
      buttons.push(
        <Button
          key={buttonKey}
          variant={buttonStyle as any}
          size="sm"
          className={`w-full h-10 ${extraStyle}`}
          onClick={() => {
            // 保留当前URL参数
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.set('index', absoluteIndex.toString());
            
            // 如果是从错题集进入，保持source=wrong参数
            if (isFromWrong) {
              currentParams.set('source', 'wrong');
              currentParams.set('wrongIndex', absoluteIndex.toString());
              // 切换题目时始终添加continue参数，避免重置答题历史
              currentParams.set('continue', 'true');
            }
            
            // 如果是从收藏进入，保持source=favorites参数
            if (isFromFavorites) {
              currentParams.set('source', 'favorites');
              // 检查是否已开始收藏练习会话，如果是则添加continue参数保持状态
              const hasStartedSession = sessionStorage.getItem('favorites_session_started');
              if (hasStartedSession) {
                currentParams.set('continue', 'true');
              }
              // 否则保持当前页面的continue状态
              const currentContinue = searchParams.get('continue');
              if (currentContinue === 'true') {
                currentParams.set('continue', 'true');
              }
            }
            
            const url = `/question-bank/${q.id}?${currentParams.toString()}`;
            router.push(url);
          }}
        >
          {displayText}
        </Button>
      );
    }
    
    return buttons;
  }, [filteredQuestions, questionId, currentNavPage, answeredQuestions, correctAnswers, 
     searchParams, questionsPerPage, router, sessionAnswers, navigationInitializedRef.current, 
     filteredTotalCount, submittedAnswer, answerResult, navigationRefreshTrigger, 
     // 添加sessionAnswers的字符串化，确保深度检测变化
     JSON.stringify(sessionAnswers)]);

  // 分页控件
  const paginationControl = useMemo(() => {
    const totalNavPages = Math.ceil(filteredTotalCount / questionsPerPage);
    
    if (totalNavPages <= 1) return null;
    
    return (
      <div className="mt-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentNavPage === 1}
            onClick={() => handleNavPageChange(currentNavPage - 1)}
            className="text-xs px-2"
          >
            上一页
          </Button>
          <div className="text-xs flex items-center">
            {Array.from({ length: Math.min(5, totalNavPages) }, (_, i) => {
              let pageToShow;
              
              if (totalNavPages <= 5) {
                pageToShow = i + 1;
              } else {
                const offset = Math.min(
                  Math.max(1, currentNavPage - 2), 
                  totalNavPages - 4
                );
                pageToShow = offset + i;
              }
              
              return (
                <Button
                  key={`page-${pageToShow}`}
                  variant={currentNavPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  className="w-6 h-6 mx-0.5 p-0 text-xs"
                  onClick={() => handleNavPageChange(pageToShow)}
                >
                  {pageToShow}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline" 
            size="sm"
            disabled={currentNavPage === totalNavPages}
            onClick={() => handleNavPageChange(currentNavPage + 1)}
            className="text-xs px-2"
          >
            下一页
          </Button>
        </div>
      </div>
    );
  }, [currentNavPage, filteredTotalCount, questionsPerPage]);

  
  // 添加一个强制更新导航状态的函数
  const forceUpdateNavigationState = useCallback((questionId: string, isCorrect: boolean) => {
    console.log(`[导航更新] 强制更新题目 ${questionId} 状态为 ${isCorrect ? '正确' : '错误'}`);
    
    // 更新当前模式的答题历史
    const currentMode = getCurrentPageMode(searchParams);
    const historyKey = getStorageKeyForMode(currentMode);
    
    try {
      const historyString = localStorage.getItem(historyKey) || '{}';
      const history = JSON.parse(historyString);
      
      // 确保历史记录中有当前题目的状态
      if (history.answered && history.answered[questionId] && 
          history.correct && (history.correct[questionId] !== undefined)) {
        console.log(`[导航更新] localStorage中题目 ${questionId} 状态已更新`);
      }
    } catch (e) {
      console.error('[导航更新] 读取历史记录失败:', e);
    }
    
    // 强制触发导航重新渲染
    setNavigationRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log(`[导航更新] 触发导航刷新: ${prev} -> ${newValue}`);
      return newValue;
    });
  }, [searchParams]);
  
  // 添加一个通用的导航刷新函数，可以在任何地方调用
  const refreshNavigation = useCallback(() => {
    console.log("手动刷新导航组件");
    // 对于错题页面，只刷新导航按钮的渲染，不重新初始化（避免清空状态）
    const source = searchParams.get('source');
    if (source === 'wrong') {
      console.log("错题页面：仅刷新导航渲染，保持状态");
      // 只触发导航按钮的重新渲染，不重新初始化
      setNavigationRefreshTrigger(prev => prev + 1);
    } else {
      // 普通页面：完整的导航刷新
      navigationInitializedRef.current = false;
      initializeNavigation();
      setNavigationRefreshTrigger(prev => prev + 1);
    }
  }, [initializeNavigation, searchParams]);
  
  // 当题目ID变化或提交答案后，强制刷新导航
  useEffect(() => {
    if (submittedAnswer) {
      console.log("检测到已提交答案，确保导航状态更新");
      // 延迟刷新，确保sessionAnswers已经更新
      const timer = setTimeout(() => {
        refreshNavigation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [submittedAnswer, questionId, refreshNavigation]);
  
  // 监听sessionAnswers的变化，确保导航能够实时更新
  useEffect(() => {
    const sessionAnswerCount = Object.keys(sessionAnswers).length;
    if (sessionAnswerCount > 0) {
      console.log(`[导航更新] sessionAnswers变化，当前有${sessionAnswerCount}道题的会话答题记录`);
      // 稍微延迟以确保状态已经完全更新
      const timer = setTimeout(() => {
        setNavigationRefreshTrigger(prev => prev + 1);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [sessionAnswers]);

  // 错题页面的特殊处理
  useEffect(() => {
    // 获取URL参数检查是否来自错题页
    const source = searchParams.get('source');
    const isFromWrongCollection = source === 'wrong';
    
    if (isFromWrongCollection) {
      // 检查错题集中的题目数量，如果为0则重定向
      try {
        const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
        let wrongQuestions = [];
        
        if (wrongQuestionsStr) {
          wrongQuestions = JSON.parse(wrongQuestionsStr);
        }
        
        if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
          console.log('错题集为空，需要重定向');
          
          // 这里可以添加重定向逻辑，但为了避免突然的跳转，让我们先检查一下
          console.log('错题集为空，但允许继续访问');
        } else {
          console.log(`从错题集进入，共有${wrongQuestions.length}道错题`);
          
          // 确保当前题目在错题集中
          const isCurrentQuestionInWrongCollection = wrongQuestions.some(
            q => q.id === parseInt(questionId) || q.id === questionId
          );
          
          if (!isCurrentQuestionInWrongCollection) {
            console.log(`当前题目 #${questionId} 不在错题集中，但允许继续访问`);
            // 不强制跳转，而是让用户继续浏览
          }
        }
      } catch (error) {
        console.error('检查错题集状态失败:', error);
      }
    }
  }, [questionId, searchParams]);
  
  // 增强错题相关的本地存储处理
  const ensureWrongQuestionsValidity = useCallback(() => {
    try {
      // 从localStorage获取错题集
      const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
      if (!wrongQuestionsStr) {
        // 如果没有错题集，创建一个空的
        localStorage.setItem('wrongQuestions', JSON.stringify([]));
        console.log('创建了一个新的空错题集');
        return;
      }
      
      // 验证错题集格式
      try {
        const wrongQuestions = JSON.parse(wrongQuestionsStr);
        if (!Array.isArray(wrongQuestions)) {
          // 如果不是数组，重置为空数组
          localStorage.setItem('wrongQuestions', JSON.stringify([]));
          console.log('错题集格式不正确，已重置');
        } else {
          // 确认每个错题都有正确的格式
          const validWrongQuestions = wrongQuestions.filter(q => {
            return q && typeof q === 'object' && q.id !== undefined;
          });
          
          if (validWrongQuestions.length !== wrongQuestions.length) {
            localStorage.setItem('wrongQuestions', JSON.stringify(validWrongQuestions));
            console.log(`修复了错题集：从${wrongQuestions.length}个减少到${validWrongQuestions.length}个有效错题`);
          }
        }
      } catch (parseError) {
        console.error('解析错题集失败，重置为空数组:', parseError);
        localStorage.setItem('wrongQuestions', JSON.stringify([]));
      }
    } catch (error) {
      console.error('确保错题集有效性失败:', error);
    }
  }, []);
  
  // 页面加载时验证错题集
  useEffect(() => {
    ensureWrongQuestionsValidity();
  }, [ensureWrongQuestionsValidity]);

  // 处理退出答题页面时移除答对的错题和保存答题会话
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        const source = searchParams.get('source');
        
        // 结束并保存当前答题会话（所有模式都保存）
        console.log('退出答题页面，保存答题会话');
        console.log('当前会话信息:', {
          source: source,
          currentSession: getCurrentSession()
        });
        endCurrentSession();
        
        // 如果是从收藏页面退出且不是继续模式，清理会话标记
        if (source === 'favorites' && searchParams.get('continue') !== 'true') {
          sessionStorage.removeItem('favorites_session_started');
          console.log('清理收藏练习会话标记');
        }
        
        // 检查是否来自错题集且有待移除的题目
        if (source === 'wrong') {
          console.log('退出错题页面，检查待移除的错题');
          
          const pendingRemovalStr = sessionStorage.getItem('pendingWrongQuestionsRemoval') || '[]';
          const pendingRemoval = JSON.parse(pendingRemovalStr);
          
          if (pendingRemoval.length > 0) {
            console.log(`发现${pendingRemoval.length}道待移除错题:`, pendingRemoval);
            
            // 批量移除错题
            for (const qId of pendingRemoval) {
              try {
                const result = await questionApi.removeFromWrongQuestions(qId);
                if (result.success) {
                  console.log(`题目 #${qId} 已从错题集移除`);
                } else {
                  console.error(`题目 #${qId} 移除失败:`, result.error);
                }
              } catch (error) {
                console.error(`移除题目 #${qId} 时出错:`, error);
              }
            }
            
            // 清空待移除列表
            sessionStorage.removeItem('pendingWrongQuestionsRemoval');
            console.log('答对的错题已从错题集中移除');
          }
        }
      } catch (error) {
        console.error('退出页面时处理错题移除失败:', error);
      }
    };

    // 监听页面卸载事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 组件卸载时也执行处理，并清理事件监听器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // 确保在路由跳转时也能执行
    };
  }, [searchParams]);


  // 显示加载状态
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        <main className="flex-1">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-lg mb-2">加载题目中...</div>
                <div className="text-sm text-gray-500">请稍候</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 显示错误状态
  if (error || !question) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <MainNav />
          </div>
        </header>
        <main className="flex-1">
          <div className="container mx-auto py-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-lg text-red-600 mb-2">
                  {error || '题目加载失败'}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  题目ID: {questionId}
                </div>
                <Button onClick={() => router.back()}>
                  返回题库
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/question-bank" className="flex items-center text-primary">
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回题库
            </Link>
            
            {question && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                className={`flex items-center ${isFavorite ? 'text-yellow-500' : ''}`}
              >
                <Star className={`h-5 w-5 mr-1 ${isFavorite ? 'fill-yellow-500' : ''}`} />
                {isFavorite ? '已收藏' : '收藏题目'}
            </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {loading ? (
                <div className="p-10 border rounded-lg text-center">
                  <p>加载中...</p>
                </div>
              ) : error ? (
                <div className="p-10 border rounded-lg text-center">
                  <p className="text-red-500">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fetchQuestionDetails()}
                  >
                    重试
                  </Button>
                    </div>
              ) : question ? (
                <>
                  <QuestionDetail
                    question={{
                      id: question.id,
                      subject: question.subject,
                      year: question.year,
                      type: question.question_type === 1 ? "single" : "multiple",
                      content: question.question_text,
                      options: question.options,
                      answer: answerResult ? 
                        (typeof answerResult.correct_answer === 'string' ? answerResult.correct_answer.split('') : 
                          (Array.isArray(answerResult.correct_answer) ? answerResult.correct_answer : 
                            [String(answerResult.correct_answer || 'A')])) : 
                        (Array.isArray(question.answer) ? question.answer : 
                          (typeof question.answer === 'string' ? question.answer.split('') : 
                            [String(question.answer || 'A')])),
                      analysis: answerResult ? answerResult.explanation : (question.analysis || "暂无解析"),
                      question_code: question.question_code || ""
                    }}
                    selectedAnswer={selectedAnswer}
                    submittedAnswer={submittedAnswer}
                    onSelectAnswer={handleSelectAnswer}
                    answerResult={null} // 不在组件内部显示答案解析
                    disabled={!!submittedAnswer}
                    totalQuestions={totalAllQuestions}
                    currentIndex={parseInt(questionId) - 1}
                    hideSubmitButton={true}
                  />

                  <div className="mt-6 flex justify-between">
                    {!submittedAnswer ? (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer || submitting}
                        className="mx-auto"
                      >
                        {submitting ? "提交中..." : "提交答案"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handlePrevQuestion}
                          className="flex items-center"
                          disabled={filteredQuestions.length > 0 && currentQuestionIndex <= 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          上一题
                        </Button>

                        <Button
                          onClick={handleNextQuestion}
                          className="flex items-center"
                          disabled={filteredQuestions.length > 0 && currentQuestionIndex >= filteredQuestions.length - 1}
                        >
                          下一题
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* 答案解析区域 */}
                  {answerResult && (
                    <div className="mt-6 space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">答案解析</h3>
                        <div className="flex items-center">
                          {answerResult.is_correct ? (
                            <div className="flex items-center text-green-500">
                              <CheckCircle className="h-5 w-5 mr-1" />
                              <span>回答正确</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-500">
                              <XCircle className="h-5 w-5 mr-1" />
                              <span>回答错误</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">正确答案：</span>
                          {Array.isArray(answerResult.correct_answer) 
                            ? answerResult.correct_answer.join(', ') 
                            : (typeof answerResult.correct_answer === 'string' 
                               ? answerResult.correct_answer 
                               : answerResult.correct_answer !== undefined 
                                 ? String(answerResult.correct_answer) 
                                 : "未提供正确答案")}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">你的答案：</span>
                          {Array.isArray(submittedAnswer) 
                            ? submittedAnswer.join(', ') 
                            : submittedAnswer}
                        </div>
                        <div className="mt-4">
                          <div className="font-medium text-sm mb-2">解析：</div>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{answerResult.explanation || "暂无解析"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 答题进度统计 */}
                  {answerResult && (
                    <div className="mt-6">
                      <Card className="mb-6">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>答题进度</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="pt-2 grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <div className="text-lg font-semibold text-green-500">{totalCorrect}</div>
                              <div className="text-xs text-gray-500">答对题数</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <div className="text-lg font-semibold text-red-500">{totalAnswered - totalCorrect}</div>
                              <div className="text-xs text-gray-500">答错题数</div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>正确率</span>
                            <span className="font-medium">
                              {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%
                            </span>
                          </div>
                          <Progress
                            value={totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}
                            className="h-2"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                            </>
                          ) : (
                <div className="p-10 border rounded-lg text-center">
                  <p>未找到题目</p>
                    </div>
                  )}
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {searchParams.get('source') === 'wrong' ? '错题导航' : '题目导航'}
                  </h3>
                    <div className="text-sm">
                      {/* 使用 filteredTotalCount 来计算总页数和显示总题数 */}
                      第{currentNavPage}/{Math.max(1, Math.ceil(filteredTotalCount / questionsPerPage))}页
                      <span className="ml-1 text-xs">({filteredTotalCount}题)</span>
                      </div>
                    </div>

                  {/* 修改为滚动容器和全部最大高度覆盖的布局 */}
                  <div className="grid grid-cols-5 gap-1 max-h-[300px] overflow-y-auto pb-2">
                    {navigationButtons}
                    </div>

                  {/* 导航分页控件 */}
                  {paginationControl}

                  <div className="mt-6">
                    <h4 className="font-medium mb-2">状态指示</h4>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm">已答对</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">已答错</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm">当前题目</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border rounded-full mr-2"></div>
                        <span className="text-sm">未作答</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
