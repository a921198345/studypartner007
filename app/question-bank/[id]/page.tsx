"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { QuestionDetail } from "@/components/question-bank/question-detail"
import { AnswerCard } from "@/components/question-bank/answer-card"
import { questionApi, addToWrongQuestions, isQuestionFavorited } from "@/lib/api/questions"

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
  
  // 使用ref避免不必要的重渲染
  const navigationInitializedRef = useRef(false);
  const apiCallAttemptedRef = useRef(false);
  
  // 从URL获取查询参数
  const searchParams = useSearchParams();

  useEffect(() => {
    // 检查用户登录状态
    const checkAuthStatus = async () => {
      try {
        // 简单请求检查登录状态
        const response = await fetch('/api/auth/session');
        if (response.status === 401 || response.status === 403) {
          console.log('用户未登录，将使用本地存储模式');
          setIsAuthenticated(false);
          setUsingLocalStorage(true);
        } else {
          const data = await response.json();
          setIsAuthenticated(!!data.user);
        }
      } catch (error) {
        console.error('检查登录状态失败，将使用本地存储作为降级策略', error);
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

      if (filteredData && filteredData.questions && filteredData.questions.length > 0) {
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
          // 保持原有筛选顺序，新加入的题目可以放在末尾，或者根据业务逻辑决定排序
          // 如果需要严格按ID排序： questionsToDisplay.sort((a,b) => a.id - b.id);
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
    // 如果已知用户未登录，直接使用localStorage
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
          if (history.results && history.results[qId]) {
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
        
        setQuestion({
          ...data.data,
          options: processedOptions
        });
        setIsFavorite(data.data.is_favorite);
      } else {
        setError(data.message || "获取题目详情失败");
      }
    } catch (err) {
      console.error("获取题目详情出错:", err);
      setError("获取题目详情时发生错误，请稍后再试");
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
        // 使用本地计算的结果
        setAnswerResult({
          is_correct: isCorrect,
          correct_answer: correctAnswer,
          explanation: question?.analysis || "暂无解析"
        });
        setSubmittedAnswer(selectedAnswer);
        
        // 如果本地判断答错，添加到错题集
        if (!isCorrect) {
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
        
        // 保存到本地存储
        localStorage.setItem('answerHistory', JSON.stringify(localUpdateData));
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
      if (isCurrentQuestion) {
        buttonStyle = "default";
        extraStyle = "bg-blue-500 text-white font-bold";
      } else if (answeredQuestions[q.id]) {
        if (correctAnswers[q.id]) {
          extraStyle = "border-green-500 text-green-500";
        } else {
          extraStyle = "border-red-500 text-red-500";
        }
      }
      
      // 使用相对序号(从1开始)而不是题目ID
      const displayText = absoluteIndex + 1;
      
      buttons.push(
        <Button
          key={`nav-${q.id}-${absoluteIndex}`}
          variant={buttonStyle as any}
          size="sm"
          className={`w-full h-10 ${extraStyle}`}
          onClick={() => {
            // 保留当前URL参数
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.set('index', absoluteIndex.toString());
            const url = `/question-bank/${q.id}?${currentParams.toString()}`;
            router.push(url);
          }}
        >
          {displayText}
        </Button>
      );
    }
    
    return buttons;
  }, [filteredQuestions, questionId, currentNavPage, answeredQuestions, correctAnswers, searchParams, questionsPerPage, router]);

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
                      answer: answerResult ? answerResult.correct_answer.split('') : [],
                      analysis: answerResult ? answerResult.explanation : "",
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
                    <AnswerCard
                      isCorrect={answerResult.is_correct}
                      correctAnswer={answerResult.correct_answer}
                      explanation={answerResult.explanation || ""}
                      totalQuestions={totalAllQuestions}
                      answeredQuestions={totalAnswered}
                      correctAnswers={totalCorrect}
                      startTime={new Date()}
                    />
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
                    <h3 className="text-lg font-medium">题目导航</h3>
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
