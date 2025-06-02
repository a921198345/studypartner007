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
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, {isCorrect: boolean}>>({});
  
  // 使用ref避免不必要的重渲染
  const navigationInitializedRef = useRef(false);
  const apiCallAttemptedRef = useRef(false);
  
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
        if (filteredData && filteredData.timestamp && (Date.now() - filteredData.timestamp < 3600000)) {
          console.log(`找到有效的筛选题目列表，共${filteredData.questions?.length || 0}题`);
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
          
          // 如果是重置错题状态（从"开始练习"按钮进入）或首次进入错题
          if (resetWrong || !sessionAnswers || Object.keys(sessionAnswers).length === 0) {
            // 清空当前会话中的答题记录，确保导航状态显示为未作答
            setSessionAnswers({});
            console.log("错题页面：重置所有错题的状态为未作答");
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
      } else if (filteredData && filteredData.questions && filteredData.questions.length > 0) {
        console.log(`从localStorage加载筛选后的题目列表，共${filteredData.questions.length}题`);
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
      await fetchTotalQuestions(); // 先获取全局总数
      initializeNavigation();     // 然后用这个总数（如果需要）初始化导航
      
      fetchAnswerHistory().catch(err => {
        console.log("获取答题历史出错，但页面将继续加载", err);
      });
      fetchQuestionDetails();
    };

    init();
  }, [questionId, initializeNavigation]); // initializeNavigation 现在依赖 totalAllQuestions，所以它会正确地在其更新后运行

  const fetchAnswerHistory = async () => {
    // 检查是否来自错题页面或收藏页面
    const source = searchParams.get('source');
    const isFromWrongCollection = source === 'wrong';
    const isFromFavorites = source === 'favorites';
    const resetWrong = searchParams.get('resetWrong') === 'true';
    // 修改：对于收藏模式，默认都是新开始，除非明确标记为continue=true
    const isContinue = searchParams.get('continue') === 'true';
    
    console.log('[DEBUG] fetchAnswerHistory开始执行', {
      source,
      isFromWrongCollection,
      isFromFavorites,
      resetWrong,
      isContinue,
      questionId,
      currentSessionAnswers: sessionAnswers
    });
    
    // 如果是从错题页进入，保持未答状态
    if (isFromWrongCollection) {
      console.log("[DEBUG] 从错题集进入，不恢复之前的答题记录，保持未答状态");
      
      // 清空当前题目的答题状态
      setSelectedAnswer("");
      setSubmittedAnswer(null);
      setAnswerResult(null);
      
      console.log('[DEBUG] 已清空当前题目状态');
      
      // 仍然加载整体答题统计数据，但不设置当前题目的答案状态
      try {
        const historyString = localStorage.getItem('answerHistory');
        if (historyString) {
          const history = JSON.parse(historyString);
          if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
            console.log('[DEBUG] 从localStorage加载答题历史', {
              totalAnswered: Object.keys(history.answered || {}).length,
              totalCorrect: Object.keys(history.correct || {}).length,
              hasCurrentQuestion: history.answered && history.answered[questionId]
            });
            
            setAnsweredQuestions(history.answered || {});
            setCorrectAnswers(history.correct || {});
            setTotalAnswered(Object.keys(history.answered || {}).length);
            setTotalCorrect(Object.keys(history.correct || {}).length);
          }
        }
      } catch (e) {
        console.error("[DEBUG] 加载答题统计数据失败:", e);
      }
      return;
    }
    
    // 收藏模式的处理
    if (isFromFavorites) {
      // 只有明确标记为"继续练习"才恢复答题状态，否则都重置为未作答
      if (isContinue) {
        // "继续练习收藏" - 应恢复之前的答题记录
        console.log("[DEBUG] 继续练习收藏：恢复之前的答题记录");
        // 继续执行正常的历史记录恢复流程
      } else {
        // "开始练习收藏"或直接点击题目 - 保持所有题目为未作答状态
        console.log("[DEBUG] 收藏模式：重置所有收藏题目为未作答状态");
        
        // 清空当前题目的答题状态
        setSelectedAnswer("");
        setSubmittedAnswer(null);
        setAnswerResult(null);
        
        // 仍然加载整体答题统计数据
        try {
          const historyString = localStorage.getItem('answerHistory');
          if (historyString) {
            const history = JSON.parse(historyString);
            if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
              // 只设置全局统计数据，不设置具体题目状态
              setAnsweredQuestions(history.answered || {});
              setCorrectAnswers(history.correct || {});
              setTotalAnswered(Object.keys(history.answered || {}).length);
              setTotalCorrect(Object.keys(history.correct || {}).length);
            }
          }
        } catch (e) {
          console.error("[DEBUG] 加载答题统计数据失败:", e);
        }
        return;
      }
    }
    
    // 原有逻辑：如果已知用户未登录，直接使用localStorage
    if (!isAuthenticated) {
      console.log("用户未登录或会话已过期，直接使用本地存储");
      loadAnswerHistoryFromCache();
      return;
    }

    try {
      // 尝试从服务器获取答题历史
      try {
        const historyResponse = await questionApi.getAnswerHistory();
        
        if (historyResponse.success) {
          // 设置服务器返回的答题状态
          setAnsweredQuestions(historyResponse.data.answered);
          setCorrectAnswers(historyResponse.data.correct);
          setTotalAnswered(historyResponse.data.totalAnswered);
          setTotalCorrect(historyResponse.data.totalCorrect);
          
          // 同时更新本地存储，用于提高页面间切换的体验
          localStorage.setItem('answerHistory', JSON.stringify({
            answered: historyResponse.data.answered,
            correct: historyResponse.data.correct,
            results: historyResponse.data.results,
            timestamp: Date.now()
          }));
          
          // 如果当前题目已作答，恢复其状态
          const qId = questionId.toString();
          if (historyResponse.data.answered[qId] && historyResponse.data.results[qId]) {
            const result = historyResponse.data.results[qId];
            setSelectedAnswer(result.submittedAnswer);
            setSubmittedAnswer(result.submittedAnswer);
            setAnswerResult({
              is_correct: result.isCorrect,
              correct_answer: result.correctAnswer,
              explanation: result.explanation || "暂无解析"
            });
          }
        } else {
          // API请求失败，尝试从localStorage加载
          console.log("服务器响应成功但未返回数据，尝试从本地存储加载");
          loadAnswerHistoryFromCache();
        }
      } catch (error) {
        // 检查是否为401错误
        const is401Error = error.message && (error.message.includes('401') || error.message.includes('Unauthorized'));
        if (is401Error) {
          console.log("用户未登录或会话已过期，使用本地存储模式");
          setIsAuthenticated(false);
          setUsingLocalStorage(true);
        } else {
          console.error("获取答题历史失败:", error);
        }
        // 错误处理 - 从本地加载
        loadAnswerHistoryFromCache();
      }
    } catch (error) {
      console.error("加载答题历史主函数失败:", error);
      // 即使主函数出错，也能继续运行
      loadAnswerHistoryFromCache();
    }
  };

  // 从本地缓存加载答题历史作为后备
  const loadAnswerHistoryFromCache = () => {
    try {
      const historyString = localStorage.getItem('answerHistory');
      if (historyString) {
        const history = JSON.parse(historyString);
        
        // 仅使用不超过1天的缓存
        if (history.timestamp && Date.now() - history.timestamp < 86400000) {
          setAnsweredQuestions(history.answered || {});
          setCorrectAnswers(history.correct || {});
          setTotalAnswered(Object.keys(history.answered || {}).length);
          setTotalCorrect(Object.keys(history.correct || {}).length);
          
          // 检查当前题目是否有本地缓存的答题记录
          const qId = questionId.toString();
          
          // 检查是否来自错题集或收藏，以及是否是继续练习
          const source = searchParams.get('source');
          const isFromWrongCollection = source === 'wrong';
          const isFromFavorites = source === 'favorites';
          const resetWrong = searchParams.get('resetWrong') === 'true';
          const isContinue = searchParams.get('continue') === 'true';
          
          // 如果来源是错题集，不恢复当前题目的答案状态
          if (isFromWrongCollection) {
            console.log("从错题集进入，不恢复缓存的答题记录，保持未答状态");
            setSelectedAnswer("");
            setSubmittedAnswer(null);
            setAnswerResult(null);
          }
          // 如果是收藏模式但不是继续练习，不恢复答题状态
          else if (isFromFavorites && !isContinue) {
            console.log("收藏模式(非继续练习)，不恢复缓存的答题记录，保持未答状态");
            setSelectedAnswer("");
            setSubmittedAnswer(null);
            setAnswerResult(null);
          }
          // 如果是继续收藏练习或正常模式，恢复答题状态
          else if (history.results && history.results[qId]) {
            // 正常模式或继续收藏模式：恢复缓存的答题状态
            console.log(`恢复题目 #${qId} 的缓存答题状态，模式: ${isFromFavorites && isContinue ? '继续收藏' : '正常'}`);
            const result = history.results[qId];
            setSelectedAnswer(result.submittedAnswer);
            setSubmittedAnswer(result.submittedAnswer);
            setAnswerResult({
              is_correct: result.isCorrect,
              correct_answer: result.correctAnswer,
              explanation: result.explanation || "暂无解析"
            });
          }
        }
      }
    } catch (e) {
      console.error("加载缓存答题历史失败:", e);
      // 即使本地存储访问失败，也不影响应用核心功能
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
        let processedAnswer = data.data.answer;
        if (processedAnswer === undefined || processedAnswer === null) {
          // 如果答案为空，尝试设置默认答案
          processedAnswer = ['A'];
          console.warn(`题目 #${questionId} 没有答案数据，使用默认答案`);
        } else if (typeof processedAnswer === 'string') {
          // 如果答案是字符串，转换为数组
          processedAnswer = processedAnswer.split('');
        } else if (!Array.isArray(processedAnswer)) {
          // 如果不是数组，强制转换
          processedAnswer = [String(processedAnswer)];
        }
        
        // 确保解析文本存在
        const processedAnalysis = data.data.analysis || "暂无解析";
        
        setQuestion({
          ...data.data,
          options: processedOptions,
          answer: processedAnswer,
          analysis: processedAnalysis
        });
        setIsFavorite(data.data.is_favorite);

        // 检查是否从错题集进入并进行额外处理
        const source = searchParams.get('source');
        const isFromWrongCollection = source === 'wrong';
        
        if (isFromWrongCollection) {
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
        const source = searchParams.get('source');
        const isFromWrongCollection = source === 'wrong';
        
        if (isFromWrongCollection) {
          console.log(`API获取题目失败，尝试从错题集直接加载题目 #${questionId}`);
          const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
          if (wrongQuestionsStr) {
            const wrongQuestions = JSON.parse(wrongQuestionsStr);
            const wrongQuestion = wrongQuestions.find(q => q.id === parseInt(questionId) || q.id === questionId);
            
            if (wrongQuestion) {
              console.log(`成功从错题集找到题目数据:`, wrongQuestion);
              
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
      // 安全获取和格式化答案
      const formattedAnswer = Array.isArray(selectedAnswer) 
        ? [...selectedAnswer].sort().join('') 
        : selectedAnswer;

      // 安全判断答案是否正确
      let isCorrect = false;
      let correctAnswer = "";
      
      if (question && question.answer !== undefined) {
        // 根据答案类型安全处理
        if (Array.isArray(question.answer)) {
          correctAnswer = [...question.answer].sort().join('');
          isCorrect = Array.isArray(selectedAnswer) && 
                     selectedAnswer.length === question.answer.length && 
                     [...selectedAnswer].sort().join('') === correctAnswer;
        } else if (typeof question.answer === 'string') {
          correctAnswer = question.answer;
          isCorrect = Array.isArray(selectedAnswer) 
                     ? selectedAnswer[0] === correctAnswer 
                     : selectedAnswer === correctAnswer;
        } else {
          correctAnswer = String(question.answer);
          isCorrect = Array.isArray(selectedAnswer) 
                     ? selectedAnswer[0] === correctAnswer 
                     : selectedAnswer === correctAnswer;
        }
      } else {
        console.warn("题目答案未定义，无法准确判断正确性");
        // 默认设为错误
        correctAnswer = "";
        isCorrect = false;
      }
        
      // 检查是否来自错题集，且答对了题目
      const source = searchParams.get('source');
      const isFromWrongCollection = source === 'wrong';
      
      if (isFromWrongCollection && isCorrect) {
        // 如果是从错题集进入，且答对了，则从错题集中移除该题目
        try {
          // 导入removeFromWrongQuestions函数
          const removed = removeFromWrongQuestions(question.id);
          if (removed) {
            console.log(`题目 #${question.id} 已答对，已从错题集中移除`);
            
            // 触发错题列表刷新事件
            const event = new CustomEvent('wrongQuestionsChanged', {
              detail: { removedId: question.id }
            });
            window.dispatchEvent(event);
          }
        } catch (removeErr) {
          console.error("从错题集移除题目失败:", removeErr);
        }
      }

      // 更新本地状态
      const newAnsweredQuestions = { ...answeredQuestions, [questionId]: true };
      const newCorrectAnswers = { ...correctAnswers };
      
      if (isCorrect) {
        newCorrectAnswers[questionId] = true;
      }
      
      // 准备本地存储的数据
      let localAnswerHistory;
      try {
        const historyString = localStorage.getItem('answerHistory');
        localAnswerHistory = historyString ? JSON.parse(historyString) : {};
      } catch (e) {
        localAnswerHistory = {};
      }
      
      const localUpdateData = {
        answered: newAnsweredQuestions,
        correct: newCorrectAnswers,
        timestamp: Date.now(),
        results: {
          ...(localAnswerHistory.results || {}),
          [questionId]: {
            submittedAnswer: selectedAnswer,
            isCorrect: isCorrect,
            correctAnswer: correctAnswer,
            explanation: question?.analysis || "暂无解析",
            questionType: question?.question_type,
            answeredAt: new Date().toISOString()
          }
        }
      };
      
      // 是否尝试提交到服务器取决于用户是否已登录
      if (isAuthenticated && !usingLocalStorage) {
        // 用户登录，尝试提交到服务器
        try {
          const result = await questionApi.submitAnswer(questionId, formattedAnswer);
          
          if (result.success) {
            console.log("API返回的答题结果:", result.data);
            
            // 确保解析字段存在
            const answerData = {
              ...result.data,
              explanation: result.data.explanation || "暂无解析"
            };
            
            setAnswerResult(answerData);
            setSubmittedAnswer(selectedAnswer);
            
            // 判断是否答错，并添加到错题集
            const isAnswerCorrect = result.data.is_correct;
            if (!isAnswerCorrect) {
              console.log("答案错误！准备添加到错题集...");
              
              // 准备错题数据
              const wrongQuestionData = {
                id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                options: question.options,
                subject: question.subject,
                year: question.year,
                correct_answer: result.data.correct_answer,
                submitted_answer: formattedAnswer,
                explanation: result.data.explanation || "暂无解析",
                timestamp: new Date().toISOString()
              };
              
              // 确保添加到错题集
              try {
                const added = addToWrongQuestions(wrongQuestionData);
                if (added) {
                  console.log(`✅ 题目 #${question.id} 已成功添加到错题集`);
                } else {
                  console.log(`题目 #${question.id} 可能已存在于错题集中`);
                }
              } catch (err) {
                console.error("添加错题时发生错误:", err);
              }
            }
            
            // 更新答题历史状态
            setAnsweredQuestions(newAnsweredQuestions);
            setCorrectAnswers(newCorrectAnswers);
            setTotalAnswered(Object.keys(newAnsweredQuestions).length);
            setTotalCorrect(Object.keys(newCorrectAnswers).length);
            
            // 更新当前会话中的答题状态 - 确保在错题页面也能正确更新
            setSessionAnswers(prev => {
              const newSessionAnswers = {
              ...prev,
              [questionId]: { isCorrect: isAnswerCorrect }
              };
              
              // 如果是错题页面，立即强制刷新导航
              const source = searchParams.get('source');
              const isFromWrongCollection = source === 'wrong';
              if (isFromWrongCollection) {
                console.log(`错题页面：强制刷新导航状态，题目${questionId}状态=${isAnswerCorrect ? '正确' : '错误'}`);
                
                // 使用setTimeout确保状态已更新后再触发导航刷新
                setTimeout(() => {
                  // 重置导航初始化状态
                  navigationInitializedRef.current = false;
                  // 直接重新初始化导航
                  initializeNavigation();
                  // 强制刷新当前页码，触发重新渲染
                  setCurrentNavPage(prev => prev);
                }, 100);
              }
              
              return newSessionAnswers;
            });

            // 更新本地存储
            localStorage.setItem('answerHistory', JSON.stringify({
              answered: newAnsweredQuestions,
              correct: newCorrectAnswers,
              timestamp: Date.now(),
              results: {
                ...(localAnswerHistory.results || {}),
                [questionId]: {
                  submittedAnswer: selectedAnswer,
                  isCorrect: result.data.is_correct,
                  correctAnswer: result.data.correct_answer,
                  explanation: result.data.explanation || "暂无解析",
                  questionType: question.question_type,
                  answeredAt: new Date().toISOString()
                }
              }
            }));
            
            // 如果是从错题集页面进入，强制刷新导航状态
            if (isFromWrongCollection) {
              // 强制重新初始化导航组件，以便正确显示答题状态
              navigationInitializedRef.current = false;
              // 延迟执行，确保状态已更新
              setTimeout(() => {
                initializeNavigation();
                // 触发重新渲染
                setCurrentNavPage(currentNavPage);
              }, 100);
            }
          } else {
            // 服务器验证失败，切换到本地判断模式
            console.error("提交答案服务器响应失败:", result.message);
            useLocalAnswerProcessing();
          }
        } catch (apiError) {
          // API请求失败，使用本地判断
          console.error("提交答案API请求失败:", apiError);
          useLocalAnswerProcessing();
        }
      } else {
        // 用户未登录或已知需要使用本地存储
        console.log("用户未登录，使用本地存储记录答题结果");
        useLocalAnswerProcessing();
      }
      
      // 本地答案处理函数
      function useLocalAnswerProcessing() {
        // 使用本地计算的结果，确保在错题模式下也能显示正确答案和解析
        const answerDetails = {
          is_correct: isCorrect,
          correct_answer: correctAnswer,
          explanation: question?.analysis || "暂无解析"
        };
        
        console.log("本地答案处理设置结果:", answerDetails);
        setAnswerResult(answerDetails);
        setSubmittedAnswer(selectedAnswer);
        
        // 检查是否来自错题集，且答对了题目
        const source = searchParams.get('source');
        const isFromWrongCollection = source === 'wrong';
        
        // 如果是从错题集且答对了，从错题集中移除
        if (isFromWrongCollection && isCorrect) {
          try {
            const removed = removeFromWrongQuestions(question.id);
            if (removed) {
              console.log(`本地判断：题目 #${question.id} 已答对，已从错题集中移除`);
              
              // 触发错题列表刷新事件
              const event = new CustomEvent('wrongQuestionsChanged', {
                detail: { removedId: question.id }
              });
              window.dispatchEvent(event);
            }
          } catch (removeErr) {
            console.error("从错题集移除题目失败:", removeErr);
          }
        }
        // 如果本地判断答错，添加到错题集
        else if (!isCorrect) {
          addToWrongQuestions({
            id: question.id,
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options,
            subject: question.subject,
            year: question.year,
            correct_answer: correctAnswer,
            submitted_answer: formattedAnswer,
            explanation: question?.analysis || "暂无解析"
          });
        }
        
        // 更新答题历史状态
        setAnsweredQuestions(newAnsweredQuestions);
        setCorrectAnswers(newCorrectAnswers);
        setTotalAnswered(Object.keys(newAnsweredQuestions).length);
        setTotalCorrect(Object.keys(newCorrectAnswers).length);
        
        // 更新当前会话中的答题状态 - 确保在错题页面也能正确更新
        setSessionAnswers(prev => {
          const newSessionAnswers = {
          ...prev,
          [questionId]: { isCorrect: isCorrect }
          };
          
          // 如果是错题页面，立即强制刷新导航
          const source = searchParams.get('source');
          const isFromWrongCollection = source === 'wrong';
          if (isFromWrongCollection) {
            console.log(`错题页面(本地处理)：强制刷新导航状态，题目${questionId}状态=${isCorrect ? '正确' : '错误'}`);
            
            // 使用setTimeout确保状态已更新后再触发导航刷新
            setTimeout(() => {
              // 重置导航初始化状态
              navigationInitializedRef.current = false;
              // 直接重新初始化导航
              initializeNavigation();
              // 强制刷新当前页码，触发重新渲染
              setCurrentNavPage(prev => prev);
            }, 100);
          }
          
          return newSessionAnswers;
        });
        
        // 保存到本地存储
        localStorage.setItem('answerHistory', JSON.stringify(localUpdateData));
        
        // 如果是从错题集页面进入，强制刷新导航状态
        if (isFromWrongCollection) {
          // 强制重新初始化导航组件，以便正确显示答题状态
          navigationInitializedRef.current = false;
          // 延迟执行，确保状态已更新
          setTimeout(() => {
            initializeNavigation();
            // 触发重新渲染
            setCurrentNavPage(currentNavPage);
          }, 100);
        }
      }
    } catch (err) {
      console.error("处理答案提交出错:", err);
      setError("处理答案提交时发生错误，答案已保存到本地");
      
      // 即使有错误，仍尝试使用最基本的判断
      try {
        // 提供最基本的答题结果，避免用户体验中断
        setAnswerResult({
          is_correct: false,
          correct_answer: question?.answer?.toString() || "未知",
          explanation: "发生错误，无法准确获取解析"
        });
        setSubmittedAnswer(selectedAnswer);
      } catch (finalError) {
        console.error("提供降级体验时发生错误:", finalError);
      }
    } finally {
      setSubmitting(false);
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
        }
        
        try {
          const nextUrl = `/question-bank/${nextQuestion.id}?${currentParams.toString()}`;
          router.replace(nextUrl);
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

  // 在提交答案完成后，处理错误答案的情况
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
  }, [answerResult, question]);

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
    
    // 获取当前导航来源
    const source = searchParams.get('source');
    const isFromWrong = source === 'wrong';
    
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
      // 错题页面状态指示优先级:
      // 1. 当前会话状态(sessionAnswers) - 实时反映本次作答
      // 2. 全局答题历史不应在错题页面使用
      else if (isFromWrong) {
        if (sessionAnswers && sessionAnswers[qIdStr]) {
          console.log(`错题导航: 题目${qIdStr}使用会话状态：${sessionAnswers[qIdStr].isCorrect ? '正确' : '错误'}`);
        if (sessionAnswers[qIdStr].isCorrect) {
          extraStyle = "border-green-500 text-green-500";
        } else {
          extraStyle = "border-red-500 text-red-500";
        }
        }
        // 如果没有会话状态，错题页面默认保持未作答状态
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
      
      buttons.push(
        <Button
          key={`nav-${q.id}-${absoluteIndex}-${sessionAnswers[qIdStr] ? (sessionAnswers[qIdStr].isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
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
     filteredTotalCount]);

  // 分页控件
  const paginationControl = useMemo(() => {
    const totalNavPages = Math.ceil(filteredTotalCount / questionsPerPage);
    
    if (totalNavPages <= 1) return null;
    
    return (
      <div className="flex justify-between mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={currentNavPage === 1}
          onClick={() => handleNavPageChange(currentNavPage - 1)}
        >
          上一页
        </Button>
        <div className="text-sm flex items-center">
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
                className="w-8 h-8 mx-1 p-0"
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
        >
          下一页
        </Button>
      </div>
    );
  }, [currentNavPage, filteredTotalCount, questionsPerPage]);

  // 创建页面卸载处理函数
  const handleBeforeUnload = useCallback(() => {
    try {
      // 检查是否来自错题集
      const source = searchParams.get('source');
      const isFromWrongCollection = source === 'wrong';
      
      // 仅在错题模式且已提交答案且答案正确时移除错题
      if (isFromWrongCollection && 
          question && 
          question.id && 
          answerResult && 
          answerResult.is_correct) {
        console.log(`页面退出：检测到题目 #${question.id} 已答对，自动从错题集中移除`);
        const removed = questionApi.removeFromWrongQuestions(question.id);
        if (removed) {
          console.log(`页面退出：题目 #${question.id} 已从错题集中移除`);
          
          // 触发错题列表刷新事件
          try {
            const event = new CustomEvent('wrongQuestionsChanged', {
              detail: { removedId: question.id }
            });
            window.dispatchEvent(event);
          } catch (eventErr) {
            console.error("触发错题更新事件失败:", eventErr);
          }
        }
      }
    } catch (e) {
      console.error("页面退出时从错题集移除题目失败:", e);
    }
  }, [question, answerResult, searchParams]);

  // 添加页面卸载事件监听器
  useEffect(() => {
    // 只有当题目加载完成且在错题模式下才添加监听器
    if (question && question.id) {
      const source = searchParams.get('source');
      const isFromWrongCollection = source === 'wrong';
      
      if (isFromWrongCollection) {
        console.log(`为题目 #${question.id} 添加页面退出监听器`);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // 组件卸载时移除事件监听器并执行清理
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          // 组件卸载时也执行一次清理
          handleBeforeUnload();
        };
      }
    }
    
    return () => {};
  }, [question, searchParams, handleBeforeUnload]);

  // 为会话状态变化添加更强的更新机制
  useEffect(() => {
    // 添加一个清理旧错题状态的机制
    const cleanupWrongQuestionStatus = () => {
      const source = searchParams.get('source');
      const isFromWrongCollection = source === 'wrong';
      
      if (isFromWrongCollection) {
        console.log("检查并清理错题状态");
        // 从localStorage获取错题集
        const wrongQuestionsStr = localStorage.getItem('wrongQuestions');
        if (wrongQuestionsStr) {
          try {
            const wrongQuestions = JSON.parse(wrongQuestionsStr);
            
            // 遍历会话中的答题记录
            Object.entries(sessionAnswers).forEach(([qId, status]) => {
              // 如果这是一个回答正确的错题
              if (status.isCorrect) {
                console.log(`会话中题目 #${qId} 已答对，应从错题集中移除`);
                
                // 查找该题目在错题集中是否存在
                const questionIndex = wrongQuestions.findIndex(q => q.id === parseInt(qId) || q.id === qId);
                if (questionIndex !== -1) {
                  console.log(`在错题集找到题目 #${qId}，准备移除`);
                  
                  // 从错题集中移除
                  wrongQuestions.splice(questionIndex, 1);
                  
                  // 更新本地存储
                  localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
                  console.log(`题目 #${qId} 已从错题集中移除，当前错题集共有 ${wrongQuestions.length} 题`);
                  
                  // 触发错题列表刷新事件
                  const event = new CustomEvent('wrongQuestionsChanged', {
                    detail: { removedId: qId }
                  });
                  window.dispatchEvent(event);
                }
              }
            });
          } catch (err) {
            console.error("清理错题状态失败:", err);
          }
        }
      }
    };
    
    // 监听会话答题状态变化
    if (Object.keys(sessionAnswers).length > 0) {
      console.log("会话答题状态有更新，正在刷新导航");
      const source = searchParams.get('source');
      const isFromWrongCollection = source === 'wrong';
      
      if (isFromWrongCollection && questionId && sessionAnswers[questionId]) {
        // 仅对错题页面进行特殊处理
        console.log(`错题页面：检测到会话状态更新，当前题目${questionId}状态=${sessionAnswers[questionId].isCorrect ? '正确' : '错误'}`);
        
        // 强制重新渲染导航组件
        setTimeout(() => {
          setCurrentNavPage(p => {
            console.log("强制刷新导航页码");
            return p; // 不改变值，但触发重新渲染
          });
        }, 100);
      }
      
      // 清理错题状态
      cleanupWrongQuestionStatus();
    }
  }, [sessionAnswers, questionId, searchParams]);
  
  // 添加一个通用的导航刷新函数，可以在任何地方调用
  const refreshNavigation = useCallback(() => {
    console.log("手动刷新导航组件");
    // 重置导航初始化标记
    navigationInitializedRef.current = false;
    // 重新初始化导航
    initializeNavigation();
    // 触发页面重新渲染
    setCurrentNavPage(p => p);
  }, [initializeNavigation]);
  
  // 当题目ID变化或提交答案后，强制刷新导航
  useEffect(() => {
    if (submittedAnswer) {
      console.log("检测到已提交答案，确保导航状态更新");
      refreshNavigation();
    }
  }, [submittedAnswer, questionId, refreshNavigation]);

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

  // 在组件内部添加页面退出监听器
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // 获取source值
      const source = searchParams.get('source');
      // 获取isCorrect值
      const isCorrect = answerResult?.is_correct;
      
      // 检查是否从错题集进入且已正确答题
      if (source === 'wrong' && 
          submittedAnswer && 
          isCorrect && 
          questionId) {
        
        console.log('页面退出检测：从错题集进入且答对了，准备移除题目', {
          questionId,
          submittedAnswer,
          isCorrect
        });
        
        try {
          // 从错题集移除该题目
          const result = await questionApi.removeFromWrongQuestions(questionId);
          if (result.success) {
            console.log(`题目 ${questionId} 已从错题集移除`);
          } else {
            console.error('从错题集移除失败:', result.error);
          }
        } catch (error) {
          console.error('页面退出时移除错题失败:', error);
        }
      }
    };

    // 添加页面退出监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 组件卸载时清除监听器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 同样在组件卸载时执行移除逻辑
      handleBeforeUnload();
    };
  }, [searchParams, submittedAnswer, answerResult, questionId]);

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
                    answerResult={answerResult}
                    disabled={!!submittedAnswer}
                    totalQuestions={totalAllQuestions}
                    currentIndex={parseInt(questionId) - 1}
                    hideSubmitButton={true}
                  />

                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      className="flex items-center"
                      disabled={filteredQuestions.length > 0 && currentQuestionIndex <= 0} // 仅当是筛选列表中的第一题时才禁用
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      上一题
                    </Button>

                    {submittedAnswer ? (
                      <Button
                        onClick={handleNextQuestion}
                        className="flex items-center"
                        disabled={filteredQuestions.length > 0 && currentQuestionIndex >= filteredQuestions.length - 1} // 仅当是筛选列表中的最后一题时才禁用
                      >
                        下一题
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer || submitting}
                      >
                        {submitting ? "提交中..." : "提交答案"}
                      </Button>
                    )}
                  </div>

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
