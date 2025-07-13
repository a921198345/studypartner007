"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Star, Filter, Lock, Calendar, Target } from "lucide-react"
import { Footer } from "@/components/footer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { questionApi, getWrongQuestions, getFavoriteQuestions } from "@/lib/api/questions"
import { AnswerHistoryV2 as AnswerHistory } from "@/components/question-bank/answer-history-v2"
import { createAnswerSession } from "@/lib/answer-sessions"
import { useToast } from "@/components/ui/use-toast"
import { useFirstUseAuth } from '@/components/auth/first-use-auth-guard'
import { useStudyPlanStore } from '@/stores/study-plan-store'
import { useStudySessionStore } from '@/stores/study-session-store'
import { useUserStore } from '@/stores/user-store'
import { Alert, AlertDescription } from "@/components/ui/alert"

// 筛选选项接口
interface FilterOptions {
  selectedYears: string[]
  selectedQuestionTypes: string[]
  searchQuery: string
  aiKeywords: string[]
  isFromAiChat: boolean
}

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

// 生成智能搜索建议
function generateSearchSuggestions(keywords: string[]): string[] {
  const suggestions = new Set<string>();
  
  // 法律概念映射表
  const conceptMap = {
    '抢劫': ['盗窃', '诈骗', '抢夺', '故意伤害'],
    '转化': ['既遂', '未遂', '中止', '预备'],
    '事后': ['当场', '预备', '既遂'],
    '犯罪': ['故意', '过失', '正当防卫'],
    '客观': ['主观', '故意', '过失'],
    '处分': ['占有', '所有权', '物权'],
    '行为': ['犯罪', '违法', '责任'],
    '婚姻': ['离婚', '家庭', '夫妻', '配偶'],
    '家庭': ['婚姻', '继承', '遗产'],
    '合同': ['协议', '契约', '效力', '履行']
  };
  
  // 为每个关键词生成相关建议
  for (const keyword of keywords) {
    // 提取核心概念
    const cleanKeyword = keyword
      .replace(/[（）()【】\[\]]/g, '')
      .replace(/[0-9]+[、\.]/g, '')
      .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '')
      .trim();
    
    // 查找相关概念
    for (const [key, values] of Object.entries(conceptMap)) {
      if (cleanKeyword.includes(key) || key.includes(cleanKeyword)) {
        values.forEach(value => suggestions.add(value));
      }
    }
    
    // 智能分词并添加建议
    if (cleanKeyword.length >= 4) {
      // 提取2-3字的关键概念
      for (let i = 0; i <= cleanKeyword.length - 2; i++) {
        const segment = cleanKeyword.substr(i, 2);
        if (conceptMap[segment]) {
          conceptMap[segment].forEach(value => suggestions.add(value));
        }
      }
    }
  }
  
  // 如果没有找到相关建议，提供一般性建议
  if (suggestions.size === 0) {
    return ['故意杀人', '正当防卫', '犯罪构成', '合同效力', '婚姻关系'];
  }
  
  return Array.from(suggestions).slice(0, 5);
}

export default function QuestionBankPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { checkAuthOnAction } = useFirstUseAuth('question-bank')
  const { toast } = useToast()
  
  // 学习计划集成
  const { currentPlan: plan } = useStudyPlanStore()
  const { todayProgress: progress, updateTodayProgress } = useStudySessionStore()
  
  // 用户状态管理
  const { isPremiumUser } = useUserStore()
  
  // 从URL参数初始化状态
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [aiKeywords, setAiKeywords] = useState<string[]>([])
  const [isFromAiChat, setIsFromAiChat] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false) // 添加初始化标志
  
  // 简化初始化逻辑 - 默认显示2022年全部题目
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["全部题型"])
  const [selectedYears, setSelectedYears] = useState<string[]>(["2022"])
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualTotalQuestions, setActualTotalQuestions] = useState(0)
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
  const [isFetchingAllIds, setIsFetchingAllIds] = useState(false)
  const [isNavigationReady, setIsNavigationReady] = useState(false) // 添加导航数据准备状态
  const requestIdRef = useRef(0) // 添加请求ID来防止竞态条件

  const years = [
    { id: "all", name: "全部年份" },
    { id: "2024", name: "2024年", free: true },
    { id: "2023", name: "2023年", free: true },
    { id: "2022", name: "2022年", free: true },
    { id: "2021", name: "2021年", free: false },
    { id: "2020", name: "2020年", free: false },
    { id: "2019", name: "2019年", free: false },
    { id: "2018", name: "2018年", free: false },
    { id: "2017", name: "2017年", free: false },
    { id: "2016", name: "2016年", free: false },
    { id: "2015", name: "2015年", free: false },
    { id: "2014", name: "2014年", free: false },
    { id: "2013", name: "2013年", free: false },
    { id: "2012", name: "2012年", free: false },
    { id: "2011", name: "2011年", free: false },
    { id: "2010", name: "2010年", free: false },
  ]

  // 创建错题列表（为了保留"我的错题"标签页功能，但不显示错题标签）
  // const wrongQuestions = [2, 4, 6] // 假设这些ID是错题

  // 处理从AI聊天跳转过来的情况 - 简化版本
  useEffect(() => {
    const source = searchParams.get('source')
    const keywords = searchParams.get('keywords')
    const restart = searchParams.get('restart')
    const filtersParam = searchParams.get('filters')
    const sessionIdParam = searchParams.get('sessionId')
    
    // 处理从答题历史跳转的重新答题
    if (restart === 'true' && filtersParam) {
      try {
        const filters = JSON.parse(decodeURIComponent(filtersParam))
        console.log('从答题历史重新答题，恢复筛选条件:', filters)
        
        // 恢复筛选条件
        // 科目筛选已移除
        if (filters.years && Array.isArray(filters.years)) {
          setSelectedYears(filters.years)
        }
        if (filters.types && Array.isArray(filters.types)) {
          setSelectedQuestionTypes(filters.types)
        }
        if (filters.search) {
          setSearchQuery(filters.search)
          setDebouncedSearchQuery(filters.search)
        }
        if (filters.aiKeywords && filters.aiKeywords.length > 0) {
          setAiKeywords(filters.aiKeywords)
          setIsFromAiChat(true)
          sessionStorage.setItem('aiKeywords', JSON.stringify(filters.aiKeywords))
        }
        
        // 如果有sessionId，设置当前会话
        if (sessionIdParam) {
          sessionStorage.setItem('currentSessionId', sessionIdParam)
        }
        
        // 显示提示
        toast({
          description: "正在加载筛选后的题目...",
          duration: 3000,
        })
      } catch (e) {
        console.error('解析筛选条件失败:', e)
      }
    } else if ((source === 'ai-chat' || source === 'knowledge-map') && keywords) {
      // 清理关键词函数：去除序号、括号等格式标记
      const cleanKeyword = (keyword: string) => {
        return keyword
          .replace(/[（）()【】\[\]]/g, '') // 去除括号
          .replace(/[0-9]+[、\.]/g, '') // 去除序号
          .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
          .trim()
      };
      
      // 解析并清理关键词数组
      const rawKeywordArray = keywords.split(',').map(k => k.trim()).filter(k => k)
      const cleanedKeywordArray = rawKeywordArray.map(cleanKeyword).filter(k => k.length > 0)
      
      // 处理单独的knowledgePoint参数（从知识导图跳转时可能单独传递）
      const knowledgePointParam = searchParams.get('knowledgePoint')
      if (knowledgePointParam) {
        const cleanedKnowledgePoint = cleanKeyword(knowledgePointParam)
        if (cleanedKnowledgePoint && !cleanedKeywordArray.includes(cleanedKnowledgePoint)) {
          cleanedKeywordArray.push(cleanedKnowledgePoint)
        }
      }
      
      setAiKeywords(cleanedKeywordArray)
      setIsFromAiChat(true)
      
      // 从知识导图跳转的学科筛选功能已移除
      // 但保留关键词搜索功能
      
      // 简单保存搜索状态
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aiKeywords', JSON.stringify(cleanedKeywordArray))
        // 保存来源信息
        sessionStorage.setItem('searchSource', source || '')
      }
      
      // 根据来源显示不同的提示
      const sourceText = source === 'knowledge-map' ? '知识导图' : 'AI问答'
      toast({
        description: `从${sourceText}跳转，正在搜索包含"${cleanedKeywordArray.join('、')}"的题目`,
        duration: 4000,
      })
    } else if (typeof window !== 'undefined') {
      // 只有当有明确的source参数时才恢复AI搜索关键词
      // 直接访问页面时不应该恢复之前的搜索状态
      const source = searchParams.get('source')
      if (source === 'ai-chat' || source === 'knowledge-map') {
        // 尝试恢复之前的AI搜索关键词
        const savedKeywords = sessionStorage.getItem('aiKeywords')
        if (savedKeywords) {
          try {
            const keywords = JSON.parse(savedKeywords)
            if (Array.isArray(keywords) && keywords.length > 0) {
              // 清理关键词函数：去除序号、括号等格式标记（防止sessionStorage中有旧数据）
              const cleanKeyword = (keyword: string) => {
                return keyword
                  .replace(/[（）()【】\[\]]/g, '') // 去除括号
                  .replace(/[0-9]+[、\.]/g, '') // 去除序号
                  .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
                  .trim()
              };
              
              // 清理恢复的关键词
              const cleanedKeywords = keywords.map(cleanKeyword).filter(k => k.length > 0)
              setAiKeywords(cleanedKeywords)
              setIsFromAiChat(true)
              
              // 更新sessionStorage为清理后的关键词
              sessionStorage.setItem('aiKeywords', JSON.stringify(cleanedKeywords))
            }
          } catch (e) {
            console.error('恢复AI关键词失败:', e)
          }
        }
      } else {
        // 直接访问页面时，清除之前的AI搜索状态
        console.log('直接访问页面，清除AI搜索状态')
        sessionStorage.removeItem('aiKeywords')
        setAiKeywords([])
        setIsFromAiChat(false)
      }
    }
    
    // 标记初始化完成
    setIsInitialized(true)
  }, [searchParams, toast])

  // 处理重新答题时加载完题目后的跳转
  useEffect(() => {
    const restart = searchParams.get('restart')
    const sessionIdParam = searchParams.get('sessionId')
    
    if (restart === 'true' && questions.length > 0 && isNavigationReady) {
      console.log('重新答题：题目加载完成，准备跳转到第一题')
      
      // 清除答题历史
      const historyKey = 'answerHistory'
      localStorage.setItem(historyKey, JSON.stringify({
        answered: {},
        correct: {},
        results: {},
        timestamp: Date.now()
      }))
      
      // 获取第一题ID
      const firstQuestionId = questions[0].id
      
      // 构建跳转URL，保留筛选条件
      const queryParams = new URLSearchParams()
      
      // 科目筛选已移除
      if (!selectedYears.includes('all')) {
        queryParams.append('years', selectedYears.join(','))
      }
      if (!selectedQuestionTypes.includes('全部题型')) {
        queryParams.append('types', selectedQuestionTypes.join(','))
      }
      if (debouncedSearchQuery) {
        queryParams.append('search', debouncedSearchQuery)
      }
      if (aiKeywords.length > 0) {
        queryParams.append('aiKeywords', aiKeywords.join(','))
      }
      if (sessionIdParam) {
        queryParams.append('sessionId', sessionIdParam)
      }
      
      queryParams.append('index', '0')
      queryParams.append('restart', 'true')
      
      // 跳转到第一题
      const url = `/question-bank/${firstQuestionId}?${queryParams.toString()}`
      console.log('重新答题跳转URL:', url)
      router.push(url)
    }
  }, [questions, isNavigationReady, selectedYears, selectedQuestionTypes, debouncedSearchQuery, aiKeywords, router, searchParams])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      // 搜索时重置到第一页
      if (searchQuery !== debouncedSearchQuery) {
        setPagination(prev => ({ ...prev, currentPage: 1 }))
      }
      // 如果用户手动输入搜索，清除AI关键词
      if (searchQuery) {
        setIsFromAiChat(false)
        setAiKeywords([])
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('aiKeywords')
        }
      } else if (!searchQuery && !isFromAiChat) {
        // 如果清空搜索且不是AI搜索，重置分页
        setPagination(prev => ({ ...prev, currentPage: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, debouncedSearchQuery])

  useEffect(() => {
    const fetchQuestions = async () => {
      // 如果还未初始化完成，不发起请求
      if (!isInitialized) {
        console.log('等待初始化完成...');
        return;
      }
      
      // 如果是AI搜索模式但还没有关键词，先不发起请求
      if (isFromAiChat && aiKeywords.length === 0) {
        console.log('AI搜索模式但关键词为空，跳过请求');
        return;
      }
      
      // 增加请求ID以防止竞态条件
      const currentRequestId = ++requestIdRef.current;
      console.log(`开始新的请求 #${currentRequestId}，筛选条件:`, {
        selectedYears,
        selectedQuestionTypes,
        debouncedSearchQuery
      });
      
      try {
        setLoading(true)
        
        // 获取题目列表
        let questionsData;
        try {
          // 如果是从AI聊天来的，使用AI关键词；否则使用搜索框内容
          let finalQuestions = [];
          let totalCount = 0;
          
          if (isFromAiChat && aiKeywords.length > 0) {
            console.log('使用AI关键词进行搜索:', aiKeywords);
            
            // 统一使用多关键词搜索API
            console.log(`调用多关键词搜索API: ${aiKeywords.join(', ')}`);
            
            const searchResponse = await questionApi.searchWithMultipleKeywords({
              keywords: aiKeywords,
              year: selectedYears,
              questionType: !selectedQuestionTypes.includes('全部题型') ? 
                (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
              page: pagination.currentPage,
              limit: pagination.perPage
            });
            
            if (searchResponse.success) {
              questionsData = searchResponse;
              console.log(`多关键词搜索结果: 找到 ${searchResponse.data?.pagination?.total || 0} 道题目`);
              console.log('搜索调试信息:', searchResponse.data?.debug);
              
              // 如果没有搜索结果，提供智能建议
              if (searchResponse.data?.pagination?.total === 0) {
                console.log('未找到相关题目，提供智能建议');
                
                // 生成搜索建议
                const suggestions = generateSearchSuggestions(aiKeywords);
                
                toast({
                  title: "未找到相关题目",
                  description: `建议尝试搜索: ${suggestions.slice(0, 3).join('、')}`,
                  duration: 8000,
                });
              }
            } else {
              console.error('多关键词搜索失败:', searchResponse.message);
              // 使用空结果
              questionsData = {
                success: false,
                message: searchResponse.message || '搜索失败',
                data: {
                  questions: [],
                  pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: pagination.currentPage,
                    perPage: pagination.perPage
                  }
                }
              };
            }
          } else {
            // 普通搜索
            console.log('调用API时的筛选参数:', {
              selectedYears,
              selectedQuestionTypes,
              debouncedSearchQuery,
              searchQuery,
              hasSearch: !!debouncedSearchQuery
            });
            
            const yearParam = selectedYears.includes('all') ? undefined : selectedYears;
            console.log('年份参数处理:', {
              selectedYears,
              includesAll: selectedYears.includes('all'),
              yearParam
            });
            
            const response = await questionApi.getQuestions({
              year: yearParam,
              question_type: !selectedQuestionTypes.includes('全部题型') ? selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题' : undefined,
              search: debouncedSearchQuery || undefined,
              page: pagination.currentPage,
              limit: pagination.perPage
            });
            
            questionsData = response;
          }
          
          if (questionsData.success) {
            // 检查是否是最新的请求
            if (currentRequestId !== requestIdRef.current) {
              console.log(`忽略过期的请求 #${currentRequestId}，当前最新请求是 #${requestIdRef.current}`);
              return;
            }
            
            setQuestions(questionsData.data.questions);
            
            // 更新分页信息和题目总数
            const newTotal = questionsData.data.pagination.total;
            setPagination(prev => ({
              ...prev,
              total: newTotal,
              totalPages: questionsData.data.pagination.totalPages
            }));
            
            // 更新实际题目总数
            // 确保AI搜索的结果总数正确显示
            setActualTotalQuestions(prevTotal => {
              if (prevTotal !== newTotal) {
                console.log(`请求 #${currentRequestId} 更新题目总数: ${prevTotal} -> ${newTotal}`);
              }
              return newTotal;
            });
            
            // 添加调试日志
            if (isFromAiChat && aiKeywords.length > 0) {
              console.log(`AI搜索结果总数: ${newTotal}, 关键词: ${aiKeywords.join(', ')}`);
            } else if (debouncedSearchQuery) {
              console.log(`普通搜索结果总数: ${newTotal}, 搜索词: ${debouncedSearchQuery}`);
            } else {
              console.log(`全部题目总数: ${newTotal}`);
            }
            
            // 调试日志
            console.log('搜索响应:', {
              searchQuery: debouncedSearchQuery,
              total: newTotal,
              questions: questionsData.data.questions.length
            });
            
            // 保存题目总数到localStorage，供其他页面使用
            localStorage.setItem('questionTotalCount', newTotal.toString());
            
            // --- 修改开始: 获取并保存所有筛选后的题目信息 ---
            // 只在第一页时获取完整的题目列表，避免重复请求
            if (newTotal > 0 && pagination.currentPage === 1) {
              // 只在有搜索条件或AI关键词时才获取完整列表
              // 否则使用已经返回的分页数据即可
              if (isFromAiChat && aiKeywords.length > 0) {
                // AI搜索模式
                fetchAllFilteredQuestionInfoAndSave(newTotal, {
                  year: selectedYears.includes('all') ? undefined : selectedYears,
                  question_type: !selectedQuestionTypes.includes('全部题型') ? (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
                  aiKeywords: aiKeywords,
                }, questionsData.data.questions, newTotal);
              } else if (debouncedSearchQuery) {
                // 普通搜索模式
                fetchAllFilteredQuestionInfoAndSave(newTotal, {
                  year: selectedYears.includes('all') ? undefined : selectedYears,
                  question_type: !selectedQuestionTypes.includes('全部题型') ? (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
                  search: debouncedSearchQuery,
                }, questionsData.data.questions, newTotal);
              } else if (newTotal <= 200) {
                // 无搜索条件的普通浏览模式，题目数量不太多时获取完整列表
                // 提高阈值到200以覆盖更多筛选场景
                fetchAllFilteredQuestionInfoAndSave(newTotal, {
                  year: selectedYears.includes('all') ? undefined : selectedYears,
                  question_type: !selectedQuestionTypes.includes('全部题型') ? (selectedQuestionTypes.includes('单选题') ? '单选题' : '多选题') : undefined,
                }, questionsData.data.questions, newTotal);
              } else {
                // 题目数量太多时，只保存基本信息避免性能问题
                console.log(`筛选结果 ${newTotal} 道题太多，不获取完整列表`);
                localStorage.setItem('filteredQuestionsList', JSON.stringify({
                  questions: [], // 空列表，导航将使用备用方案
                  filters: {
                    years: selectedYears,
                    types: selectedQuestionTypes,
                    search: debouncedSearchQuery || '',
                    aiKeywords: []
                  },
                  actualTotal: newTotal, // 保存实际总数
                  timestamp: Date.now(),
                  partial: true // 标记为部分数据
                }));
              }
            } else if (newTotal === 0) {
              // 如果筛选结果为0，清空或保存空列表
              localStorage.setItem('filteredQuestionsList', JSON.stringify({
                questions: [],
                filters: {
                  years: selectedYears,
                  types: selectedQuestionTypes,
                  search: debouncedSearchQuery || '',
                  aiKeywords: isFromAiChat ? aiKeywords : []
                },
                timestamp: Date.now()
              }));
            }
            // --- 修改结束 ---
          } else {
            console.error("获取题目列表API响应失败:", questionsData.message);
            setError(questionsData.message || "获取题目列表失败");
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
    const fetchAllFilteredQuestionInfoAndSave = async (totalItems: number, filters: any, currentPageData: any[], actualFilteredTotal?: number) => {
      // 防止重复请求
      if (isFetchingAllIds) {
        console.log('已有获取所有ID的请求在进行中，跳过');
        return;
      }
      
      console.log('fetchAllFilteredQuestionInfoAndSave 被调用，参数:', {
        totalItems,
        filters,
        actualFilteredTotal,
        hasAiKeywords: !!(filters.aiKeywords && filters.aiKeywords.length > 0),
        hasSearch: !!filters.search
      });
      
      try {
        setIsFetchingAllIds(true);
        // 如果有AI关键词，使用多关键词搜索API获取完整结果
        if (filters.aiKeywords && filters.aiKeywords.length > 0) {
          console.log('使用多关键词搜索API获取完整结果，关键词:', filters.aiKeywords);
          
          // 调用多关键词搜索API，获取所有结果（不分页）
          const response = await questionApi.searchWithMultipleKeywords({
            keywords: filters.aiKeywords,
            subject: filters.subject && filters.subject !== 'all' ? filters.subject : undefined,
            year: filters.year || ['all'],
            questionType: filters.question_type,
            page: 1,
            limit: 1000 // 获取所有结果
          });
          
          if (response.success && response.data && response.data.questions) {
            console.log('多关键词搜索API响应:', {
              returnedCount: response.data.questions.length,
              total: response.data.pagination?.total,
              page: response.data.pagination?.currentPage,
              perPage: response.data.pagination?.perPage
            });
            
            const allFilteredQuestionInfo = response.data.questions.map((q: any) => ({
              id: q.id,
              question_code: q.question_code || null
            }));
            
            const dataToSave = {
              questions: allFilteredQuestionInfo,
              filters: {
                subject: filters.subject || 'all',
                years: filters.year || ['all'],
                types: filters.question_type ? [filters.question_type] : ['全部题型'],
                search: filters.aiKeywords.join(', '),
                aiKeywords: filters.aiKeywords
              },
              actualTotal: actualFilteredTotal || allFilteredQuestionInfo.length,
              timestamp: Date.now()
            };
            localStorage.setItem('filteredQuestionsList', JSON.stringify(dataToSave));
            console.log(`成功保存 ${allFilteredQuestionInfo.length} 条多关键词搜索结果到localStorage`);
            console.log(`实际筛选总数: ${actualFilteredTotal || allFilteredQuestionInfo.length}`);
            console.log('保存的前10个题目ID:', allFilteredQuestionInfo.slice(0, 10).map(q => q.id));
            console.log('保存的数据结构:', {
              questionsLength: dataToSave.questions.length,
              actualTotal: dataToSave.actualTotal,
              filters: dataToSave.filters
            });
            
            // 标记导航数据已准备好
            setIsNavigationReady(true);
          }
        } else {
          // 普通搜索
          const response = await questionApi.getQuestions({
            ...filters,
            fetchAllIdsAndCodes: true
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
                types: filters.question_type ? [filters.question_type] : ['全部题型'],
                search: filters.search || ''
              },
              timestamp: Date.now()
            }));
            console.log(`成功保存 ${allFilteredQuestionInfo.length} 条筛选后的题目信息到localStorage`);
            setIsNavigationReady(true);
          } else {
            console.warn("获取所有筛选题目ID和题号失败，将使用当前页数据作为导航降级。", response.message);
            // 降级：只保存当前页的题目信息
            const currentFilteredQuestions = currentPageData.map((q: any) => ({ id: q.id, question_code: q.question_code || null }));
            localStorage.setItem('filteredQuestionsList', JSON.stringify({
              questions: currentFilteredQuestions,
              filters: {
                subject: filters.subject || 'all',
                years: filters.year || ['all'],
                types: filters.question_type ? [filters.question_type] : ['全部题型'],
                search: filters.search || ''
              },
              page: pagination.currentPage, // 保留当前页信息，因为列表不完整
              timestamp: Date.now()
            }));
          }
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
            types: filters.question_type ? [filters.question_type] : ['全部题型'],
            search: filters.search || '',
            aiKeywords: filters.aiKeywords || []
          },
          page: pagination.currentPage, // 保留当前页信息，因为列表不完整
          timestamp: Date.now()
        }));
      } finally {
        setIsFetchingAllIds(false);
        setIsNavigationReady(true);
      }
    };

    fetchQuestions();
  }, [selectedYears, selectedQuestionTypes, pagination.currentPage, pagination.perPage, debouncedSearchQuery, isFromAiChat, aiKeywords, isInitialized]);

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

  // 学科筛选功能已移除

  // 处理年份选择变化
  const handleYearChange = (yearId: string, checked: boolean) => {
    console.log('handleYearChange 被调用:', { yearId, checked, currentYears: selectedYears });
    
    setSelectedYears(prev => {
      let newYears;
      if (yearId === 'all') {
        newYears = checked ? ['all'] : [];
      } else {
        // 重要：选择具体年份时，需要移除'all'
        newYears = prev.filter(y => y !== 'all');
        
        if (checked) {
          if (!newYears.includes(yearId)) {
            newYears.push(yearId);
          }
        } else {
          newYears = newYears.filter(y => y !== yearId);
        }

        // 如果没有选择任何年份，默认选择'all'
        if (newYears.length === 0) {
          newYears = ['all'];
        }
      }
      
      console.log('年份选择更新:', { prev, newYears });
      return newYears;
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
    // 检查用户会员状态
    return isPremiumUser();
  };

  // 处理点击题目进入详情页的函数
  const handleQuestionClick = async (questionId: number, fromTab?: string) => {
    // 如果正在获取完整列表，等待一下
    if (isFetchingAllIds) {
      console.log('正在获取完整题目列表，请稍候...');
      // 等待最多2秒
      let waitTime = 0;
      while (isFetchingAllIds && waitTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
    }
    
    // 记录到学习计划进度
    if (plan) {
      updateTodayProgress({
        questions_practiced: progress.questions_practiced + 1,
        subjects_studied: progress.subjects_studied // 不再跟踪学科
      });
    }
    
    // 创建新的答题会话（如果是开始练习）
    // 创建答题会话（异步处理，不阻塞跳转）
    const createSessionAsync = async () => {
      if (!fromTab || fromTab === 'all') {
        const currentFilters = {
          years: selectedYears,
          types: selectedQuestionTypes,
          search: debouncedSearchQuery || ''
        }
        // 传入当前筛选条件下的总题数和来源
        await createAnswerSession(currentFilters, actualTotalQuestions, 'all')
      } else if (fromTab === 'wrong') {
        // 错题练习会话
        await createAnswerSession({}, wrongQuestions.length, 'wrong')
      } else if (fromTab === 'favorite') {
        // 收藏练习会话
        await createAnswerSession({}, favoriteQuestions.length, 'favorites')
      }
    }
    
    // 异步创建会话，不阻塞页面跳转
    createSessionAsync().catch(error => {
      console.error('创建答题会话失败:', error)
    })
    
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
            arraysEqual(existingFilteredData.filters.years, selectedYears) &&
            arraysEqual(existingFilteredData.filters.types, selectedQuestionTypes) &&
            // 检查搜索条件：要么都是AI搜索，要么都是普通搜索
            ((isFromAiChat && existingFilteredData.filters.aiKeywords && 
              arraysEqual(existingFilteredData.filters.aiKeywords, aiKeywords)) ||
             (!isFromAiChat && existingFilteredData.filters.search === (debouncedSearchQuery || '')))) {
          
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
          years: selectedYears,
          types: selectedQuestionTypes,
          search: debouncedSearchQuery || ''
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
    
    // 基本筛选参数（科目筛选已移除）
    
    // 年份参数（如果不是"全部"）
    if (!selectedYears.includes('all')) {
      queryParams.append('years', selectedYears.join(','));
    }
    
    // 题型参数（如果不是"全部题型"）
    if (!selectedQuestionTypes.includes('全部题型')) {
      queryParams.append('types', selectedQuestionTypes.join(','));
    }
    
    // 搜索参数
    if (debouncedSearchQuery) {
      queryParams.append('search', debouncedSearchQuery);
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
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold gradient-text">法考真题库</h1>
              {/* 从知识导图跳转的返回按钮 */}
              {((isFromAiChat && typeof window !== 'undefined' && sessionStorage.getItem('searchSource') === 'knowledge-map') || searchParams.get('source') === 'knowledge-map') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fromParam = searchParams.get('from');
                    const knowledgePointParam = searchParams.get('knowledgePoint');
                    
                    if (fromParam) {
                      // 构建返回URL，包含恢复状态的参数
                      const returnParams = new URLSearchParams({
                        subject: fromParam,
                        restoreState: 'true'
                      });
                      
                      // 如果有知识点参数，也传递过去用于恢复选中状态（需要清理）
                      if (knowledgePointParam) {
                        const cleanedKnowledgePoint = knowledgePointParam
                          .replace(/[（）()【】\[\]]/g, '')
                          .replace(/[0-9]+[、\.]/g, '')
                          .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '')
                          .trim();
                        returnParams.append('selectedKnowledge', cleanedKnowledgePoint);
                      }
                      
                      router.push(`/knowledge-map?${returnParams.toString()}`);
                    } else {
                      router.push('/knowledge-map?restoreState=true');
                    }
                  }}
                  className="text-sm"
                >
                  ← 返回知识导图
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10 transform -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="搜索题目内容..."
                  className="w-[350px] pl-9 pr-9 border-border bg-background focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      // 直接触发搜索，不等待防抖
                      setDebouncedSearchQuery(searchQuery)
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 p-1 hover:bg-muted rounded-full transition-colors z-10 transform -translate-y-1/2"
                    onClick={() => {
                      setSearchQuery('')
                      setDebouncedSearchQuery('')
                    }}
                  >
                    <svg className="h-4 w-4 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {debouncedSearchQuery && (
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  正在搜索: "{debouncedSearchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* 学习计划推荐区域 */}
          {plan && plan.subjects_order && plan.subjects_order.length > 0 && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Target className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">今日练习推荐：</span>
                    <span className="ml-2">
                      {plan.subjects_order[0]}
                      {plan.metadata?.key_milestones && plan.metadata.key_milestones[0] && (
                        <span className="text-sm text-muted-foreground ml-3">
                          目标：{plan.metadata.key_milestones[0]}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 科目切换功能已移除 */}
                    <Badge variant="secondary">
                      今日已练习 {progress.questions_practiced} 题
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-4 space-y-4">

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
                              let newTypes;
                              if (type === "全部题型") {
                                // 当选择"全部题型"时，取消其他选项
                                newTypes = e.target.checked ? ["全部题型"] : [];
                              } else {
                                // 当选择具体题型时，取消"全部题型"选项
                                newTypes = [...selectedQuestionTypes];
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
                              }
                              setSelectedQuestionTypes(newTypes);
                              // 保存选择状态
                              sessionStorage.setItem('selectedQuestionTypes', JSON.stringify(newTypes));
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

              <AnswerHistory />
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
                      <Button onClick={() => {
                        if (questions.length > 0) {
                          // 创建新会话并传入总题数
                          const currentFilters = {
                            years: selectedYears,
                            types: selectedQuestionTypes,
                            search: debouncedSearchQuery || ''
                          }
                          createAnswerSession(currentFilters, actualTotalQuestions)
                          handleQuestionClick(questions[0].id)
                        }
                      }}>
                        开始练习
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === "wrong" && wrongQuestions.length > 0 && (
                    <Button onClick={() => {
                      if (wrongQuestions.length > 0) {
                        // 创建错题练习会话
                        createAnswerSession({}, wrongQuestions.length, 'wrong')
                        router.push(`/question-bank/${wrongQuestions[0].id}?source=wrong&wrongIndex=0&resetWrong=true`)
                      }
                    }}>
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
                      <Button onClick={async () => {
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
                        
                        // 创建收藏练习会话
                        try {
                          await createAnswerSession({}, favoriteQuestions.length, 'favorites');
                        } catch (error) {
                          console.error('创建收藏会话失败:', error);
                        }
                        // 跳转到第一个收藏题目 - 移除continue=true参数，确保重置状态
                        router.push(`/question-bank/${favoriteQuestions[0].id}?source=favorites&index=0`);
                      }}>
                        开始练习
                      </Button>
                    </div>
                  )}
                </div>

                <TabsContent value="all">
                  {/* AI搜索提示和清除按钮 */}
                  {isFromAiChat && aiKeywords.length > 0 && (
                    <div className="bg-blue-50 p-3 mb-4 rounded-md flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-600">正在显示 </span>
                        <span className="font-medium text-blue-600">{aiKeywords.join('、')}</span>
                        <span className="text-gray-600"> 的相关题目</span>
                        {isFetchingAllIds && (
                          <span className="ml-2 text-blue-500">（正在加载完整列表...）</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsFromAiChat(false)
                          setAiKeywords([])
                          if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('aiKeywords')
                          }
                          toast({
                            description: "已清除AI关键词筛选",
                            duration: 2000,
                          })
                        }}
                        className="text-xs"
                      >
                        清除筛选
                      </Button>
                    </div>
                  )}
                  
                  
                  {loading ? (
                    <div className="text-center py-8">加载中...</div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-8">未找到符合条件的题目</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">
                          {isFromAiChat && aiKeywords.length > 0 ? (
                            <>
                              共 {actualTotalQuestions} 道题目
                              <span className="text-sm text-gray-600 ml-2">
                                （以下是 <span className="text-blue-600 font-semibold">{aiKeywords.join('、')}</span> 的相关题目）
                              </span>
                            </>
                          ) : debouncedSearchQuery ? (
                            <>搜索 "{debouncedSearchQuery}" 共找到 {actualTotalQuestions} 道题目</>
                          ) : (
                            <>共 {actualTotalQuestions} 道题目</>
                          )}
                        </h3>
                      </div>
                      
                      {questions.map((question) => (
                        <div 
                          key={question.id}
                          className={`cursor-pointer ${isFetchingAllIds ? 'opacity-50 pointer-events-none' : ''} ${question.memberOnly ? 'opacity-75' : ''}`}
                          onClick={() => {
                            if (!isFetchingAllIds) {
                              if (question.memberOnly) {
                                // 显示升级会员提示
                                toast({
                                  title: "需要升级会员",
                                  description: `查看${question.year}年真题需要升级为会员`,
                                  duration: 3000,
                                });
                              } else {
                                handleQuestionClick(question.id)
                              }
                            }
                          }}
                        >
                          <Card className="h-full relative">
                        <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {question.year && (
                                    <Badge variant="outline">{question.year}</Badge>
                                  )}
                                  
                                  {question.memberOnly && (
                                    <Badge variant="outline" className="bg-yellow-50">
                                      <Lock className="h-3 w-3 mr-1" />
                                      会员
                                    </Badge>
                                  )}
                                  
                                  {question.subject && (
                                    <Badge variant="secondary">{question.subject}</Badge>
                                  )}
                                  
                                  <Badge>
                                    {question.question_type === "单选题" ? "单选题" : "多选题"}
                                  </Badge>
                            </div>
                                
                                <div className="text-sm text-gray-500">
                                  {question.question_code || `题号: ${question.id}`}
                            </div>
                          </div>
                              <p className="text-sm">
                                {(() => {
                                  // 高亮关键词逻辑
                                  let highlightedText = question.question_text;
                                  const keywordsToHighlight = isFromAiChat && aiKeywords.length > 0 
                                    ? aiKeywords 
                                    : (debouncedSearchQuery ? [debouncedSearchQuery] : []);
                                  
                                  if (keywordsToHighlight.length > 0) {
                                    // 对每个关键词进行高亮
                                    keywordsToHighlight.forEach((keyword, index) => {
                                      if (keyword) {
                                        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const className = index === 0 ? 'bg-yellow-200' : 'bg-blue-200';
                                        highlightedText = highlightedText.replace(
                                          new RegExp(`(${escapedKeyword})`, 'gi'),
                                          `<mark class="${className}">$1</mark>`
                                        );
                                      }
                                    });
                                    
                                    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
                                  }
                                  
                                  return question.question_text;
                                })()}
                              </p>
                            </CardContent>
                            
                            {/* 会员蒙版 */}
                            {question.memberOnly && !isPremiumUser() && (
                              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10 rounded-lg">
                                <div className="text-center">
                                  <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-gray-600 text-sm font-medium">需要会员功能才能解锁</p>
                                  <p className="text-gray-500 text-xs mt-1">升级会员查看{question.year}年真题</p>
                                </div>
                              </div>
                            )}
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
                          <Button onClick={() => questions.length > 0 && handleQuestionClick(questions[0].id)}>
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
                          <Button onClick={() => questions.length > 0 && handleQuestionClick(questions[0].id)}>
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
