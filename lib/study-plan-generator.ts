// 学习计划生成器

import { StudyPlanAIService } from './study-plan-ai-service'

interface UserData {
  user_id: string
  subjects_progress: Array<{
    subject: string
    status: 'completed' | 'in_progress' | 'not_started'
    progress: number
    chapters_completed: number
    total_chapters: number
  }>
  ordered_subjects: string[]
  schedule: {
    daily_hours: number
    weekly_days: number
    rest_days: number
    preferred_times?: string[]
    break_frequency?: number
  }
  order_method: 'ai' | 'manual'
  custom_note?: string
  learning_style?: string
  difficulty_preference?: string
  review_frequency?: string
}

interface GeneratedPlan {
  overall_strategy: string
  daily_plan: string
  weekly_plan: string
  metadata: {
    generated_at: string
    total_hours: number
    estimated_duration_weeks: number
    key_milestones: string[]
  }
}

export class StudyPlanGenerator {
  private aiService: StudyPlanAIService

  constructor() {
    this.aiService = new StudyPlanAIService()
  }

  // 生成三级学习计划
  async generateStudyPlan(userData: UserData): Promise<GeneratedPlan> {
    // 计算总学习时长和预估完成时间
    const totalHours = this.calculateTotalStudyHours(userData)
    const weeklyHours = userData.schedule.daily_hours * userData.schedule.weekly_days
    const estimatedWeeks = Math.ceil(totalHours / weeklyHours)

    // 生成个性化的三级Prompt
    const prompts = await this.generatePersonalizedPrompt(userData, totalHours, estimatedWeeks)

    // 这里应该调用AI服务，但为了演示，我们先返回模拟数据
    // const overallStrategy = await this.aiService.generateOverallPlan(prompts.overallPrompt)
    // const weeklyPlan = await this.aiService.generateWeeklyPlan(prompts.weeklyPrompt)
    // const dailyPlan = await this.aiService.generateDailyPlan(prompts.dailyPrompt)
    
    // 模拟AI响应
    const plan = this.generateMockPlan(userData, totalHours, estimatedWeeks)

    return plan
  }

  // 读取提示词模板文件
  private async readPromptTemplate(filename: string): Promise<string> {
    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'design', filename)
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error(`Failed to read prompt template: ${filename}`, error)
      return ''
    }
  }

  // 生成个性化的三级计划Prompt
  private async generatePersonalizedPrompt(
    userData: UserData,
    totalHours: number,
    estimatedWeeks: number
  ): Promise<{
    overallPrompt: string,
    weeklyPrompt: string,
    dailyPrompt: string
  }> {
    const { subjects_progress, ordered_subjects, schedule, custom_note } = userData

    // 计算距离法考天数（模拟，实际应该从配置获取）
    const examDate = new Date('2025-09-20')
    const today = new Date()
    const daysToExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // 计算可用学习天数
    const availableDays = daysToExam - 7 // 预留7天自由安排
    
    // 计算每日必要学习时长
    const dailyRequiredHours = (totalHours / availableDays).toFixed(1)
    
    // 确定学习进度类型
    let learningPace = '适中'
    if (totalHours <= 300) learningPace = '保底'
    else if (totalHours >= 600) learningPace = '冲刺'

    // 分析当前学习状态
    const completedSubjects = subjects_progress.filter(s => s.status === 'completed').map(s => s.subject)
    const inProgressSubjects = subjects_progress.filter(s => s.status === 'in_progress')
    const notStartedSubjects = subjects_progress.filter(s => s.status === 'not_started').map(s => s.subject)

    // 读取提示词模板
    const overallTemplate = await this.readPromptTemplate('study-plan-overall-prompt.md')
    const weeklyTemplate = await this.readPromptTemplate('study-plan-weekly-prompt.md')
    const dailyTemplate = await this.readPromptTemplate('study-plan-daily-prompt.md')

    // 构建用户信息替换参数
    const userInfo = {
      '[用户昵称]': userData.user_id,
      '[距离法考天数]': daysToExam.toString(),
      '[可学习天数]': availableDays.toString(),
      '[可用学习天数]': availableDays.toString(),
      '[保底/适中/冲刺]': learningPace,
      '[科目顺序数组]': JSON.stringify(ordered_subjects),
      '[用户单日可用时长]': schedule.daily_hours.toString(),
      '[今日日期]': today.toLocaleDateString('zh-CN'),
      '[今天是星期几]': today.getDay().toString(),
      '[距离法考周数]': Math.ceil(daysToExam / 7).toString(),
      '[每日必要学习时长]': dailyRequiredHours,
      '[本周剩余天数]': (7 - today.getDay()).toString()
    }

    // 替换模板中的占位符
    const replaceTemplate = (template: string, info: Record<string, string>): string => {
      let result = template
      Object.entries(info).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        result = result.replace(regex, value)
      })
      return result
    }

    return {
      overallPrompt: replaceTemplate(overallTemplate, userInfo),
      weeklyPrompt: replaceTemplate(weeklyTemplate, userInfo),
      dailyPrompt: replaceTemplate(dailyTemplate, userInfo)
    }
  }

  // 计算总学习时长
  private calculateTotalStudyHours(userData: UserData): number {
    let totalHours = 0

    userData.subjects_progress.forEach(subject => {
      if (subject.status === 'completed') {
        // 已完成科目预留20%时间复习
        totalHours += 30 * 0.2
      } else if (subject.status === 'in_progress') {
        // 进行中科目按剩余进度计算
        const remainingProgress = 100 - subject.progress
        totalHours += (remainingProgress / 100) * 60 // 假设每科目平均60小时
      } else {
        // 未开始科目按完整时间计算
        totalHours += 60
      }
    })

    return Math.round(totalHours)
  }

  // 生成模拟的学习计划（实际应调用AI服务）
  private generateMockPlan(
    userData: UserData,
    totalHours: number,
    estimatedWeeks: number
  ): GeneratedPlan {
    const currentSubject = userData.ordered_subjects[0]
    const dailyHours = userData.schedule.daily_hours

    return {
      overall_strategy: `
## 总体规划思路

### 📊 当前学习状态分析

**优势分析：**
- 已有 ${userData.subjects_progress.filter(s => s.status === 'completed').length} 门科目完成，基础扎实
- 每日可投入 ${dailyHours} 小时学习时间，时间充裕
- 学习计划清晰，科目顺序已确定

**待提升点：**
- 还有 ${userData.subjects_progress.filter(s => s.status !== 'completed').length} 门科目需要学习
- 需要平衡新知识学习与已学内容复习

### 🎯 阶段性目标设定

**第一阶段（1-4周）：** 基础夯实期
- 完成当前进行中科目的剩余内容
- 建立完整的知识框架体系

**第二阶段（5-8周）：** 重点突破期
- 攻克${userData.ordered_subjects.slice(0, 3).join('、')}等核心科目
- 深入理解重难点知识

**第三阶段（9-${estimatedWeeks}周）：** 综合提升期
- 完成所有科目的系统学习
- 强化薄弱环节，查漏补缺

### 📚 核心学习策略

1. **主动学习法**：结合AI问答功能，及时解决疑惑
2. **知识体系化**：使用知识导图梳理各科目框架
3. **即学即练**：每学完一个章节立即做配套练习
4. **定期复习**：采用艾宾浩斯记忆曲线安排复习

### 🏆 关键里程碑

- 第2周：完成${currentSubject}剩余章节
- 第4周：通过阶段性模拟测试（目标80分）
- 第8周：完成核心科目学习
- 第${estimatedWeeks}周：全科目学习完成，进入总复习阶段
`,

      daily_plan: `📅 2025/6/22 学习计划 (总时长3小时)

🦉 学前准备 (5分钟)
📖 知识导图预习：浏览"刑法"相关知识框架
🔍 关联知识：查看与其他知识点的关系
💡 学习目标：深入理解今日学习内容

📖📺 教材+视频同步学习 (117分钟)
• 配套学习：刑法专题视频 + 教材对应章节
• 学习方式：边看视频边对照教材，同步理解
• AI问答支持：遇到疑难概念可随时提问深度解析
• 笔记记录：详细记录重要法条、案例和知识要点

✏️ 即学即练 (45分钟)
📝 教材配套练习：完成相应章节课后习题
📊 历年真题练习：选择相关真题进行训练
⭐ 错题收藏：将做错的重要题目加入错题集

🔄 学习总结 (10分钟)
📝 笔记整理：整理今日学习的核心要点
📊 知识关联：通过知识导图查看今日内容与其他知识点的联系
`,

      weekly_plan: `🗓️ 本周学习计划

🎯 本周目标
- **进度**：完成刑法总则（犯罪构成、犯罪形态） ，民法合同编 （要约与承诺）。
- **提升**：整体进度从3%→10%。
- **掌握点**：犯罪构成四要件、合同成立要件。

#### 📚 每日学习安排

| 日期 | 核心任务 | 工具应用建议 |
|------|----------|-------------|
| **周一** | 刑法犯罪构成 | 导图预习"犯罪构成"知识框架 | 重点掌握：客观要件、主观要件
| **周二** | 刑法违法阻却事由 | AI提问"正当防卫限度条件" | 深度解析：正当防卫与紧急避险
| **周三** | 刑法犯罪形态 （未遂/中止） | 真题练习：近3年未遂判定案例 | 
| **周四** | 民法合同编 （要约与承诺） | 导图对比"要约vs要约邀请" | 
| **周五** | 民法合同编 （要约与承诺） | 导图对比"要约vs要约邀请" | 

#### 🎯 周末巩固复习
- 📖 导图复习：填充刑法总则细节到知识框架
- 📝 真题集中练习：完成刑法总则15题+民法合同10题。
- 📓 笔记整理：合并刑法"犯罪形态"笔记，添加判例要点。
- 📊 错题专项：重做错题专项，重点回顾易错点

#### 💡 学习要点提醒
1. **导图技巧**：右键点击导图节点"展开相似条例"，快速关联知识点。
2. **AI深度使用**：输入"请用生活案例解释刑事责任能力"，获取通俗解析。
3. **真题策略**：优先练习近5年真题，按"错误率>50%"筛选重点。
`,

      metadata: {
        generated_at: new Date().toISOString(),
        total_hours: totalHours,
        estimated_duration_weeks: estimatedWeeks,
        key_milestones: [
          `第2周：完成${currentSubject}学习`,
          `第${Math.floor(estimatedWeeks / 3)}周：完成1/3进度`,
          `第${Math.floor(estimatedWeeks * 2 / 3)}周：完成2/3进度`,
          `第${estimatedWeeks}周：全部科目学习完成`
        ]
      }
    }
  }

  // 基于用户偏好个性化Prompt
  enhancePromptWithPreferences(
    basePrompt: string,
    preferences: {
      learning_style?: string
      difficulty_preference?: string
      review_frequency?: string
    }
  ): string {
    const enhancements: string[] = []

    if (preferences.learning_style) {
      const styleMap: Record<string, string> = {
        'visual': '请多使用图表、流程图等视觉化方式呈现学习内容',
        'auditory': '建议配合音频材料和讲解视频进行学习',
        'kinesthetic': '强调实践练习和案例分析的重要性',
        'reading': '推荐深度阅读教材和补充材料'
      }
      enhancements.push(styleMap[preferences.learning_style] || '')
    }

    if (preferences.difficulty_preference) {
      const difficultyMap: Record<string, string> = {
        'easy_first': '建议从简单的科目和章节开始，逐步提升难度',
        'hard_first': '优先攻克难点科目，在精力最充沛时学习最具挑战性的内容',
        'mixed': '难易结合，保持学习的趣味性和成就感'
      }
      enhancements.push(difficultyMap[preferences.difficulty_preference] || '')
    }

    if (preferences.review_frequency) {
      const reviewMap: Record<string, string> = {
        'daily': '每日安排15-30分钟复习时间，及时巩固',
        'weekly': '每周末进行系统性复习，整理一周所学',
        'monthly': '每月进行一次全面复习和知识体系梳理'
      }
      enhancements.push(reviewMap[preferences.review_frequency] || '')
    }

    return basePrompt + '\n\n用户学习偏好：\n' + enhancements.join('\n')
  }

  // 验证生成的计划一致性
  validatePlanConsistency(plan: GeneratedPlan): {
    isConsistent: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // 检查计划结构完整性
    if (!plan.overall_strategy || plan.overall_strategy.length < 100) {
      issues.push('总体规划内容不够详细')
    }

    if (!plan.daily_plan || plan.daily_plan.length < 100) {
      issues.push('日计划内容不够具体')
    }

    if (!plan.weekly_plan || plan.weekly_plan.length < 100) {
      issues.push('周计划安排不够完整')
    }

    // 检查时间一致性
    const dailyHoursMatch = plan.daily_plan.match(/(\d+)小时/)
    const weeklyDaysMatch = plan.weekly_plan.match(/周[一二三四五六日]/g)
    
    if (dailyHoursMatch && weeklyDaysMatch) {
      // 验证时间安排是否合理
      const dailyHours = parseInt(dailyHoursMatch[1])
      if (dailyHours < 1 || dailyHours > 12) {
        issues.push('每日学习时间安排不合理')
      }
    }

    // 检查内容关联性
    const overallSubjects = this.extractSubjectsFromText(plan.overall_strategy)
    const dailySubjects = this.extractSubjectsFromText(plan.daily_plan)
    const weeklySubjects = this.extractSubjectsFromText(plan.weekly_plan)

    // 确保三级计划提到的科目一致
    const allSubjects = new Set([...overallSubjects, ...dailySubjects, ...weeklySubjects])
    if (allSubjects.size > 5) {
      issues.push('计划中涉及的科目过于分散，建议集中精力')
    }

    return {
      isConsistent: issues.length === 0,
      issues
    }
  }

  // 从文本中提取科目名称
  private extractSubjectsFromText(text: string): string[] {
    const subjects = [
      '民法', '刑法', '行政法', '民事诉讼法', '刑事诉讼法',
      '商法', '经济法', '国际法', '法理学', '宪法',
      '劳动法', '知识产权法'
    ]

    return subjects.filter(subject => text.includes(subject))
  }
}