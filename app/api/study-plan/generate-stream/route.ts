import { NextRequest } from 'next/server'
import { getDeepSeekCompletion } from '@/lib/deepseek'
import fs from 'fs'
import path from 'path'

// 设置能够流式响应的headers
export const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: NextRequest) {
  console.log('开始生成学习计划 - 流式传输')
  
  try {
    const body = await request.json()
    console.log('用户数据:', JSON.stringify(body, null, 2))

    // 构建新的智能提示词
    const prompt = buildIntelligentPrompt(body)
    
    // 创建一个可读流，用于流式传输响应
    const encoder = new TextEncoder()
    let controllerClosed = false
    
    const stream = new ReadableStream({
      async start(controller) {
        // 安全的enqueue函数
        const safeEnqueue = (data: string) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (error) {
              console.error('流写入错误:', error)
            }
          }
        }
        
        try {
          // 发送初始化事件
          safeEnqueue(`data: ${JSON.stringify({
            type: 'init',
            message: '开始生成个性化学习计划...'
          })}\n\n`)
          
          // 调用 AI 生成计划
          const aiResponse = await getDeepSeekCompletion(prompt)
          console.log('AI响应长度:', aiResponse.length)
          
          // 解析AI响应
          const parsedPlan = parseAIResponse(aiResponse, body)
          
          // 分段流式发送内容
          const sections = ['overallStrategy', 'dailyPlan', 'weeklyPlan']
          
          for (const section of sections) {
            const content = parsedPlan[section]
            if (content) {
              // 将内容分块发送
              for (let i = 0; i < content.length; i += 10) {
                const chunk = content.slice(i, i + 10)
                safeEnqueue(`data: ${JSON.stringify({
                  type: 'content',
                  section: section,
                  content: chunk
                })}\n\n`)
                await new Promise(resolve => setTimeout(resolve, 20))
              }
            }
          }
          
          // 发送完成事件
          safeEnqueue(`data: ${JSON.stringify({
            type: 'complete',
            plan: parsedPlan
          })}\n\n`)
          
        } catch (error) {
          console.error('生成学习计划失败:', error)
          
          // 发送错误事件
          safeEnqueue(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || '生成学习计划失败'
          })}\n\n`)
        } finally {
          controllerClosed = true
          controller.close()
        }
      },
      
      cancel() {
        controllerClosed = true
      }
    })
    
    // 返回流式响应
    return new Response(stream, { headers })
    
  } catch (error) {
    console.error('生成学习计划失败:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || '生成学习计划失败'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// 构建智能提示词
function buildIntelligentPrompt(formData: any) {
  const { subject_progress, subject_order, study_schedule, exam_date, calculated_total_hours, custom_notes } = formData
  
  // 计算当前时间和星期
  const today = new Date()
  const examDay = new Date(exam_date)
  const daysToExam = Math.max(0, Math.ceil((examDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  
  // 获取当前星期几（0=周日，1=周一...6=周六）
  const currentDayOfWeek = today.getDay()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const currentWeekday = weekdays[currentDayOfWeek]
  
  // 计算本周剩余学习天数（假设周日不学习，周一到周六学习）
  const remainingDaysThisWeek = currentDayOfWeek === 0 ? 0 : (6 - currentDayOfWeek + 1)
  
  // 获取用户各科目进度
  let subjectProgressData = []
  if (Array.isArray(subject_progress)) {
    subjectProgressData = subject_progress
  } else if (subject_progress && typeof subject_progress === 'object') {
    // 将对象转换为数组格式
    subjectProgressData = Object.entries(subject_progress).map(([subject, progress]) => ({
      subject,
      progress: typeof progress === 'number' ? progress : 0
    }))
  }
  
  // 计算智能学习强度
  const calculateStudyIntensity = () => {
    const totalNeededHours = calculated_total_hours || 600 // 默认600小时
    const availableDays = Math.max(daysToExam - 10, 30) // 预留10天应急时间
    const dailyNeededHours = totalNeededHours / availableDays
    
    // 根据需要的每日时长确定强度等级
    if (dailyNeededHours <= 7) return { level: '适中', hours: Math.max(dailyNeededHours, 7) }
    if (dailyNeededHours <= 9) return { level: '冲刺', hours: dailyNeededHours }
    return { level: '高强度冲刺', hours: Math.min(dailyNeededHours, 12) }
  }
  
  const studyIntensity = calculateStudyIntensity()
  const optimizedDailyHours = studyIntensity.hours

  // 读取提示词模板
  const designPath = path.join(process.cwd(), 'design')
  
  let overallPrompt = ''
  let weeklyPrompt = ''
  let dailyPrompt = ''
  
  try {
    // 读取提示词文件
    overallPrompt = fs.readFileSync(path.join(designPath, 'study-plan-overall-prompt.md'), 'utf8')
    weeklyPrompt = fs.readFileSync(path.join(designPath, 'study-plan-weekly-prompt.md'), 'utf8')
    dailyPrompt = fs.readFileSync(path.join(designPath, 'study-plan-daily-prompt.md'), 'utf8')
  } catch (error) {
    console.error('读取提示词文件失败:', error)
    // 使用内置的简化提示词
  }

  // 应用新的智能提示词模板
  const prompt = `你是一名专业的法考学习规划师，请根据以下信息，为用户制定【法考学习总体规划】、【本周具体学习计划】、【今日任务清单】。

## 用户信息分析
- 昵称：${formData.nickname || '学员'}
- 距离法考天数：${daysToExam} 天
- 用户可学习天数：${Math.max(daysToExam - 10, 30)} 天（已预留10天应急时间）
- 用户期望学习进度：${studyIntensity.level}
- 用户选择的科目顺序：${JSON.stringify(subject_order.map((s: any) => s.subject))}
- 用户每天可投入学习时长：${optimizedDailyHours.toFixed(1)} 小时
- **当前日期**：${today.toLocaleDateString()} ${currentWeekday}
- **本周剩余学习天数**：${remainingDaysThisWeek}天
- **用户各科目当前进度**：${JSON.stringify(subjectProgressData)}

## 法考学习强度标准
1. **学习强度等级**：
   - 适中：每天7-8小时，总计650-750小时  
   - 冲刺：每天8-10小时，总计800-1000小时
   - 高强度冲刺：每天10-12小时，总计1000+小时

2. **智能时长计算**：
   - 根据距离考试天数和用户期望，建议每日学习时长：${optimizedDailyHours.toFixed(1)}小时
   - 学习强度等级：${studyIntensity.level}

## 智能进度衔接策略
**关键：必须根据用户各科目当前进度，智能安排从合适章节开始学习**

### 民法起始章节映射：
- 0-20%进度：民法总则编第一章自然人
- 21-40%进度：民法总则编第四章民事法律行为
- 41-60%进度：物权编第二章物权的设立变更转让和消灭
- 61-80%进度：合同编第三章合同的履行
- 81-95%进度：侵权责任编第二章损害赔偿
- 96-100%进度：民法主观题答题技巧专训

### 刑法起始章节映射：
- 0-20%进度：刑法总则第一章刑法的任务基本原则和适用范围
- 21-40%进度：刑法总则第三章犯罪
- 41-60%进度：刑法总则第四章刑罚
- 61-80%进度：刑法分则第二章危害公共安全罪
- 81-95%进度：刑法分则第六章妨害社会管理秩序罪
- 96-100%进度：刑法主观题案例分析专训

## 当前时间智能适配
**关键：今天是${currentWeekday}，本周计划必须从今天开始，而不是从周一开始**
- 本周剩余学习天数：${remainingDaysThisWeek}天
- 本周任务量调整比例：${(remainingDaysThisWeek / 6 * 100).toFixed(0)}%

## 输出要求

请按以下格式严格输出三个部分：

### 总体规划思路

基于用户的实际进度和时间情况，分析：
1. **时间与强度分析**：${daysToExam}天，每日${optimizedDailyHours.toFixed(1)}小时，强度等级${studyIntensity.level}
2. **智能进度衔接计划**：根据各科目当前进度，确定合适的起始章节
3. **阶段性学习节奏**：不从第一章开始，直击当前进度对应的重点章节

### 今日学习计划

制定今天（${currentWeekday}）的具体任务清单：
- **任务与时间完全融合**：每个任务包含具体时长，如"9:00-10:30 学习刑法总则第三章犯罪构成（90分钟）"
- **具体可执行任务**：明确学什么、做什么练习、达到什么标准
- **包含自测环节**：每个学习任务都有对应的验证方式
- **总时长**：${optimizedDailyHours.toFixed(1)}小时

### 本周学习计划

制定本周（从${currentWeekday}开始）的学习安排：
- **本周剩余时间调整**：因为今天是${currentWeekday}，只剩${remainingDaysThisWeek}天学习时间
- **具体章节安排**：根据用户进度确定要学习的具体章节
- **每日详细安排表格**：日期、星期、学习任务、时长分配、重点内容

> 重要：严格按照用户的实际进度安排章节，不要让民法76%进度的用户从第一章开始学！`

  return prompt
}

// 解析AI响应
function parseAIResponse(aiResponse: string, formData: any) {
  const today = new Date()
  
  // 更精确的正则表达式匹配三个主要部分
  const overallStrategyMatch = aiResponse.match(/(?:###?\s*)?(?:\*\*)?总体规划思路(?:\*\*)?\s*\n([\s\S]*?)(?=(?:###?\s*)?(?:\*\*)?今日学习计划|$)/i)
  const dailyPlanMatch = aiResponse.match(/(?:###?\s*)?(?:\*\*)?今日学习计划(?:\*\*)?\s*\n([\s\S]*?)(?=(?:###?\s*)?(?:\*\*)?本周学习计划|$)/i)
  const weeklyPlanMatch = aiResponse.match(/(?:###?\s*)?(?:\*\*)?本周学习计划(?:\*\*)?\s*\n([\s\S]*?)$/i)

  // 提取内容并清理
  let overallStrategy = overallStrategyMatch ? overallStrategyMatch[1].trim() : ''
  let dailyPlan = dailyPlanMatch ? dailyPlanMatch[1].trim() : ''
  let weeklyPlan = weeklyPlanMatch ? weeklyPlanMatch[1].trim() : ''

  // 如果没有匹配到内容，提供智能默认内容
  if (!overallStrategy) {
    overallStrategy = generateDefaultOverallStrategy(formData)
  }
  
  if (!dailyPlan) {
    dailyPlan = generateDefaultDailyPlan(formData)
  }
  
  if (!weeklyPlan) {
    weeklyPlan = generateDefaultWeeklyPlan(formData)
  }

  return {
    overallStrategy,
    dailyPlan, 
    weeklyPlan,
    generatedAt: today.toISOString(),
    settings: {
      dailyHours: Math.round(calculateOptimizedDailyHours(formData) * 10) / 10,
      weeklyDays: formData.study_schedule.weekly_days,
      subjects: formData.subject_order.map((item: any) => item.subject)
    }
  }
}

// 计算优化的每日学习时长
function calculateOptimizedDailyHours(formData: any) {
  const { exam_date, calculated_total_hours } = formData
  const today = new Date()
  const examDay = new Date(exam_date)
  const daysToExam = Math.max(0, Math.ceil((examDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  
  const totalNeededHours = calculated_total_hours || 600
  const availableDays = Math.max(daysToExam - 10, 30)
  const dailyNeededHours = totalNeededHours / availableDays
  
  return Math.max(Math.min(dailyNeededHours, 12), 7) // 限制在7-12小时之间
}

// 根据进度智能选择具体章节
function getSpecificChapterByProgress(subject: string, progress: number) {
  if (subject === '民法') {
    // 根据真实的民法章节结构
    if (progress === 0) return '（5）总则编 - 民法基本原则'
    if (progress <= 10) return '（5）总则编 - 民事主体'
    if (progress <= 20) return '（5）总则编 - 民事法律行为'
    if (progress <= 30) return '（5）总则编 - 代理'
    if (progress <= 40) return '（9）物权 - 物权概述'
    if (progress <= 50) return '（8）担保物权 - 抵押权'
    if (progress <= 60) return '（10）债法总则 - 债的履行'
    if (progress <= 70) return '（19）合同通则 - 合同的订立'
    if (progress <= 80) return '（19）合同通则 - 合同的履行'
    if (progress <= 90) return '（31）人身权 - 人格权'
    if (progress <= 95) return '（35）侵权责任 - 侵权责任的认定'
    return '民法主观题答题技巧专训'
  } else if (subject === '刑法') {
    if (progress === 0) return '刑法总则 - 刑法基本原则'
    if (progress <= 15) return '刑法总则 - 犯罪构成要件'
    if (progress <= 30) return '刑法总则 - 正当防卫与紧急避险'
    if (progress <= 45) return '刑法总则 - 共同犯罪'
    if (progress <= 60) return '刑法总则 - 刑罚种类与量刑'
    if (progress <= 75) return '刑法分则 - 危害公共安全罪'
    if (progress <= 85) return '刑法分则 - 侵犯财产罪'
    if (progress <= 95) return '刑法分则 - 妨害社会管理秩序罪'
    return '刑法主观题案例分析专训'
  }
  
  // 默认返回第一章
  const defaultChapters: { [key: string]: string } = {
    '行政法': '行政法基本理论 - 行政法概述',
    '民事诉讼法': '民诉总则 - 基本原则与管辖',
    '刑事诉讼法': '刑诉总则 - 任务与基本原则',
    '商经法': '公司法 - 公司设立与组织机构',
    '理论法': '法理学 - 法的概念与本质',
    '三国法': '国际公法 - 国际法主体'
  }
  
  return defaultChapters[subject] || '（5）总则编 - 民法基本原则'
}

// 保留原函数，避免其他地方调用出错
function getChapterByProgress(subject: string, progress: number) {
  return getSpecificChapterByProgress(subject, progress)
}

// 生成默认总体策略
function generateDefaultOverallStrategy(formData: any) {
  const dailyHours = calculateOptimizedDailyHours(formData)
  const firstSubject = formData.subject_order[0]?.subject || '民法'
  
  // 获取该科目的当前进度
  let currentProgress = 0
  if (Array.isArray(formData.subject_progress)) {
    const subjectProgress = formData.subject_progress.find((item: any) => item.subject === firstSubject)
    currentProgress = subjectProgress?.progress || 0
  } else if (formData.subject_progress && typeof formData.subject_progress === 'object') {
    currentProgress = formData.subject_progress[firstSubject] || 0
  }
  
  const currentChapter = getSpecificChapterByProgress(firstSubject, currentProgress)
  
  return `🎯 法考学习总体策略

📊 **时间与强度分析**：
• 建议每日学习时长：${dailyHours.toFixed(1)}小时左右
• 学习强度等级：${dailyHours >= 10 ? '高强度冲刺' : dailyHours >= 8 ? '冲刺' : '适中'}
• 时间评估：${dailyHours >= 10 ? '时间紧张，需要高强度学习' : '时间相对充裕，稳步推进'}

🎯 **智能进度衔接计划**：
• 当前重点科目：${firstSubject}（当前进度：${currentProgress}%）
• 本阶段主攻章节：${currentChapter}
• 学习策略：根据您的实际进度，从${currentChapter}开始学习，不重复已掌握内容
• 主客观题分配：客观题为主轴，根据知识点涉及程度有选择性地安排主观题

📚 **科学学习策略**：
• 章节化学习：严格按照具体章节进行系统学习
• 任务精简：每日3-5个具体可执行任务
• 客观题优先：先掌握客观题知识点，再考虑主观题训练
• 知识体系化：通过知识导图理解章节在整体框架中的位置`
}

// 生成默认今日计划  
function generateDefaultDailyPlan(formData: any) {
  const dailyHours = calculateOptimizedDailyHours(formData)
  const firstSubject = formData.subject_order[0]?.subject || '民法'
  
  // 处理 subject_progress 可能是对象或数组的情况
  let progress = 0
  if (Array.isArray(formData.subject_progress)) {
    const subjectProgress = formData.subject_progress.find((item: any) => item.subject === firstSubject)
    progress = subjectProgress?.progress || 0
  } else if (formData.subject_progress && typeof formData.subject_progress === 'object') {
    progress = formData.subject_progress[firstSubject] || 0
  }
  
  const chapter = getSpecificChapterByProgress(firstSubject, progress)
  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const currentWeekday = weekdays[today.getDay()]
  
  return `📋 今日学习任务清单 - ${today.toLocaleDateString()} ${currentWeekday}

🎯 **今日核心目标**：
- 主攻内容：${chapter}
- 掌握标准：理解核心概念和重要法条
- 练习目标：完成20-30道相关客观题，正确率达到70%以上
- 建议学习时长：${dailyHours.toFixed(1)}小时左右

📋 **具体任务安排**：

**上午时段（高效学习期）**
✅ **任务1：学习${chapter}（约90分钟）**
- 📖 学习内容：核心概念、重要法条、适用条件
- 🎯 学习目标：完全理解章节核心内容
- 📝 自测要求：能够准确复述重要概念

💤 **休息：15分钟**

✅ **任务2：真题练习（约60分钟）**
- 📝 练习内容：${chapter}相关客观题专项训练20道
- 🎯 练习目标：正确率≥70%
- 📊 重点关注：错题分析和知识点回顾

**下午时段（巩固应用期）**
✅ **任务3：深度理解（约90分钟）**
- 📖 学习内容：重难点法条详解
- 🎯 学习目标：能够应用到具体案例
- 📝 自测要求：完成案例分析练习

**晚上时段（复习总结期）**
✅ **任务4：知识导图整理（约30分钟）**
- 🗺️ 整理内容：今日学习的知识点
- 🎯 整理目标：形成完整知识框架
- 📱 使用工具：网站知识导图功能

✅ **任务5：AI问答检验（约30分钟）**
- 🤖 检验内容：重难点概念和法条适用
- 🎯 检验目标：确保理解准确无误
- 📱 使用工具：网站法考问答功能`
}

// 生成默认本周计划
function generateDefaultWeeklyPlan(formData: any) {
  const dailyHours = calculateOptimizedDailyHours(formData)
  const firstSubject = formData.subject_order[0]?.subject || '民法'
  
  // 获取该科目的当前进度
  let currentProgress = 0
  if (Array.isArray(formData.subject_progress)) {
    const subjectProgress = formData.subject_progress.find((item: any) => item.subject === firstSubject)
    currentProgress = subjectProgress?.progress || 0
  } else if (formData.subject_progress && typeof formData.subject_progress === 'object') {
    currentProgress = formData.subject_progress[firstSubject] || 0
  }
  
  const currentChapter = getSpecificChapterByProgress(firstSubject, currentProgress)
  
  const today = new Date()
  const currentDayOfWeek = today.getDay()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const currentWeekday = weekdays[currentDayOfWeek]
  const remainingDaysThisWeek = currentDayOfWeek === 0 ? 0 : (6 - currentDayOfWeek + 1)
  
  // 根据当前进度计算本周学习章节
  const weeklyChapters = generateWeeklyChapterPlan(firstSubject, currentProgress, remainingDaysThisWeek)
  
  return `📅 本周学习计划（从${currentWeekday}开始）

📋 **本周概览**：
- 本周主攻科目：${firstSubject}（当前进度：${currentProgress}%）
- 本周剩余学习天数：${remainingDaysThisWeek}天（从${currentWeekday}开始）
- 每日学习时长：${dailyHours.toFixed(1)}小时左右
- 本周总学习时长：${(dailyHours * remainingDaysThisWeek).toFixed(1)}小时

🎯 **本周核心学习目标**：
1. 系统掌握${currentChapter}及后续章节
2. 完成相关客观题练习，正确率75%以上
3. 针对涉及主观题的知识点进行案例分析
4. 通过知识导图梳理本周学习内容

📊 **本周详细安排**：

| 日期 | 星期 | 学习任务 | 时长分配 | 重点内容 |
|------|------|---------|---------|---------|
${weeklyChapters.map((chapter, i) => {
  const dayIndex = currentDayOfWeek + i
  const dayName = weekdays[dayIndex > 6 ? dayIndex - 7 : dayIndex]
  const date = new Date(today)
  date.setDate(today.getDate() + i)
  return `| ${date.getMonth() + 1}/${date.getDate()} | ${dayName} | ${firstSubject}学习 | ${dailyHours.toFixed(1)}小时 | ${chapter} |`
}).join('\n')}

🔍 **每日学习流程**（标准${dailyHours.toFixed(1)}小时）：
1. **基础学习**（约${Math.round(dailyHours * 60 * 0.4)}分钟）：教材精读，掌握核心概念和法条
2. **客观题练习**（约${Math.round(dailyHours * 60 * 0.3)}分钟）：专项真题训练，应用验证
3. **主观题判断与训练**（约${Math.round(dailyHours * 60 * 0.15)}分钟）：检查是否涉及主观题，有则进行案例分析
4. **总结归纳**（约${Math.round(dailyHours * 60 * 0.15)}分钟）：知识导图整理，AI问答检验

📈 **网站工具使用计划**：
- **知识导图**：每日必用，查看${firstSubject}的具体章节结构
- **真题系统**：优先练习客观题，每天不少于30道
- **法考问答**：针对重难点和主观题要点进行深度理解
- **进度跟踪**：每日更新学习进度，及时调整计划`
}

// 生成本周章节计划
function generateWeeklyChapterPlan(subject: string, currentProgress: number, days: number): string[] {
  const chapters: string[] = []
  let progress = currentProgress
  
  for (let i = 0; i < days; i++) {
    chapters.push(getSpecificChapterByProgress(subject, progress))
    // 每天增加一定进度
    progress += Math.min(10, (100 - progress) / (days * 2))
  }
  
  return chapters
}