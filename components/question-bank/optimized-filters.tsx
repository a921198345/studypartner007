// 🚀 优化后的题库筛选组件
// 解决原page.tsx中状态管理混乱的问题

"use client"

import React, { memo, useCallback, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"
import { useDebounce } from '@/hooks/useDebounce'

interface FilterOptions {
  selectedSubject: string
  selectedYears: string[]
  selectedQuestionTypes: string[]
  searchQuery: string
  aiKeywords: string[]
  isFromAiChat: boolean
}

interface FilterProps {
  filters: FilterOptions
  onFiltersChange: (filters: Partial<FilterOptions>) => void
  isLoading?: boolean
  isPremiumUser?: boolean
}

// 🎯 优化：使用memo防止不必要的重渲染
const QuestionFilters = memo<FilterProps>(({ 
  filters, 
  onFiltersChange, 
  isLoading = false,
  isPremiumUser = false 
}) => {
  // 🚀 优化：记忆化静态数据，避免每次渲染重新创建
  const subjects = useMemo(() => [
    { id: "all", name: "全部科目" },
    { id: "民法", name: "民法" },
    { id: "刑法", name: "刑法" },
    { id: "行政法", name: "行政法" },
    { id: "刑事诉讼法", name: "刑事诉讼法" },
    { id: "民事诉讼法", name: "民事诉讼法" },
    { id: "商经知", name: "商经知" },
    { id: "三国法", name: "三国法" },
    { id: "理论法", name: "理论法" },
  ], [])

  const years = useMemo(() => [
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
  ], [])

  const questionTypes = useMemo(() => [
    "全部题型", "单选题", "多选题"
  ], [])

  // 🚀 优化：防抖搜索，减少API调用
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300)

  // 🎯 优化：使用useCallback防止子组件重渲染
  const handleSubjectChange = useCallback((value: string) => {
    onFiltersChange({ selectedSubject: value })
  }, [onFiltersChange])

  const handleYearChange = useCallback((value: string) => {
    const newYears = value === 'all' ? ['all'] : [value]
    onFiltersChange({ selectedYears: newYears })
  }, [onFiltersChange])

  const handleQuestionTypeChange = useCallback((value: string) => {
    const newTypes = value === '全部题型' ? ['全部题型'] : [value]
    onFiltersChange({ selectedQuestionTypes: newTypes })
  }, [onFiltersChange])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onFiltersChange({ 
      searchQuery: value,
      // 🚀 优化：手动搜索时清除AI关键词
      aiKeywords: value ? [] : filters.aiKeywords,
      isFromAiChat: value ? false : filters.isFromAiChat
    })
  }, [onFiltersChange, filters.aiKeywords, filters.isFromAiChat])

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      selectedSubject: 'all',
      selectedYears: ['all'],
      selectedQuestionTypes: ['全部题型'],
      searchQuery: '',
      aiKeywords: [],
      isFromAiChat: false
    })
  }, [onFiltersChange])

  // 🎯 优化：记忆化计算是否有活动筛选
  const hasActiveFilters = useMemo(() => {
    return filters.selectedSubject !== 'all' ||
           !filters.selectedYears.includes('all') ||
           !filters.selectedQuestionTypes.includes('全部题型') ||
           filters.searchQuery ||
           filters.aiKeywords.length > 0
  }, [filters])

  // 🚀 优化：记忆化年份选项，根据会员状态过滤
  const availableYears = useMemo(() => {
    return years.filter(year => 
      year.id === 'all' || 
      year.free || 
      isPremiumUser
    )
  }, [years, isPremiumUser])

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4" />
        <span className="font-medium">筛选条件</span>
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearFilters}
            disabled={isLoading}
          >
            清除筛选
          </Button>
        )}
      </div>

      {/* AI关键词显示 */}
      {filters.isFromAiChat && filters.aiKeywords.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 mb-2">AI智能筛选关键词:</div>
          <div className="flex flex-wrap gap-2">
            {filters.aiKeywords.map((keyword, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索题目内容..."
          value={filters.searchQuery}
          onChange={handleSearchChange}
          disabled={isLoading}
          className="pl-10"
        />
      </div>

      {/* 筛选选项 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 科目选择 */}
        <div>
          <label className="text-sm font-medium mb-2 block">科目</label>
          <Select
            value={filters.selectedSubject}
            onValueChange={handleSubjectChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 年份选择 */}
        <div>
          <label className="text-sm font-medium mb-2 block">年份</label>
          <Select
            value={filters.selectedYears[0] || 'all'}
            onValueChange={handleYearChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem 
                  key={year.id} 
                  value={year.id}
                  disabled={!year.free && !isPremiumUser}
                >
                  <div className="flex items-center gap-2">
                    {year.name}
                    {!year.free && !isPremiumUser && (
                      <span className="text-xs text-orange-500">会员</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 题型选择 */}
        <div>
          <label className="text-sm font-medium mb-2 block">题型</label>
          <Select
            value={filters.selectedQuestionTypes[0] || '全部题型'}
            onValueChange={handleQuestionTypeChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择题型" />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
})

QuestionFilters.displayName = 'QuestionFilters'

export default QuestionFilters