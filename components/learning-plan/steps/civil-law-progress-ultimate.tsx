"use client"

import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
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

interface CivilLawProgressUltimateProps {
  progress: number
  completedTopics?: string[]
  onChange: (progress: number, completedTopics: string[]) => void
}

export function CivilLawProgressUltimate({ 
  progress, 
  completedTopics = [],
  onChange 
}: CivilLawProgressUltimateProps) {
  const [expandedParts, setExpandedParts] = useState<string[]>([]) // 默认不展开任何部分
  const [showStats, setShowStats] = useState(true) // 默认显示详细章节
  
  const stats = getCivilLawStats()
  
  // 如果没有传入具体的已完成专题，根据进度计算
  const actualCompletedTopics = completedTopics.length > 0 
    ? completedTopics 
    : progress > 0 ? getCompletedTopicsByProgress(progress) : []

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

  // 切换专题完成状态（灵活模式，不强制顺序）
  const toggleTopicCompletion = (topicId: string) => {
    const isCompleted = actualCompletedTopics.includes(topicId)
    let newCompletedTopics: string[]
    
    if (isCompleted) {
      // 取消完成：仅移除该专题
      newCompletedTopics = actualCompletedTopics.filter(id => id !== topicId)
    } else {
      // 标记完成：仅添加该专题
      newCompletedTopics = [...actualCompletedTopics, topicId]
    }
    
    const newProgress = calculateProgressFromTopics(newCompletedTopics)
    onChange(newProgress, newCompletedTopics)
  }

  // 切换部分完成状态
  const togglePartCompletion = (partId: string) => {
    const part = CIVIL_LAW_DETAILED_STRUCTURE.find(p => p.id === partId)
    if (!part) return
    
    const partTopicIds = part.topics.map(topic => topic.id)
    const partCompletion = getPartCompletionStatus(part, actualCompletedTopics)
    
    let newCompletedTopics: string[]
    
    if (partCompletion.completedCount === partCompletion.totalCount) {
      // 如果部分全部完成，则取消该部分所有专题
      newCompletedTopics = actualCompletedTopics.filter(id => !partTopicIds.includes(id))
    } else {
      // 如果部分未全部完成，则完成该部分所有专题
      newCompletedTopics = [...new Set([...actualCompletedTopics, ...partTopicIds])]
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
      {/* 统计信息卡片 - 使用原生样式 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            民法学习概览
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalParts}</div>
            <div className="text-sm text-gray-600">学习部分</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalTopics}</div>
            <div className="text-sm text-gray-600">专题总数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
            <div className="text-sm text-gray-600">预计学时</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{actualCompletedTopics.length}</div>
            <div className="text-sm text-gray-600">已完成</div>
          </div>
        </div>
        
        {showStats && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">{stats.difficultyStats.basic || 0}</div>
                <div className="text-xs text-gray-600">基础专题</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">{stats.difficultyStats.intermediate || 0}</div>
                <div className="text-xs text-gray-600">中级专题</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">{stats.difficultyStats.advanced || 0}</div>
                <div className="text-xs text-gray-600">高级专题</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 进度控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium">学习进度</span>
          <Badge variant="outline" className="text-blue-600">
            {progress}%
          </Badge>
        </div>
        
      </div>

      {/* 原生HTML滑块 */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            step="2"
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
        
        <div className="flex justify-between text-xs text-gray-600">
          <span>0%</span>
          <span className="font-medium text-blue-600">
            当前: {progress}% ({actualCompletedTopics.length}/{stats.totalTopics} 专题)
          </span>
          <span>100%</span>
        </div>
      </div>


      {/* 详细专题选择 */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStats(!showStats)}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {showStats ? (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              隐藏专题详情
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-2" />
              查看专题详情
            </>
          )}
        </Button>

        {showStats && (
          <div className="space-y-4">
            {CIVIL_LAW_DETAILED_STRUCTURE.map((part) => {
              const partCompletion = getPartCompletionStatus(part.id, actualCompletedTopics)
              const isPartExpanded = expandedParts.includes(part.id)
              
              return (
                <Card key={part.id} className="border-blue-200 bg-blue-50/30">
                  <CardHeader className="pb-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => togglePartExpansion(part.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* 部分可选框 */}
                        <input
                          type="checkbox"
                          checked={partCompletion.completed === partCompletion.total}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = partCompletion.completed > 0 && partCompletion.completed < partCompletion.total;
                            }
                          }}
                          onChange={(e) => {
                            e.stopPropagation()
                            togglePartCompletion(part.id)
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <CardTitle className="text-sm">{part.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {partCompletion.completed}/{partCompletion.total} 专题已完成
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPartExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isPartExpanded && (
                    <CardContent>
                      <div className="space-y-2">
                        {part.topics.map((topic, index) => {
                          const isCompleted = actualCompletedTopics.includes(topic.id)
                          
                          return (
                            <div 
                              key={topic.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-white/60 ${
                                isCompleted ? 'bg-green-50 border border-green-200' : 'bg-white/30'
                              }`}
                              onClick={() => toggleTopicCompletion(topic.id)}
                            >
                              {/* 专题可选框 */}
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleTopicCompletion(topic.id)
                                }}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              
                              <div className="flex-1">
                                <div className={`text-sm ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                  {topic.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${getDifficultyColor(topic.difficulty)}`}
                                  >
                                    {getDifficultyText(topic.difficulty)}
                                  </Badge>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {topic.estimatedHours}小时
                                  </span>
                                </div>
                              </div>
                              
                              {isCompleted && (
                                <div className="text-green-600">
                                  <Award className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 进度提示 */}
      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded text-center">
        {progress === 0 && "尚未开始学习民法，建议从第一部分「民法总论」开始"}
        {progress > 0 && progress < 100 && 
          `已完成 ${actualCompletedTopics.length} 个专题，当前进度 ${progress}%，预计还需 ${
            CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => 
              sum + part.topics.filter(topic => !actualCompletedTopics.includes(topic.id))
                .reduce((topicSum, topic) => topicSum + topic.estimatedHours, 0), 0
            )
          } 小时完成全部学习`}
        {progress === 100 && "🎉 恭喜！民法全部专题已完成，您已掌握完整的民法知识体系"}
        <div className="mt-2 text-xs text-blue-600">
          💡 提示：可以通过勾选框灵活选择专题，适应不同教材的章节顺序
        </div>
      </div>
    </div>
  )
}