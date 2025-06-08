"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Star, Filter, Lock } from "lucide-react"
import { Footer } from "@/components/footer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { questionApi, getWrongQuestions, getFavoriteQuestions } from "@/lib/api/questions"

// 辅助函数：比较两个数组是否内容相同（忽略顺序）
function arraysEqual(a: any[], b: any[]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  // 对基本类型数组，先排序再比较
  if (a.every(item => typeof item === 'string' || typeof item === 'number')) {
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
  
  // 如果是对象数组，则需要更复杂的比较
  // 简化起见，这里仅支持基本类型数组比较
  return false;
}

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["全部题型"])
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedYears, setSelectedYears] = useState<string[]>(["2023", "2024"])
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualTotalQuestions, setActualTotalQuestions] = useState(25)
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    perPage: 10
  })
  const [hasLastProgress, setHasLastProgress] = useState(false)
  const [lastQuestionId, setLastQuestionId] = useState<number | null>(null)
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([])
  const [loadingWrongQuestions, setLoadingWrongQuestions] = useState(false)
  const [favoriteQuestions, setFavoriteQuestions] = useState<any[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const subjects = [
    { id: "all", name: "全部科目" },
    { id: "民法", name: "民法" },
    { id: "刑法", name: "刑法" },
    { id: "民事诉讼法", name: "民事诉讼法" },
    { id: "刑事诉讼法", name: "刑事诉讼法" },
    { id: "商法", name: "商法与经济法" },
    { id: "法理学", name: "理论法学" },
    { id: "行政法", name: "行政法与行政诉讼法" },
    { id: "三国法", name: "三国法" },
  ]

  const years = [
    { id: "all", name: "全部年份" },
    { id: "2024", name: "2024年", free: true },
    { id: "2023", name: "2023年", free: true },
    { id: "2022", name: "2022年", free: true },
    { id: "2021", name: "2021年", free: false },
    { id: "2020", name: "2020年", free: false },
    { id: "2019", name: "2019年", free: false },
  ]

  // 创建错题列表（为了保留"我的错题"标签页功能，但不显示错题标签）
  // const wrongQuestions = [2, 4, 6] // 假设这些ID是错题

  const router = useRouter()

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        
        // 获取题目列表
        let questionsData;
        try {
          const response = await questionApi.getQuestions({
            subject: selectedSubject !== 'all' ? selectedSubject : undefined,
            year: selectedYears.includes('all') ? undefined : selectedYears,
            question_type: !selectedQuestionTypes.includes('全部题型') ? selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题' : undefined,
            page: pagination.currentPage,
            limit: pagination.perPage
          });
          
          questionsData = response;
          
          if (response.success) {
            setQuestions(response.data.questions);
            
            // 更新分页信息和题目总数
            const newTotal = response.data.pagination.total;
            setPagination(prev => ({
              ...prev,
              total: newTotal,
              totalPages: response.data.pagination.totalPages
            }));
            
            // 更新实际题目总数
            setActualTotalQuestions(newTotal);
            
            // 保存题目总数到localStorage，供其他页面使用
            localStorage.setItem('questionTotalCount', newTotal.toString());
            
            // --- 修改开始: 获取并保存所有筛选后的题目信息 ---
            if (newTotal > 0) {
              fetchAllFilteredQuestionInfoAndSave(newTotal, {
                subject: selectedSubject !== 'all' ? selectedSubject : undefined,
                year: selectedYears.includes('all') ? undefined : selectedYears,
                question_type: !selectedQuestionTypes.includes('全部题型') ? (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
              }, response.data.questions); // 传入当前页数据作为降级
            } else {
              // 如果筛选结果为0，清空或保存空列表
              localStorage.setItem('filteredQuestionsList', JSON.stringify({
                questions: [],
                filters: {
                  subject: selectedSubject,
                  years: selectedYears,
                  types: selectedQuestionTypes
                },
                timestamp: Date.now()
              }));
            }
            // --- 修改结束 ---
          } else {
            console.error("获取题目列表API响应失败:", response.message);
            setError(response.message || "获取题目列表失败");
          }
        } catch (questionsError) {
          console.error("获取题目列表请求异常:", questionsError);
          setError("获取题目列表失败，请稍后再试");
        }
        
        // 尝试获取用户答题历史 - 即使题目获取失败也继续尝试
        try {
          const historyResponse = await questionApi.getAnswerHistory();
          
          // 如果成功获取历史数据，更新统计信息
          if (historyResponse.success) {
            // 更新学习统计区域的数据
            const totalAnswered = historyResponse.data.totalAnswered;
            const totalCorrect = historyResponse.data.totalCorrect;
            
            // 更新DOM元素中的统计数据
            updateStatistics(totalAnswered, totalCorrect);
          } else if (historyResponse.offline) {
            // 使用了离线数据
            console.log("使用离线答题历史数据");
            if (historyResponse.data) {
              const totalAnswered = historyResponse.data.totalAnswered;
              const totalCorrect = historyResponse.data.totalCorrect;
              updateStatistics(totalAnswered, totalCorrect);
            }
          }
        } catch (historyError) {
          console.error("获取用户答题历史失败:", historyError);
          // 错误处理，但不影响主页面功能
        }
        
        // 尝试获取上次练习进度 - 无论前面的请求是否成功
        try {
          // 首先检查本地存储是否有最近答题记录
          const historyString = localStorage.getItem('answerHistory');
          let lastQuestionFromLocal = null;
          let hasLocalProgress = false;
          
          if (historyString) {
            try {
              const history = JSON.parse(historyString);
              // 如果本地有答题历史且不超过1天
              if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
                // 找出最近回答的题目ID（最大ID）
                const answeredIds = Object.keys(history.answered || {}).map(Number);
                if (answeredIds.length > 0) {
                  lastQuestionFromLocal = Math.max(...answeredIds);
                  hasLocalProgress = true;
                }
              }
            } catch (e) {
              console.error("解析本地答题历史失败:", e);
            }
          }
          
          // 尝试从服务器获取最近答题进度
          const progressResponse = await questionApi.getLastPracticeProgress({
            subject: selectedSubject !== 'all' ? selectedSubject : undefined,
            year: selectedYears.includes('all') ? undefined : selectedYears.length === 1 ? selectedYears[0] : undefined,
            question_type: !selectedQuestionTypes.includes('全部题型') ? selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题' : undefined
          });
          
          if (progressResponse.success) {
            setHasLastProgress(true);
            setLastQuestionId(progressResponse.data.last_question_id);
            console.log("成功获取最近练习进度:", progressResponse.data);
          } else if (hasLocalProgress && lastQuestionFromLocal) {
            // 如果服务器请求失败但本地有记录，使用本地记录
            console.log("使用本地存储的最近答题记录:", lastQuestionFromLocal);
            setHasLastProgress(true);
            setLastQuestionId(lastQuestionFromLocal);
          } else {
            setHasLastProgress(false);
            setLastQuestionId(null);
          }
        } catch (progressError) {
          console.error("获取练习进度失败:", progressError);
          
          // 如果API请求失败，尝试从本地存储获取
          try {
            const historyString = localStorage.getItem('answerHistory');
            if (historyString) {
              const history = JSON.parse(historyString);
              // 如果本地有答题历史且不超过1天
              if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
                // 找出最近回答的题目ID（最大ID）
                const answeredIds = Object.keys(history.answered || {}).map(Number);
                if (answeredIds.length > 0) {
                  const lastQuestionFromLocal = Math.max(...answeredIds);
                  setHasLastProgress(true);
                  setLastQuestionId(lastQuestionFromLocal);
                  console.log("从本地存储恢复的最近答题ID:", lastQuestionFromLocal);
                } else {
                  setHasLastProgress(false);
                }
              }
            } else {
              setHasLastProgress(false);
            }
          } catch (e) {
            console.error("从本地存储获取练习进度失败:", e);
            setHasLastProgress(false);
          }
        }
        
      } catch (err) {
        console.error("获取题目列表失败:", err);
        setError("获取题目失败，请稍后再试");
        // 即使发生错误，仍然尝试从本地存储加载必要数据
        tryLoadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };
    
    // 辅助函数：更新页面上的统计数据
    const updateStatistics = (totalAnswered: number, totalCorrect: number) => {
      // 更新统计信息DOM元素
      const answeredElement = document.getElementById('stats-answered');
      const correctRateElement = document.getElementById('stats-correct-rate');
      const wrongCountElement = document.getElementById('stats-wrong-count');
      
      if (answeredElement) {
        answeredElement.textContent = `${totalAnswered}/500`;
        const progressBar = answeredElement.nextElementSibling?.querySelector('div');
        if (progressBar) {
          progressBar.style.width = `${Math.min((totalAnswered / 500) * 100, 100)}%`;
        }
      }
      
      if (correctRateElement && totalAnswered > 0) {
        const correctRate = Math.round((totalCorrect / totalAnswered) * 100);
        correctRateElement.textContent = `${correctRate}%`;
        const progressBar = correctRateElement.nextElementSibling?.querySelector('div');
        if (progressBar) {
          progressBar.style.width = `${correctRate}%`;
        }
      }
      
      if (wrongCountElement) {
        wrongCountElement.textContent = `${totalAnswered - totalCorrect}`;
      }
    };
    
    // 辅助函数：在API请求全部失败时尝试从本地存储加载数据
    const tryLoadFromLocalStorage = () => {
      try {
        // 尝试加载练习进度
        const historyString = localStorage.getItem('answerHistory');
        if (historyString) {
          const history = JSON.parse(historyString);
          if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
            // 找出最近回答的题目ID
            const answeredIds = Object.keys(history.answered || {}).map(Number);
            if (answeredIds.length > 0) {
              setHasLastProgress(true);
              setLastQuestionId(Math.max(...answeredIds));
              
              // 更新统计信息
              const totalAnswered = answeredIds.length;
              const totalCorrect = Object.values(history.correct || {}).filter(Boolean).length;
              updateStatistics(totalAnswered, totalCorrect);
            }
          }
        }
        
        // 尝试加载缓存的题目列表
        const cachedQuestionsStr = localStorage.getItem('cachedQuestions');
        if (cachedQuestionsStr && questions.length === 0) {
          try {
            const cached = JSON.parse(cachedQuestionsStr);
            if (cached && cached.data && cached.data.success && cached.data.data && cached.data.data.questions) {
              setQuestions(cached.data.data.questions);
              // 更新分页信息
              if (cached.data.data.pagination) {
                setPagination(prev => ({
                  ...prev,
                  total: cached.data.data.pagination.total || 0,
                  totalPages: cached.data.data.pagination.totalPages || 1
                }));
              }
            }
          } catch (e) {
            console.error("解析缓存题目数据失败:", e);
          }
        }
      } catch (e) {
        console.error("从本地存储加载备份数据失败:", e);
      }
    };
    
    // 新增函数：获取所有筛选后的题目信息并保存到 localStorage
    const fetchAllFilteredQuestionInfoAndSave = async (totalItems: number, filters: any, currentPageData: any[]) => {
      try {
        // 假设 questionApi.getQuestions 支持一个fetchAllIds: true 或者类似的参数
        // 或者后端有新的专门接口
        const response = await questionApi.getQuestions({
          ...filters,
          // page: 1, // 根据后端API设计调整
          // limit: totalItems, // 根据后端API设计调整
          fetchAllIdsAndCodes: true // 假设的新参数，用于获取所有ID和题号
        });

        if (response.success && response.data && response.data.questions) {
          const allFilteredQuestionInfo = response.data.questions.map((q: any) => ({
            id: q.id,
            question_code: q.question_code || null
          }));

          localStorage.setItem('filteredQuestionsList', JSON.stringify({
            questions: allFilteredQuestionInfo,
            filters: {
              subject: filters.subject || 'all',
              years: filters.year || ['all'],
              types: filters.question_type ? [filters.question_type] : ['全部题型']
            },
            timestamp: Date.now()
          }));
          console.log(`成功保存 ${allFilteredQuestionInfo.length} 条筛选后的题目信息到localStorage`);
        } else {
          console.warn("获取所有筛选题目ID和题号失败，将使用当前页数据作为导航降级。", response.message);
          // 降级：只保存当前页的题目信息
          const currentFilteredQuestions = currentPageData.map((q: any) => ({ id: q.id, question_code: q.question_code || null }));
          localStorage.setItem('filteredQuestionsList', JSON.stringify({
            questions: currentFilteredQuestions,
            filters: {
              subject: filters.subject || 'all',
              years: filters.year || ['all'],
              types: filters.question_type ? [filters.question_type] : ['全部题型']
            },
            page: pagination.currentPage, // 保留当前页信息，因为列表不完整
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error("请求所有筛选题目ID和题号时出错:", error);
        // 降级：只保存当前页的题目信息
        const currentFilteredQuestions = currentPageData.map((q: any) => ({ id: q.id, question_code: q.question_code || null }));
        localStorage.setItem('filteredQuestionsList', JSON.stringify({
          questions: currentFilteredQuestions,
          filters: {
            subject: filters.subject || 'all',
            years: filters.year || ['all'],
            types: filters.question_type ? [filters.question_type] : ['全部题型']
          },
          page: pagination.currentPage, // 保留当前页信息，因为列表不完整
          timestamp: Date.now()
        }));
      }
    };

    fetchQuestions();
  }, [selectedSubject, selectedYears, selectedQuestionTypes, pagination.currentPage, pagination.perPage]);

  // 加载错题集函数
  const loadWrongQuestions = async () => {
    setLoadingWrongQuestions(true);
    try {
      console.log("开始加载错题集...");
      // 从本地存储获取错题集
      const wrongQs = getWrongQuestions();
      console.log("获取到错题集:", wrongQs.length, "题");
      setWrongQuestions(wrongQs);
    } catch (error) {
      console.error("加载错题集失败:", error);
    } finally {
      setLoadingWrongQuestions(false);
    }
  };
  
  // 初始加载错题集和添加监听器
  useEffect(() => {
    loadWrongQuestions();
    
    // 添加错题集变化事件的监听器
    const handleWrongQuestionsChange = (event: Event) => {
      // 将event转换为CustomEvent以访问detail属性
      const customEvent = event as CustomEvent<{
        removed?: number;
        removedId?: number;
        action?: string;
      }>;
      
      console.log("检测到错题集变化事件:", customEvent.detail);
      
      // 立即重新加载错题集，无论是哪种操作
      loadWrongQuestions();
      
      // 如果当前正在错题标签页，确保UI立即更新
      if (activeTab === "wrong") {
        console.log("当前在错题标签页，强制刷新显示");
        // 强制重新渲染
        setWrongQuestions(prev => [...prev]); // 触发重新渲染
        setTimeout(() => {
          loadWrongQuestions(); // 再次加载确保数据最新
        }, 100);
      }
    };
    
    // 添加多种可能的事件名称监听，确保兼容性
    window.addEventListener('wrongQuestionsChanged', handleWrongQuestionsChange);
    window.addEventListener('wrongQuestionsUpdated', handleWrongQuestionsChange);
    
    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('wrongQuestionsChanged', handleWrongQuestionsChange);
      window.removeEventListener('wrongQuestionsUpdated', handleWrongQuestionsChange);
    };
  }, [activeTab]); // 添加activeTab作为依赖，确保监听器能获取最新的标签状态

  // 处理标签切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "wrong") {
      // 每次进入错题标签时都重新加载错题列表
      console.log("切换到错题标签，重新加载错题列表");
      loadWrongQuestions();
    } else if (value === "favorite") {
      // 每次进入收藏标签时都重新加载收藏列表，确保数据是最新的
      console.log("切换到收藏标签，重新加载收藏列表");
      loadFavoriteQuestions();
    }
  }

  // 加载收藏的题目
  const loadFavoriteQuestions = async () => {
    setLoadingFavorites(true);
    try {
      console.log("开始加载收藏题目列表");
      
      // 使用新的API方法获取收藏题目（带完整详情）
      const result = await questionApi.getFavorites(true);
      
      console.log("getFavorites API 返回结果:", result);
      
      if (result.success && result.data && result.data.favorites) {
        console.log("成功获取收藏题目:", result.data.favorites.length, "题");
        console.log("数据来源:", result.source || "API");
        
        // 如果 API 返回空列表但标记为成功，检查是否需要从本地加载
        if (result.data.favorites.length === 0 && result.source !== "local" && result.source !== "local-assembled") {
          console.log("API返回空列表，尝试从本地存储加载收藏题目");
          
          // 直接调用本地组装函数
          const localResult = await questionApi.assembleLocalFavorites(true);
          if (localResult.success && localResult.data.favorites.length > 0) {
            console.log("从本地加载到收藏题目:", localResult.data.favorites.length, "题");
            const formattedFavorites = localResult.data.favorites.map(question => ({
              ...question,
              id: question.id,
              question_code: question.question_code || `题目${question.id}`,
              year: question.year || '未知年份',
              subject: question.subject || '未分类',
              question_type: question.question_type || 1,
              question_text: question.question_text || '题目内容未加载',
              is_favorite: true
            }));
            
            setFavoriteQuestions(formattedFavorites);
            saveFavoriteListToLocalStorage(formattedFavorites);
            return;
          }
        }
        
        if (result.data.favorites[0]) {
          console.log("原始数据示例:", result.data.favorites[0]);
        }
        
        // 格式化题目数据，确保字段完整
        const formattedFavorites = result.data.favorites.map(question => ({
          ...question,
          id: question.id,
          question_code: question.question_code || `题目${question.id}`,
          year: question.year || '未知年份',
          subject: question.subject || '未分类',
          question_type: question.question_type || 1, // 默认单选
          question_text: question.question_text || '题目内容未加载',
          is_favorite: true
        }));
        
        if (formattedFavorites[0]) {
          console.log("格式化后的数据示例:", formattedFavorites[0]);
        }
        console.log("准备设置的收藏题目数量:", formattedFavorites.length);
        
        setFavoriteQuestions(formattedFavorites);
        
        // 保存收藏题目列表到localStorage（用于题目导航）
        saveFavoriteListToLocalStorage(formattedFavorites);
      } else {
        console.error("获取收藏题目失败或列表为空:", result);
        
        // 如果完全失败，尝试从本地加载
        console.log("尝试从本地存储加载收藏题目作为后备方案");
        const localFavorites = getFavoriteQuestions();
        if (localFavorites && localFavorites.length > 0) {
          console.log("从本地getFavoriteQuestions获取到收藏ID:", localFavorites);
          // 尝试组装本地收藏
          const localResult = await questionApi.assembleLocalFavorites(true);
          if (localResult.success && localResult.data.favorites.length > 0) {
            const formattedFavorites = localResult.data.favorites.map(question => ({
              ...question,
              id: question.id,
              question_code: question.question_code || `题目${question.id}`,
              year: question.year || '未知年份',
              subject: question.subject || '未分类',
              question_type: question.question_type || 1,
              question_text: question.question_text || '题目内容未加载',
              is_favorite: true
            }));
            setFavoriteQuestions(formattedFavorites);
            saveFavoriteListToLocalStorage(formattedFavorites);
            return;
          }
        }
        
        setFavoriteQuestions([]);
      }
    } catch (error) {
      console.error("加载收藏题目失败:", error);
      setFavoriteQuestions([]);
    } finally {
      setLoadingFavorites(false);
    }
  };
  
  // 保存收藏题目列表到本地存储
  const saveFavoriteListToLocalStorage = (questions) => {
    try {
      // 提取导航所需的基本信息，避免保存完整题目内容
      const favoritesList = {
        questions: questions.map(q => ({
          id: q.id,
          question_code: q.question_code || `题目${q.id}`,
          year: q.year || '未知年份',
          subject: q.subject || '未分类',
          question_type: q.question_type || 1
        })),
        total: questions.length,
        timestamp: Date.now(),
        source: "favorites"
      };
      localStorage.setItem('favoriteQuestionsList', JSON.stringify(favoritesList));
    } catch (e) {
      console.error("保存收藏题目列表到本地存储失败:", e);
    }
  };
  
  // 注释掉初始加载，让用户切换到收藏标签时再加载
  // useEffect(() => {
  //   loadFavoriteQuestions();
  // }, []);

  // 处理学科选择变化
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    // 重置分页
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // 处理年份选择变化
  const handleYearChange = (yearId: string, checked: boolean) => {
    setSelectedYears(prev => {
      if (yearId === 'all') {
        // 如果选择"全部年份"，清除其他选择
        return checked ? ['all'] : [];
      } else {
        // 如果选择具体年份，移除"全部年份"
        let newYears = prev.filter(y => y !== 'all');
        
        if (checked) {
          // 添加选中的年份
          if (!newYears.includes(yearId)) {
            newYears.push(yearId);
          }
        } else {
          // 移除取消选中的年份
          newYears = newYears.filter(y => y !== yearId);
        }

        // 如果没有选择任何年份，默认选择"全部年份"
        if (newYears.length === 0) {
          return ['all'];
        }

        return newYears;
      }
    });
    // 重置分页
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // 检查用户是否可以访问某年份的题目（免费或会员）
  const canAccessYear = (year: string) => {
    const yearObj = years.find(y => y.id === year);
    // 如果找不到年份信息，默认可访问
    if (!yearObj) return true;
    // 如果是免费年份，可以访问
    if (yearObj.free) return true;
    // 这里可以添加会员检查逻辑
    const isMember = false; // 假设用户不是会员
    return isMember;
  };

  // 处理点击题目进入详情页的函数
  const handleQuestionClick = (questionId: number, fromTab?: string) => {
    // 检查localStorage中是否已存在完整的筛选列表数据
    try {
      const existingFilteredListStr = localStorage.getItem('filteredQuestionsList');
      let navigationState;
      
      if (existingFilteredListStr) {
        const existingFilteredData = JSON.parse(existingFilteredListStr);
        // 检查现有数据是否有效且包含完整题目列表
        if (existingFilteredData && 
            existingFilteredData.questions && 
            existingFilteredData.questions.length > 0 &&
            // 检查时间戳，确保数据不超过1小时
            existingFilteredData.timestamp && 
            (Date.now() - existingFilteredData.timestamp < 3600000) &&
            // 检查筛选条件是否匹配当前条件
            existingFilteredData.filters.subject === selectedSubject &&
            arraysEqual(existingFilteredData.filters.years, selectedYears) &&
            arraysEqual(existingFilteredData.filters.types, selectedQuestionTypes)) {
          
          console.log(`找到有效的完整筛选列表，包含 ${existingFilteredData.questions.length} 题，不覆盖它`);
          
          // 使用现有的完整列表，仅更新当前页码和点击的题目索引
          navigationState = {
            ...existingFilteredData,
            currentPage: pagination.currentPage,
            timestamp: Date.now()
          };
          
          // 更新并保存
          localStorage.setItem('filteredQuestionsList', JSON.stringify(navigationState));
        } else {
          console.log('现有筛选列表无效或已过期，或筛选条件已变更，创建新的导航状态');
          createAndSaveNewNavigationState();
        }
      } else {
        console.log('未找到现有筛选列表，创建新的导航状态');
        createAndSaveNewNavigationState();
      }
    } catch (e) {
      console.error('处理筛选列表时出错，创建新的导航状态:', e);
      createAndSaveNewNavigationState();
    }
    
    // 创建并保存新的导航状态的辅助函数
    function createAndSaveNewNavigationState() {
      // 注意：这只会包含当前页的题目，但作为降级方案保留
      const currentFilterState = {
        questions: questions.map(q => ({
          id: q.id,
          question_code: q.question_code || null
        })),
        filters: {
          subject: selectedSubject,
          years: selectedYears,
          types: selectedQuestionTypes
        },
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        total: pagination.total,
        perPage: pagination.perPage,
        timestamp: Date.now()
      };
      
      // 保存到localStorage，用于快速本地导航
      localStorage.setItem('filteredQuestionsList', JSON.stringify(currentFilterState));
    }
    
    // 创建查询参数，用于通过URL传递关键筛选条件
    const queryParams = new URLSearchParams();
    
    // 添加基本筛选参数
    if (selectedSubject !== 'all') {
      queryParams.append('subject', selectedSubject);
    }
    
    // 年份参数（如果不是"全部"）
    if (!selectedYears.includes('all')) {
      queryParams.append('years', selectedYears.join(','));
    }
    
    // 题型参数（如果不是"全部题型"）
    if (!selectedQuestionTypes.includes('全部题型')) {
      queryParams.append('types', selectedQuestionTypes.join(','));
    }
    
    // 当前页码
    queryParams.append('page', pagination.currentPage.toString());
    
    // 列表位置索引（当前题目是第几个）
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      queryParams.append('index', questionIndex.toString());
    }
    
    // 如果是从收藏标签页点击的，添加source参数但不添加continue（表示开始新练习）
    if (fromTab === 'favorite') {
      queryParams.append('source', 'favorites');
      queryParams.append('index', '0'); // 收藏模式使用自己的索引
      
      // 保存收藏题目列表到localStorage
      const favoritesList = {
        questions: favoriteQuestions.map(q => ({
          id: q.id,
          question_code: q.question_code || null,
          year: q.year,
          subject: q.subject,
          question_type: q.question_type
        })),
        total: favoriteQuestions.length,
        timestamp: Date.now(),
        source: "favorites"
      };
      localStorage.setItem('favoriteQuestionsList', JSON.stringify(favoritesList));
      
      // 找到在收藏列表中的索引
      const favIndex = favoriteQuestions.findIndex(q => q.id === questionId);
      if (favIndex !== -1) {
        queryParams.set('index', favIndex.toString());
      }
    }
    
    // 如果是从错题标签页点击的
    if (fromTab === 'wrong') {
      queryParams.append('source', 'wrong');
      queryParams.append('resetWrong', 'true');
      const wrongIndex = wrongQuestions.findIndex(q => q.id === questionId);
      if (wrongIndex !== -1) {
        queryParams.append('wrongIndex', wrongIndex.toString());
      }
    }
    
    // 构建带查询参数的URL
    const url = queryParams.toString() 
      ? `/question-bank/${questionId}?${queryParams.toString()}`
      : `/question-bank/${questionId}`;
    
    console.log(`准备跳转到题目 #${questionId}，URL: ${url}`);
    
    // 使用路由导航到题目详情页
    router.push(url);
  };

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
            <h1 className="text-3xl font-bold gradient-text">法考真题库</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索题目..."
                  className="w-[350px] pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">学科筛选</h3>
                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择学科" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">年份筛选</h3>
                    <div className="space-y-2">
                      {years.map((year) => (
                        <div key={year.id} className="flex items-center">
                          <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded text-primary"
                              checked={selectedYears.includes(year.id)}
                              onChange={(e) => handleYearChange(year.id, e.target.checked)}
                            />
                            <span>{year.name}</span>
                          </label>
                          {year.free === false && (
                            <Badge variant="outline" className="ml-auto">
                              <Lock className="h-3 w-3 mr-1" />
                              会员
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">题型筛选</h3>
                    <div className="space-y-2">
                      {["全部题型", "单选题", "多选题"].map((type) => (
                        <label key={type} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded text-primary"
                            checked={selectedQuestionTypes.includes(type)}
                            onChange={(e) => {
                              if (type === "全部题型") {
                                // 当选择"全部题型"时，取消其他选项
                                setSelectedQuestionTypes(e.target.checked ? ["全部题型"] : []);
                              } else {
                                // 当选择具体题型时，取消"全部题型"选项
                                let newTypes = [...selectedQuestionTypes];
                                if (e.target.checked) {
                                  newTypes = newTypes.filter(t => t !== "全部题型");
                                  newTypes.push(type);
                                } else {
                                  newTypes = newTypes.filter(t => t !== type);
                                  // 如果没有选择任何具体题型，则自动选择"全部题型"
                                  if (newTypes.filter(t => t !== "全部题型").length === 0) {
                                    newTypes = ["全部题型"];
                                  }
                                }
                                setSelectedQuestionTypes(newTypes);
                              }
                              // 重置分页
                              setPagination(prev => ({ ...prev, currentPage: 1 }));
                            }}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-primary" />
                    学习统计
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>已做题目</span>
                        <span id="stats-answered" className="font-medium">0/500</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: "0%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>正确率</span>
                        <span id="stats-correct-rate" className="font-medium">0%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "0%" }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div id="stats-wrong-count" className="text-lg font-semibold text-red-500">0</div>
                        <div className="text-xs text-gray-500">错题数</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="text-lg font-semibold text-amber-500">0</div>
                        <div className="text-xs text-gray-500">收藏数</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
                <div className="flex justify-between items-center mb-4">
                  <TabsList>
                  <TabsTrigger value="all">全部题目</TabsTrigger>
                  <TabsTrigger value="wrong">我的错题</TabsTrigger>
                  <TabsTrigger value="favorite">我的收藏</TabsTrigger>
                </TabsList>

                  {/* 根据不同标签页显示不同的按钮 */}
                  {activeTab === "all" && (
                    <div className="flex space-x-4">
                      <Button 
                        onClick={() => lastQuestionId && router.push(`/question-bank/${lastQuestionId}`)}
                        className={`${hasLastProgress ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 opacity-70 cursor-not-allowed"}`}
                        disabled={!hasLastProgress}
                      >
                        继续练习
                      </Button>
                      <Button onClick={() => questions.length > 0 && router.push(`/question-bank/${questions[0].id}`)}>
                        开始练习
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === "wrong" && wrongQuestions.length > 0 && (
                    <Button onClick={() => wrongQuestions.length > 0 && router.push(`/question-bank/${wrongQuestions[0].id}?source=wrong&wrongIndex=0&resetWrong=true`)}>
                      开始练习
                    </Button>
                  )}
                  
                  {activeTab === "favorite" && favoriteQuestions.length > 0 && (
                    <div className="flex space-x-4">
                      <Button 
                        onClick={() => {
                          // 保存收藏题目列表到localStorage
                          const favoritesList = {
                            questions: favoriteQuestions.map(q => ({
                              id: q.id,
                              question_code: q.question_code || null,
                              year: q.year,
                              subject: q.subject,
                              question_type: q.question_type
                            })),
                            total: favoriteQuestions.length,
                            timestamp: Date.now(),
                            source: "favorites"
                          };
                          localStorage.setItem('favoriteQuestionsList', JSON.stringify(favoritesList));
                          
                          // 查找收藏列表中上次练习的题目
                          const historyString = localStorage.getItem('answerHistory');
                          let lastFavoriteQuestion = null;
                          
                          if (historyString) {
                            try {
                              const history = JSON.parse(historyString);
                              // 如果本地有答题历史且不超过1天
                              if (history && history.timestamp && Date.now() - history.timestamp < 86400000) {
                                // 找出最近回答的收藏题目ID
                                const answeredIds = Object.keys(history.answered || {}).map(Number);
                                // 过滤出收藏列表中的题目ID
                                const favoriteIds = favoriteQuestions.map(q => q.id);
                                // 取交集，找出已回答的收藏题目
                                const answeredFavorites = answeredIds.filter(id => favoriteIds.includes(id));
                                
                                if (answeredFavorites.length > 0) {
                                  // 找出最大ID或最后做的一道题
                                  lastFavoriteQuestion = Math.max(...answeredFavorites);
                                }
                              }
                            } catch (e) {
                              console.error("解析本地答题历史失败:", e);
                            }
                          }
                          
                          // 如果找到上次练习的收藏题目，跳转到该题
                          if (lastFavoriteQuestion) {
                            router.push(`/question-bank/${lastFavoriteQuestion}?source=favorites&continue=true`);
                          } else {
                            // 否则提示没有最近练习记录
                            alert("没有找到收藏题目的最近练习记录");
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        继续练习
                      </Button>
                      <Button onClick={() => {
                        // 保存收藏题目列表到localStorage
                        const favoritesList = {
                          questions: favoriteQuestions.map(q => ({
                            id: q.id,
                            question_code: q.question_code || null,
                            year: q.year,
                            subject: q.subject,
                            question_type: q.question_type
                          })),
                          total: favoriteQuestions.length,
                          timestamp: Date.now(),
                          source: "favorites"
                        };
                        localStorage.setItem('favoriteQuestionsList', JSON.stringify(favoritesList));
                        
                        // 跳转到第一个收藏题目 - 移除continue=true参数，确保重置状态
                        router.push(`/question-bank/${favoriteQuestions[0].id}?source=favorites&index=0`);
                      }}>
                        开始练习
                      </Button>
                    </div>
                  )}
                </div>

                <TabsContent value="all">
                  {loading ? (
                    <div className="text-center py-8">加载中...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-8">未找到符合条件的题目</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">共 {actualTotalQuestions} 道题目</h3>
                      </div>
                      
                      {questions.map((question) => (
                        <div 
                          key={question.id}
                          className="cursor-pointer"
                          onClick={() => handleQuestionClick(question.id)}
                        >
                          <Card className="h-full">
                        <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={question.question_type === "单选题" ? "default" : "secondary"}>
                                    {question.question_type === "单选题" ? "单选" : "多选"}
                              </Badge>
                                  
                                  {question.subject && (
                                    <Badge variant="secondary">{question.subject}</Badge>
                                  )}
                                  
                                  {question.year && (
                                    <Badge variant="outline">{question.year}</Badge>
                                  )}
                            </div>
                                
                                <div className="text-sm text-gray-500">
                                  {question.question_code || `题号: ${question.id}`}
                            </div>
                          </div>
                              <p className="text-sm">{question.question_text}</p>
                            </CardContent>
                          </Card>
                        </div>
                      ))}

                      {/* 分页控件保持不变 */}
                      <div className="flex justify-between items-center mt-6">
                        <div className="text-sm text-gray-500">
                          共 {actualTotalQuestions} 题，每页 {pagination.perPage} 题，当前第 {pagination.currentPage}/{pagination.totalPages} 页
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={pagination.currentPage <= 1}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: 1 }))}
                          >
                            首页
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={pagination.currentPage <= 1}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          >
                            上一页
                          </Button>
                          
                          <div className="flex space-x-1">
                            {(() => {
                              const maxButtons = 5;
                              const pages = [];
                              let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
                              let endPage = startPage + maxButtons - 1;
                              
                              if (endPage > pagination.totalPages) {
                                endPage = pagination.totalPages;
                                startPage = Math.max(1, endPage - maxButtons + 1);
                              }
                              
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <Button 
                                    key={i}
                                    variant={i === pagination.currentPage ? "default" : "outline"} 
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: i }))}
                                  >
                                    {i}
                                  </Button>
                                );
                              }
                              
                              return pages;
                            })()}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={pagination.currentPage >= pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          >
                            下一页
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={pagination.currentPage >= pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: pagination.totalPages }))}
                          >
                            末页
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="wrong">
                  <div className="space-y-4">
                    {loadingWrongQuestions ? (
                      <div className="text-center py-8">加载中...</div>
                    ) : wrongQuestions.length === 0 ? (
                      <div className="p-10 border rounded-lg text-center">
                        <h3 className="text-lg font-medium mb-2">错题收集中</h3>
                        <p className="text-gray-500 mb-4">您需要先做题才能收集错题</p>
                        <div className="flex justify-center space-x-2">
                          <Button onClick={() => questions.length > 0 && router.push(`/question-bank/${questions[0].id}`)}>
                            开始练习
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-medium">共收集到 {wrongQuestions.length} 道错题</h3>
                        </div>
                        
                        {wrongQuestions.map((question, index) => (
                          <Link 
                            href={`/question-bank/${question.id}?source=wrong&wrongIndex=${index}`} 
                            key={question.id}
                          >
                            <div 
                              className="p-4 border rounded-lg hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{question.year}</Badge>
                                  <Badge variant="secondary">{question.subject}</Badge>
                                  <Badge>
                                    {question.question_type === 1 ? "单选题" : "多选题"}
                                </Badge>
                              </div>
                              </div>
                              <p className="text-sm mb-2">{question.question_text}</p>
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="favorite">
                  <div className="space-y-4">
                    {loadingFavorites ? (
                      <div className="text-center py-8">加载中...</div>
                    ) : favoriteQuestions.length === 0 ? (
                      <div className="p-10 border rounded-lg text-center">
                        <h3 className="text-lg font-medium mb-2">收藏夹为空</h3>
                        <p className="text-gray-500 mb-4">您可以在做题时收藏您认为重要的题目</p>
                        <div className="flex justify-center space-x-2">
                          <Button onClick={() => questions.length > 0 && router.push(`/question-bank/${questions[0].id}`)}>
                            开始练习
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-medium">共收藏了 {favoriteQuestions.length} 道题目</h3>
                        </div>
                        
                        {favoriteQuestions.map((question, idx) => (
                          <div 
                            key={question.id}
                            onClick={() => handleQuestionClick(question.id, 'favorite')}
                            className="p-4 border rounded-lg hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    {question.year ? question.year : '未知年份'}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {question.subject || '未分类'}
                                  </Badge>
                                  <Badge>
                                    {question.question_type === 1 || question.question_type === '单选题' ? 
                                      "单选题" : (question.question_type === 2 || question.question_type === '多选题' ? 
                                        "多选题" : "未知类型")}
                                  </Badge>
                                </div>
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              </div>
                              <p className="text-sm">{question.question_text || '题目内容未加载'}</p>
                            </div>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
