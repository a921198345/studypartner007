"use client"

import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { ScrollArea } from "../../ui/scroll-area"
import { Progress } from "../../ui/progress"
import { BookOpen, Target, ChevronDown, ChevronRight, Clock, Award, BarChart3 } from "lucide-react"
import { useState } from "react"
import { 
  CIVIL_LAW_DETAILED_STRUCTURE, 
  getCivilLawStats,
  getCompletedTopicsByProgress,
  calculateProgressFromTopics,
  getPartCompletionStatus,
  type Part,
  type Topic
} from "../../../lib/constants/civil-law-detailed"

interface CivilLawProgressDetailedProps {
  progress: number
  completedTopics?: string[]
  onChange: (progress: number, completedTopics: string[]) => void
}

export function CivilLawProgressDetailed({ 
  progress, 
  completedTopics = [],
  onChange 
}: CivilLawProgressDetailedProps) {
  const [expandedParts, setExpandedParts] = useState<string[]>([])
  const [showStats, setShowStats] = useState(false)
  
  const stats = getCivilLawStats()
  
  // 如果没有传入具体的已完成专题，根据进度计算
  const actualCompletedTopics = completedTopics.length > 0 
    ? completedTopics 
    : getCompletedTopicsByProgress(progress)

  // 处理进度变化
  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseInt(event.target.value)
    const newCompletedTopics = getCompletedTopicsByProgress(newProgress)
    onChange(newProgress, newCompletedTopics)
  }

  // 快速设置进度
  const quickSetProgress = (targetProgress: number) => {
    const newCompletedTopics = getCompletedTopicsByProgress(targetProgress)
    onChange(targetProgress, newCompletedTopics)
  }

  // 切换专题完成状态
  const toggleTopicCompletion = (topicId: string) => {
    const isCompleted = actualCompletedTopics.includes(topicId)
    let newCompletedTopics: string[]
    
    if (isCompleted) {
      // 取消完成：移除该专题及其后续专题
      const allTopicIds = getAllTopicIdsInOrder()
      const topicIndex = allTopicIds.indexOf(topicId)
      newCompletedTopics = actualCompletedTopics.filter((id, index) => {
        const completedIndex = allTopicIds.indexOf(id)
        return completedIndex < topicIndex
      })
    } else {
      // 标记完成：添加该专题及其前续专题
      const allTopicIds = getAllTopicIdsInOrder()
      const topicIndex = allTopicIds.indexOf(topicId)
      const topicsToAdd = allTopicIds.slice(0, topicIndex + 1)
      newCompletedTopics = [...new Set([...actualCompletedTopics, ...topicsToAdd])]
    }
    
    const newProgress = calculateProgressFromTopics(newCompletedTopics)
    onChange(newProgress, newCompletedTopics)
  }

  // 获取所有专题ID的有序列表
  const getAllTopicIdsInOrder = (): string[] => {
    const allTopicIds: string[] = []
    CIVIL_LAW_DETAILED_STRUCTURE.forEach(part => {
      part.topics.forEach(topic => {
        allTopicIds.push(topic.id)
      })
    })
    return allTopicIds
  }

  // 切换部分展开状态
  const togglePartExpansion = (partId: string) => {
    setExpandedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    )
  }

  // 获取难度颜色
  const getDifficultyColor = (difficulty: Topic['difficulty']) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取难度文本
  const getDifficultyText = (difficulty: Topic['difficulty']) => {
    switch (difficulty) {
      case 'basic': return '基础'
      case 'intermediate': return '中级'
      case 'advanced': return '高级'
      default: return '未知'
    }
  }

  return (
    <div className="space-y-4">
      {/* 统计信息卡片 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              民法学习概览
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? "隐藏详情" : "查看详情"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalParts}</div>
              <div className="text-sm text-muted-foreground">学习部分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalTopics}</div>
              <div className="text-sm text-muted-foreground">专题总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
              <div className="text-sm text-muted-foreground">预计学时</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{actualCompletedTopics.length}</div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </div>
          </div>
          
          {showStats && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">{stats.difficultyStats.basic || 0}</div>
                  <div className="text-xs text-muted-foreground">基础专题</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">{stats.difficultyStats.intermediate || 0}</div>
                  <div className="text-xs text-muted-foreground">中级专题</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{stats.difficultyStats.advanced || 0}</div>
                  <div className="text-xs text-muted-foreground">高级专题</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 进度控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium">学习进度</span>
          <Badge variant="outline" className="text-blue-600">
            {progress}%
          </Badge>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant={progress === 25 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(25)}
          >
            25%
          </Button>
          <Button 
            variant={progress === 50 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(50)}
          >
            50%
          </Button>
          <Button 
            variant={progress === 75 ? "default" : "outline"}
            size="sm" 
            onClick={() => quickSetProgress(75)}
          >
            75%
          </Button>
        </div>
      </div>

      {/* 进度滑块 */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            step="2" // 每2%一个档位，更精确控制
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
            }}
          />
          <style jsx>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              height: 20px;
              width: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            .slider::-moz-range-thumb {
              height: 20px;
              width: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
          `}</style>
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium text-blue-600">
            当前: {progress}% ({actualCompletedTopics.length}/{stats.totalTopics} 专题)
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* 部分详细列表 */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            民法九部分详细进度 ({stats.totalTopics} 个专题)
          </CardTitle>
          <CardDescription className="text-xs">
            点击部分名称展开专题列表，点击专题可切换完成状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {CIVIL_LAW_DETAILED_STRUCTURE.map((part) => {
                const { completed, total, status, completionRate } = getPartCompletionStatus(part.id, actualCompletedTopics)
                const isExpanded = expandedParts.includes(part.id)
                const estimatedHours = part.topics.reduce((sum, topic) => sum + topic.estimatedHours, 0)
                
                return (
                  <div key={part.id} className="border rounded-lg bg-white">
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 h-auto"
                      onClick={() => togglePartExpansion(part.id)}
                    >
                      <div className="flex items-start gap-3 text-left">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          status === 'completed' ? 'border-green-500 bg-green-500 text-white' :
                          status === 'in_progress' ? 'border-blue-500 bg-blue-500 text-white' :
                          'border-gray-300 text-gray-500'
                        }`}>
                          {part.id.split('part')[1]}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{part.title}</div>
                          <div className="text-xs text-muted-foreground mb-1">{part.description}</div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{completed}/{total} 专题</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {estimatedHours}h
                            </span>
                          </div>
                          <Progress value={completionRate} className="mt-2 h-1" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                          }
                        >
                          {completionRate}%
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="space-y-2 border-t pt-3">
                          {part.topics.map((topic, index) => {
                            const isCompleted = actualCompletedTopics.includes(topic.id)
                            const allTopicIds = getAllTopicIdsInOrder()
                            const globalIndex = allTopicIds.indexOf(topic.id)
                            const isCurrent = !isCompleted && globalIndex === actualCompletedTopics.length
                            
                            return (
                              <Button
                                key={topic.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTopicCompletion(topic.id)}
                                className={`w-full justify-start text-left p-3 h-auto ${
                                  isCompleted ? 'bg-green-50 text-green-800 hover:bg-green-100' :
                                  isCurrent ? 'bg-blue-50 text-blue-800 hover:bg-blue-100' :
                                  'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${
                                    isCompleted ? 'border-green-500 bg-green-500 text-white' :
                                    isCurrent ? 'border-blue-500 bg-blue-500 text-white' :
                                    'border-gray-300 text-gray-500'
                                  }`}>
                                    {isCompleted ? '✓' : index + 1}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium ${
                                      isCompleted ? 'line-through' : ''
                                    }`}>
                                      {topic.title}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Badge 
                                        variant="outline" 
                                        className={`${getDifficultyColor(topic.difficulty)} text-xs`}
                                      >
                                        {getDifficultyText(topic.difficulty)}
                                      </Badge>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {topic.estimatedHours}h
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {isCompleted && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                      已完成
                                    </Badge>
                                  )}
                                  {isCurrent && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      进行中
                                    </Badge>
                                  )}
                                </div>
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 进度提示 */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded text-center">
        {progress === 0 && "尚未开始学习民法，建议从第一部分「民法总论」开始"}
        {progress > 0 && progress < 100 && 
          `已完成 ${actualCompletedTopics.length} 个专题，当前进度 ${progress}%，预计还需 ${
            CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => 
              sum + part.topics.filter(topic => !actualCompletedTopics.includes(topic.id))
                .reduce((topicSum, topic) => topicSum + topic.estimatedHours, 0), 0
            )
          } 小时完成全部学习`}
        {progress === 100 && "🎉 恭喜！民法全部专题已完成，您已掌握完整的民法知识体系"}
      </div>
    </div>
  )
}