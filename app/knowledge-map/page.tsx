"use client"

import React from 'react';
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ZoomIn, ZoomOut, Lock, Brain, Calendar, BookOpen } from "lucide-react"
import { Footer } from "@/components/footer"
import { useFirstUseAuth } from '@/components/auth/first-use-auth-guard'
import { useToast } from "@/components/ui/use-toast"
import { SaveNoteButton } from "@/components/ai-chat/SaveNoteButton"
import { useStudyPlan, useStudySession } from '@/stores/study-plan-store'
import { Alert, AlertDescription } from "@/components/ui/alert"

// 使用 dynamic import 避免 SSR 相关问题
const MindMapViewer = dynamic(
  () => import('@/components/knowledge-map/MindMapViewer'),
  { 
    ssr: false, // 禁用服务器端渲染
    loading: () => (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-gray-600">正在加载知识导图...</div>
      </div>
    )
  }
);

const MindMapQuickNav = dynamic(
  () => import('@/components/knowledge-map/MindMapQuickNav.jsx'),
  { ssr: false }
);

export default function KnowledgeMapPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { checkAuthOnAction } = useFirstUseAuth('knowledge-map')
  const { toast } = useToast()
  const urlSubject = searchParams.get('subject') || "民法"
  const urlSearch = searchParams.get('search') || ""
  
  // 解析多个搜索关键词（用逗号分隔）
  const searchKeywords = urlSearch ? urlSearch.split(',').map(k => k.trim()).filter(k => k) : []
  
  // 法考8大科目列表 - 只使用中文名称
  const validSubjects = ['民法', '刑法', '民事诉讼法', '刑事诉讼法', '行政法', '商经知', '三国法', '理论法']
  
  // 获取科目的中文名称 - 如果不在有效科目列表中，默认返回民法
  const getSubjectName = (subjectId: string) => {
    return validSubjects.includes(subjectId) ? subjectId : '民法'
  }
  
  const [selectedSubject, setSelectedSubject] = useState(urlSubject)
  const [selectedSubjectName, setSelectedSubjectName] = useState(getSubjectName(urlSubject))
  
  // 学习计划集成
  const { plan } = useStudyPlan()
  const { isActive: isStudySessionActive, session, start: startStudySession, end: endStudySession } = useStudySession()
  const [zoomLevel, setZoomLevel] = useState(1.0); // 添加缩放级别状态
  const [searchTerm, setSearchTerm] = useState(urlSearch); // 添加搜索词状态
  const [inputValue, setInputValue] = useState(''); // 从AI聊天跳转时不显示在搜索框
  const [totalNodeCount, setTotalNodeCount] = useState(0); // 添加知识点总数状态
  const [isFromAIChat, setIsFromAIChat] = useState(false); // 标记是否从AI聊天跳转
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState(null); // 选中的知识点
  const [isClient, setIsClient] = useState(false); // 检测是否在客户端
  const [selectedNodeLevel, setSelectedNodeLevel] = useState(0); // 选中节点的层级
  const [selectedParentNodes, setSelectedParentNodes] = useState<string[]>([]); // 选中节点的父级路径
  const [sourceData, setSourceData] = useState(null); // 知识点出处数据
  const [isLoadingSource, setIsLoadingSource] = useState(false); // 加载状态
  const [expandedSources, setExpandedSources] = useState<Record<string | number, boolean>>({}); // 展开状态
  const [analysisData, setAnalysisData] = useState<any>(null); // 重难点解析数据
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); // 解析加载状态
  const [shouldRestoreState, setShouldRestoreState] = useState(false); // 是否应该恢复状态
  const [currentNodePath, setCurrentNodePath] = useState<string[]>([]); // 当前节点的完整路径
  const [showTips, setShowTips] = useState(true); // 是否显示操作提示
  
  // 在客户端初始化后从localStorage读取提示显示偏好
  useEffect(() => {
    setIsClient(true); // 标记已在客户端
    const saved = localStorage.getItem('knowledge-map-tips-visible');
    if (saved !== null) {
      setShowTips(saved === 'true');
    }
  }, []);
  
  // 创建引用，用于访问SVG元素或知识导图容器
  const mindMapRef = useRef<HTMLDivElement>(null);
  
  // 处理提示显示状态变化
  const handleToggleTips = (visible: boolean) => {
    setShowTips(visible);
    if (typeof window !== 'undefined') {
      localStorage.setItem('knowledge-map-tips-visible', visible.toString());
    }
  };
  
  // 监听URL参数变化
  useEffect(() => {
    const subject = searchParams.get('subject')
    const search = searchParams.get('search')
    const restoreState = searchParams.get('restoreState')
    const selectedKnowledge = searchParams.get('selectedKnowledge')
    
    if (subject) {
      setSelectedSubject(subject)
      setSelectedSubjectName(getSubjectName(subject))
    }
    
    if (search) {
      // 如果有搜索参数，说明是从AI聊天跳转来的
      setIsFromAIChat(true)
      setSearchTerm(search)
      // 不设置inputValue，保持搜索框为空
    } else {
      setIsFromAIChat(false)
    }
    
    // 如果URL参数包含restoreState，显示恢复提示并设置恢复标志
    if (restoreState === 'true' && !shouldRestoreState) {
      console.log('检测到restoreState参数，设置恢复标志');
      console.log('当前shouldRestoreState状态:', shouldRestoreState);
      setShouldRestoreState(true);
      console.log('已调用setShouldRestoreState(true)');
      
      toast({
        description: `正在恢复知识导图状态...`,
        duration: 2000,
      });
    }
  }, [searchParams, shouldRestoreState, toast])

  // 监控shouldRestoreState状态变化
  useEffect(() => {
    console.log('🔄 shouldRestoreState状态更新为:', shouldRestoreState);
  }, [shouldRestoreState]);
  
  // 缩放处理函数
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0)); // 放大但限制最大值
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3)); // 缩小但限制最小值
  };

  // 输入变化处理函数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 搜索处理函数
  const handleSearch = useCallback((e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e as React.KeyboardEvent).key === 'Enter' || e.type === 'click') {
      setSearchTerm(inputValue);
    }
  }, [inputValue]);
  
  // 回调函数，用于从MindMapViewer获取节点总数
  const handleNodeCountUpdate = (count: number) => {
    setTotalNodeCount(count);
  };

  // 用于触发强制导航的状态
  const [forceNavigationTrigger, setForceNavigationTrigger] = useState<{path: string[], timestamp: number} | null>(null);

  // 导航到指定路径
  const handleNavigateToPath = useCallback((path: string[]) => {
    if (path.length === 0) return;
    
    console.log('🎯 快速导航到路径:', path);
    
    const targetNode = path[path.length - 1];
    
    console.log('🎯 原始路径:', path);
    console.log('🎯 当前学科名:', selectedSubjectName);
    
    // 暂时直接传递原始路径，让DOM导航自己处理
    setForceNavigationTrigger({
      path: path,
      timestamp: Date.now()
    });
    
    // 立即设置搜索词以高亮目标节点
    setSearchTerm(targetNode);
    setInputValue(targetNode);
    console.log('🎨 设置搜索高亮:', targetNode);
    
    // 更新URL参数
    const params = new URLSearchParams(window.location.search);
    params.set('search', targetNode);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
    
    toast({
      description: `正在导航到: ${targetNode}`,
      duration: 2000,
    });
  }, [selectedSubjectName, toast]);

  // 快速搜索功能
  const handleQuickSearch = useCallback((keyword: string) => {
    if (!keyword.trim()) return;
    
    console.log('快速搜索:', keyword);
    setSearchTerm(keyword);
    setInputValue(keyword);
    
    // 更新URL参数
    const params = new URLSearchParams(window.location.search);
    params.set('search', keyword);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  // 切换法条内容展开/收起状态
  const toggleSourceExpansion = (sourceId: string | number) => {
    setExpandedSources(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  // 获取知识点出处的函数
  const fetchKnowledgePointSource = async (knowledgePoint: string, subject: string, parentNodes: string[] = []) => {
    setIsLoadingSource(true);
    
    // 清理关键词函数：去除序号、括号等格式标记
    const cleanKeyword = (keyword: string) => {
      return keyword
        .replace(/[（）()【】\[\]]/g, '') // 去除括号
        .replace(/[0-9]+[、\.]/g, '') // 去除序号
        .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
        .trim()
    };
    
    // 清理知识点名称和父级节点
    const cleanedKnowledgePoint = cleanKeyword(knowledgePoint);
    const cleanedParentNodes = parentNodes.map(cleanKeyword).filter(k => k.length > 0);
    
    try {
      const response = await fetch('/api/knowledge-points/source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          knowledgePoint: cleanedKnowledgePoint,
          subject,
          parentNodes: cleanedParentNodes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSourceData(data.data);
      } else {
        console.error('获取知识点出处失败:', data.message);
        setSourceData({
          knowledgePoint: cleanedKnowledgePoint,
          subject,
          sources: [],
          message: data.message || '获取失败'
        });
      }
    } catch (error) {
      console.error('请求知识点出处失败:', error);
      setSourceData({
        knowledgePoint: cleanedKnowledgePoint,
        subject,
        sources: [],
        message: '网络请求失败'
      });
    } finally {
      setIsLoadingSource(false);
    }
  };

  // 处理节点选中的回调函数
  const handleNodeSelect = (nodeDatum: any, nodeLevel: number, parentNodes: string[] = []) => {
    console.log('🎯 选中节点:', nodeDatum, '层级:', nodeLevel);
    console.log('🔗 父级节点:', parentNodes);
    setSelectedKnowledgePoint(nodeDatum);
    setSelectedNodeLevel(nodeLevel);
    setSelectedParentNodes(parentNodes); // 保存父级节点信息
    
    // 更新当前节点路径
    const fullPath = [selectedSubjectName, ...parentNodes, nodeDatum.name];
    console.log('📍 计算出的完整路径:', fullPath);
    setCurrentNodePath(fullPath);
    
    // 清理之前的解析数据
    setAnalysisData(null);
    setIsLoadingAnalysis(false);
    
    // 自动获取知识点出处
    if (nodeDatum && nodeDatum.name) {
      fetchKnowledgePointSource(nodeDatum.name, selectedSubjectName, parentNodes);
    }
  };

  // 跳转到真题库的函数
  const handleGoToQuestions = async (knowledgePointName: string, subjectFilter?: string) => {
    try {
      // 清理关键词函数：去除序号、括号等格式标记
      const cleanKeyword = (keyword: string) => {
        return keyword
          .replace(/[（）()【】\[\]]/g, '') // 去除括号
          .replace(/[0-9]+[、\.]/g, '') // 去除序号
          .replace(/第[一二三四五六七八九十\d]+[章节条]/g, '') // 去除章节号
          .trim()
      };

      // 关键词：当前知识点 + 其父级节点（不含学科名称）
      const rawKeywords = [selectedKnowledgePoint.name];

      if (selectedKnowledgePoint && sourceData && sourceData.parentNodes) {
        // 过滤掉与当前学科同名的节点，避免"民法"之类进入关键词列表
        rawKeywords.push(...sourceData.parentNodes.filter(node => node !== selectedSubjectName));
      }

      // 清理所有关键词
      const keywords = rawKeywords.map(cleanKeyword).filter(k => k.length > 0);
      
      // 构建 URL 参数
      const params = new URLSearchParams({
        source: 'knowledge-map',
        from: selectedSubjectName, // 添加来源学科信息
        keywords: keywords.join(',')
      });

      // 如果有选中的知识点，添加到参数中（也需要清理）
      if (selectedKnowledgePoint) {
        params.append('knowledgePoint', cleanKeyword(selectedKnowledgePoint.name));
      }

      // 仅在用户显式选择学科过滤时才传递 subject 参数
      if (subjectFilter) {
        params.append('subject', subjectFilter);
      }
      
      // 跳转到真题库页面
      router.push(`/question-bank?${params.toString()}`);
    } catch (error) {
      console.error('关键词提取失败，使用原始关键词:', error);
      // 降级处理：使用原始关键词
      const keywords = [knowledgePointName];
      
      // 构建 URL 参数
      const params = new URLSearchParams({
        source: 'knowledge-map',
        from: selectedSubjectName,
        keywords: keywords.join(',')
      });
      
      // 如果指定了学科过滤，添加学科筛选
      if (subjectFilter) {
        params.append('subject', subjectFilter);
      }
      
      // 跳转到真题库页面
      router.push(`/question-bank?${params.toString()}`);
    }
  };

  // 跳转到AI问答的函数
  const handleGoToAIChat = (question: string) => {
    // 构建关键词，用于知识导图回溯
    const keywords = [selectedKnowledgePoint.name];
    
    // 构建 URL 参数
    const params = new URLSearchParams({
      q: question,
      source: 'knowledge-map',
      subject: selectedSubjectName,
      keywords: keywords.join(',')
    });
    
    // 跳转到AI问答页面
    router.push(`/ai-chat?${params.toString()}`);
  };

  // 生成知识点详解的函数（流式传输）
  const handleGenerateAnalysis = async (knowledgePointName: string) => {
    setIsLoadingAnalysis(true);
    setAnalysisData(null);
    
    try {
      // 检查缓存
      const cacheKey = `analysis_${selectedSubjectName}_${knowledgePointName}`;
      const cachedAnalysis = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      
      if (cachedAnalysis) {
        const parsed = JSON.parse(cachedAnalysis);
        // 检查缓存是否过期（24小时）
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          // 确保缓存数据没有流式状态
          setAnalysisData({...parsed, isStreaming: false});
          setIsLoadingAnalysis(false);
          return;
        }
      }

      // 初始化流式数据
      let streamedContent = '';
      const timestamp = Date.now();
      let updateCounter = 0; // 添加计数器
      
      console.log('🚀 开始流式传输分析:', knowledgePointName);
      console.log('📋 父级节点:', selectedParentNodes);
      
      // 调用流式API
      const response = await fetch('/api/knowledge-points/analysis/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          knowledgePoint: knowledgePointName,
          subject: selectedSubjectName,
          parentNodes: selectedParentNodes
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      console.log('✅ API响应状态正常，开始读取流式数据');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码数据并添加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // 按行处理缓冲区
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后不完整的行
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.substring(6).trim();
            
            if (dataContent === '[DONE]') {
              // 流式传输完成，处理最终内容
              const processedContent = processMarkdownContent(streamedContent);
              const finalResult = {
                knowledgePoint: knowledgePointName,
                subject: selectedSubjectName,
                content: processedContent,
                timestamp,
                isStreaming: false
              };
              
              setAnalysisData(finalResult);
              if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(finalResult));
        }
              return;
            }
            
            if (dataContent) {
              try {
                const jsonData = JSON.parse(dataContent);
                
                // 处理初始化信号
                if (jsonData.type === 'init') {
                  console.log('📡 知识点详解连接已建立');
                  continue; // 修复：使用continue而不是return
                }
                
                if (jsonData.content) {
                  streamedContent += jsonData.content;
                  updateCounter++;
                  console.log('📝 收到内容片段:', jsonData.content.substring(0, 20));
                  
                  // 节流更新：每收到5个片段或每100ms更新一次显示
                  if (updateCounter % 5 === 0 || streamedContent.length % 100 === 0) {
                    const currentProcessed = processMarkdownContent(streamedContent);
                    setAnalysisData({
                      knowledgePoint: knowledgePointName,
                      subject: selectedSubjectName,
                      content: currentProcessed,
                      timestamp,
                      isStreaming: true
                    });
                  }
                }
                if (jsonData.error) {
                  throw new Error(jsonData.error);
                }
              } catch (parseError) {
                console.error('前端解析错误:', parseError, 'dataContent:', dataContent);
              }
            }
          }
        }
      }
      
      // 处理剩余缓冲区数据
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const dataContent = buffer.substring(6).trim();
        if (dataContent && dataContent !== '[DONE]') {
          try {
            const jsonData = JSON.parse(dataContent);
            if (jsonData.content) {
              streamedContent += jsonData.content;
            }
          } catch (parseError) {
            console.error('解析最后缓冲区错误:', parseError);
          }
        }
      }
      
      // 确保在流式传输结束时显示最终内容
      if (streamedContent.trim()) {
        const finalProcessed = processMarkdownContent(streamedContent);
        const finalResult = {
          knowledgePoint: knowledgePointName,
          subject: selectedSubjectName,
          content: finalProcessed,
          timestamp,
          isStreaming: false
        };
        
        setAnalysisData(finalResult);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(finalResult));
        }
        console.log('✅ 流式传输完成，总内容长度:', streamedContent.length);
      }
      
    } catch (error) {
      console.error('生成知识点详解失败:', error);
      setAnalysisData({
        knowledgePoint: knowledgePointName,
        subject: selectedSubjectName,
        content: `<div class="text-red-600 p-3 bg-red-50 rounded border border-red-200">
          <p class="font-medium">生成详解时出现错误</p>
          <p class="text-sm mt-1">${error instanceof Error ? error.message : '网络或服务暂时不可用'}</p>
          <p class="text-xs mt-2 text-gray-600">💡 建议：可以尝试重新生成，或使用对话式分析功能获取更详细的解答</p>
        </div>`,
        timestamp: Date.now()
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Markdown内容处理函数
  const processMarkdownContent = (content: string): string => {
    // 先处理表格：将Markdown表格转换为HTML表格（简单实现，支持 remark-gfm 常见语法）
    const convertTables = (text: string) => {
      const tableRegex = /(\|[^\n]+\|[\t ]*\n\|[\t \-:|]+\|[\t ]*\n(?:\|[^\n]+\|[\t ]*\n?)+)/g;
      return text.replace(tableRegex, (tableMarkdown) => {
        const lines = tableMarkdown.trim().split(/\n+/);
        if (lines.length < 3) return tableMarkdown; // 不是合法表格
        const headerCells = lines[0].split('|').slice(1, -1).map(h => h.trim());
        const rows = lines.slice(2).map(row => row.split('|').slice(1, -1).map(c => c.trim()));
        const thead = `<thead><tr>${headerCells.map(h => `<th class="px-2 py-1 border bg-blue-50 text-gray-700">${h}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td class="px-2 py-1 border">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
        return `<table class="table-auto text-sm border-collapse my-3">${thead}${tbody}</table>`;
      });
    };

    content = convertTables(content);

    let processedContent = content
      // 处理标题
      .replace(/^## (.*?)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-4 text-gray-800 border-b-2 border-blue-200 pb-2 flex items-center"><span class="mr-2">📋</span>$1</h3>')
      .replace(/^### (.*?)$/gm, '<h4 class="text-base font-semibold mt-5 mb-3 text-gray-700 border-l-4 border-blue-400 pl-3 bg-blue-50 py-1">$1</h4>')
      .replace(/^#### (.*?)$/gm, '<h5 class="text-sm font-medium mt-4 mb-2 text-gray-600 border-l-2 border-gray-300 pl-2">$1</h5>')
      // 处理粗体和重点内容
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-700 bg-blue-50 px-1 rounded">$1</strong>')
      // 处理有序列表（更好的样式）
      .replace(/^(\d+\.)\s+(.*?)$/gm, '<li class="mb-2 pl-2 text-gray-700 border-l-2 border-gray-200 hover:border-blue-300 transition-colors"><span class="font-medium text-gray-800">$2</span></li>')
      // 处理无序列表（更好的样式）
      .replace(/^-\s+(.*?)$/gm, '<li class="mb-2 pl-3 text-gray-700 relative before:content-[\'▪\'] before:text-blue-500 before:font-bold before:absolute before:left-0">$1</li>')
      // 处理换行和段落
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed text-sm">')
      .replace(/\n/g, '<br>');

    // 包装在段落中
    processedContent = '<div class="space-y-3"><p class="mb-4 text-gray-700 leading-relaxed text-sm">' + processedContent + '</p></div>';
    
    // 处理列表容器（优化样式）
    processedContent = processedContent
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, '<ul class="space-y-2 my-4 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-300">$&</ul>')
      .replace(/<\/li><li/g, '</li><li');

    return processedContent;
  };

  // 重新生成解析的函数
  const handleRegenerateAnalysis = async (knowledgePointName: string) => {
    // 清除缓存
    const cacheKey = `analysis_${selectedSubjectName}_${knowledgePointName}`;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }
    
    // 重新生成
    await handleGenerateAnalysis(knowledgePointName);
  };

  const subjects = [
    { id: "民法", name: "民法", free: true },
    { id: "刑法", name: "刑法", free: false },
    { id: "民事诉讼法", name: "民事诉讼法", free: false },
    { id: "刑事诉讼法", name: "刑事诉讼法", free: false },
    { id: "行政法", name: "行政法", free: false },
    { id: "商经知", name: "商经知", free: false },
    { id: "三国法", name: "三国法", free: false },
    { id: "理论法", name: "理论法", free: false },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto py-4"> {/* 减少顶部内边距 */}
          <Tabs defaultValue="map" className="mt-0">
            <div className="flex justify-between items-center mb-3"> {/* 修改为两侧对齐 */}
              <TabsList>
                <TabsTrigger value="map" className="custom-tab">
                  知识导图
                </TabsTrigger>
                <TabsTrigger value="subjects" className="custom-tab">
                  学科选择
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="搜索知识点..." 
                    className="w-[200px] pl-8 custom-input" 
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0" 
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  title="强制刷新导图数据"
                >
                  🔄 刷新
                </Button>
              </div>
            </div>
            
            <TabsContent value="map">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-[#E9B949]" />
                  {selectedSubjectName}知识导图
                </h2>
                <div className="flex items-center gap-3">
                  {/* 学习计划提示 */}
                  {plan && plan.subjects_order && plan.subjects_order.includes(selectedSubjectName) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-blue-300 bg-blue-50">
                        <Calendar className="h-3 w-3 mr-1" />
                        计划学习科目
                      </Badge>
                      {!isStudySessionActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            startStudySession(selectedSubjectName, 'knowledge_map');
                            toast({
                              description: `开始学习${selectedSubjectName}，加油！`,
                            });
                          }}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          开始学习
                        </Button>
                      ) : session?.subject === selectedSubjectName && (
                        <Badge variant="secondary">
                          正在学习中...
                        </Badge>
                      )}
                    </div>
                  )}
                  <Badge className="badge-outline">共 {totalNodeCount} 个知识点</Badge>
                </div>
              </div>
              
              {/* 操作提示 */}
              {showTips && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg relative">
                  <button 
                    onClick={() => handleToggleTips(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg font-bold"
                    title="关闭提示"
                  >
                    ×
                  </button>
                  <div className="pr-6">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">💡</span>
                      <strong className="text-blue-800">操作提示</strong>
                    </div>
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                          <span className="text-gray-600">→</span>
                        </div>
                        <span>点击<strong>带数字的蓝色圆圈</strong>展开/折叠下级知识点</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <div className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs flex items-center">
                            民事责任 📖
                          </div>
                          <span className="text-gray-600">→</span>
                        </div>
                        <span>点击<strong>带有📖图标的知识点框</strong>查看详细内容和真题</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <div className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs">
                            最近访问
                          </div>
                          <span className="text-gray-600">→</span>
                        </div>
                        <span>点击<strong>最近访问标签</strong>快速跳转到之前查看的知识点</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 显示提示按钮 */}
              {!showTips && (
                <div className="mb-4">
                  <button 
                    onClick={() => handleToggleTips(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                  >
                    <span>💡</span>
                    <span>显示操作提示</span>
                  </button>
                </div>
              )}

              <MindMapQuickNav
                currentPath={currentNodePath}
                subject={selectedSubjectName}
                onNavigate={handleNavigateToPath}
              />
              <div 
                className="bg-white rounded-lg border p-4 min-h-[700px] relative grid-background" 
                ref={mindMapRef}
                style={{ height: "75vh" }} 
              >
                <MindMapViewer 
                    key={`mindmap-${selectedSubjectName}`} // 添加key确保科目切换时重新创建组件
                    subject={selectedSubjectName} 
                    customZoom={zoomLevel} 
                    searchTerm={searchTerm} 
                    onNodeCountUpdate={handleNodeCountUpdate}
                    onNodeSelect={handleNodeSelect}
                    shouldRestoreState={shouldRestoreState}
                    forceNavigationTrigger={forceNavigationTrigger}
                    onStateRestored={() => {
                      console.log('🎉 状态恢复完成回调被调用');
                      setShouldRestoreState(false);
                      
                      // 清理URL参数
                      const newParams = new URLSearchParams(window.location.search);
                      newParams.delete('restoreState');
                      newParams.delete('selectedKnowledge');
                      const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
                      window.history.replaceState({}, '', newUrl);
                      console.log('状态恢复完成，URL参数已清理');
                    }}
                    onNavigationComplete={() => {
                      // 导航完成后清理触发器
                      setForceNavigationTrigger(null);
                    }}
                  />
                </div>

              {/* 知识点详解面板 */}
              <div style={{ minHeight: isClient && selectedKnowledgePoint ? 'auto' : '0px' }}>
              {isClient && selectedKnowledgePoint && (
                <div className="mt-4">
                  <Tabs defaultValue="questions" className="w-full" onValueChange={(value) => {
                    if (value === 'analysis' && selectedKnowledgePoint && !analysisData && !isLoadingAnalysis) {
                      handleGenerateAnalysis(selectedKnowledgePoint.name);
                    }
                  }}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="questions">历年真题</TabsTrigger>
                      <TabsTrigger value="analysis">知识点详解</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="questions" className="mt-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">
                            点击下方按钮查看与"{selectedKnowledgePoint.name}"相关的历年真题
                          </h4>
                          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                className="primary-button"
                                onClick={() => handleGoToQuestions(selectedKnowledgePoint.name)}
                              >
                                📝 查看相关真题
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleGoToQuestions(selectedKnowledgePoint.name, selectedSubjectName)}
                              >
                                🎯 限定{selectedSubjectName}题目
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="mt-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">知识点详解</h4>
                          {/* 渲染逻辑优化：如果已有 analysisData，无论 isLoadingAnalysis 状态如何，都立即展示内容 */}
                          {!analysisData ? (
                            isLoadingAnalysis ? (
                              <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                  <p className="text-sm text-gray-700">
                                    正在生成"{selectedKnowledgePoint.name}"的详解内容...
                                  </p>
                                </div>
                                <p className="text-xs text-gray-500">
                                  请稍候，AI正在为您生成该知识点的详细解析
                                </p>
                              </div>
                            ) : (
                              <div className="border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded-r">
                                <p className="text-sm text-gray-700 mb-3">
                                  正在为您准备"{selectedKnowledgePoint.name}"的知识点详解...
                                </p>
                                <div className="flex space-x-2">
                                  {/* 对话式深度分析按钮已移除 */}
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                                {analysisData.isStreaming && (
                                  <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-600 shadow-sm">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="font-medium">正在生成中...</span>
                                  </div>
                                )}
                                <div className="p-5">
                                  <div 
                                    className="analysis-content max-w-none"
                                    dangerouslySetInnerHTML={{ __html: analysisData.content }} 
                                    style={{
                                      fontSize: '14px',
                                      lineHeight: '1.7'
                                    }}
                                  />
                                </div>
                              </div>
                              
                              {/* 失败情况下的对话式分析提示已移除 */}
                              
                              <div className="flex justify-between items-center pt-3 border-t">
                                <span className="text-xs text-gray-500">
                                  生成时间：{analysisData.timestamp ? new Date(analysisData.timestamp).toLocaleString() : ''}
                                </span>
                                <div className="flex space-x-2">
                                  {analysisData.content.includes('text-red-600') ? (
                                    // 错误情况下仅显示重试按钮
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleRegenerateAnalysis(selectedKnowledgePoint.name)}
                                    >
                                      🔄 重新生成
                                    </Button>
                                  ) : (
                                    // 成功情况下显示保存笔记、复制和重新生成按钮
                                    <>
                                      <SaveNoteButton
                                        question={`${selectedKnowledgePoint.name}的知识点详解`}
                                        answer={analysisData.content}
                                        chatId={`knowledge-${selectedKnowledgePoint.name}`}
                                        defaultCategory="知识点详解"
                                        preserveHtml={true}
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(analysisData.content.replace(/<[^>]*>/g, ''));
                                          toast({
                                            description: '解析内容已复制到剪贴板',
                                            duration: 2000,
                                          });
                                        }}
                                      >
                                        📋 复制
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleRegenerateAnalysis(selectedKnowledgePoint.name)}
                                      >
                                        🔄 重新生成
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              </div>
              
              {/* 提示用户点击知识点的卡片 */}
              <div style={{ minHeight: isClient && !selectedKnowledgePoint ? 'auto' : '0px' }}>
              {isClient && !selectedKnowledgePoint && (
                <div className="bg-white rounded-lg p-4 card-shadow mt-4">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 mb-2">选择知识点查看详情</h3>
                    <p className="text-sm text-gray-500">
                      点击知识导图中的三级及以后知识点框，即可查看详细的法条依据、相关真题和AI智能解析
                    </p>
                  </div>
                </div>
              )}
              </div>
            </TabsContent>

            <TabsContent value="subjects">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className={`cursor-pointer transition-all feature-card ${
                      selectedSubject === subject.id ? "border-[#E9B949]" : ""
                    }`}
                    onClick={() => {
                      if (!subject.free) {
                        // 非免费科目，触发登录提醒
                        checkAuthOnAction();
                      }
                      setSelectedSubject(subject.id)
                      setSelectedSubjectName(subject.name)
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full bg-[#E9B949]/10 flex items-center justify-center mb-3">
                        <Brain className="h-8 w-8 text-[#E9B949]" />
                      </div>
                      <h3 className="font-semibold mb-1">{subject.name}</h3>
                      {!subject.free && (
                        <Badge className="mt-2 badge-outline">
                          <Lock className="h-3 w-3 mr-1" />
                          会员专享
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
