// AI智能学习计划服务

interface SubjectProgress {
  subject: string
  progress: number
  status: 'completed' | 'in_progress' | 'not_started'
  chapters_completed: number
  total_chapters: number
}

interface SubjectWeight {
  subject: string
  progress_weight: number
  importance_weight: number
  difficulty_weight: number
  correlation_weight: number
  total_weight: number
  priority_rank: number
}

// 科目重要程度定义
const SUBJECT_IMPORTANCE: Record<string, number> = {
  '民法': 10,
  '刑法': 10,
  '行政法': 8,
  '民事诉讼法': 7,
  '刑事诉讼法': 7,
  '商法': 6,
  '经济法': 5,
  '国际法': 4,
  '法理学': 5,
  '宪法': 6,
  '劳动法': 4,
  '知识产权法': 4
}

// 科目难度系数
const SUBJECT_DIFFICULTY: Record<string, number> = {
  '民法': 9,
  '刑法': 8,
  '行政法': 7,
  '民事诉讼法': 6,
  '刑事诉讼法': 6,
  '商法': 7,
  '经济法': 5,
  '国际法': 4,
  '法理学': 5,
  '宪法': 4,
  '劳动法': 3,
  '知识产权法': 5
}

// 科目关联性矩阵
const SUBJECT_CORRELATIONS: Record<string, string[]> = {
  '民法': ['民事诉讼法', '商法', '知识产权法'],
  '刑法': ['刑事诉讼法'],
  '行政法': ['行政诉讼法', '宪法'],
  '民事诉讼法': ['民法', '劳动法'],
  '刑事诉讼法': ['刑法'],
  '商法': ['民法', '经济法'],
  '经济法': ['商法', '劳动法'],
  '国际法': ['经济法'],
  '法理学': ['宪法'],
  '宪法': ['法理学', '行政法'],
  '劳动法': ['民法', '经济法'],
  '知识产权法': ['民法']
}

export class StudyPlanAIService {
  // 计算基于用户进度的排序权重
  calculateProgressWeight(progress: SubjectProgress[]): Map<string, number> {
    const weights = new Map<string, number>()
    
    progress.forEach(subject => {
      // 进度权重计算规则：
      // 1. 已完成的科目权重最低 (0-20)
      // 2. 进行中的科目权重最高 (60-100)，进度越高权重越高
      // 3. 未开始的科目权重中等 (30-50)
      
      let weight = 0
      
      if (subject.status === 'completed') {
        // 已完成科目仍保留少量权重用于复习
        weight = 10 + (subject.progress / 100) * 10
      } else if (subject.status === 'in_progress') {
        // 进行中的科目，进度越高权重越高（优先完成）
        weight = 60 + (subject.progress / 100) * 40
      } else {
        // 未开始的科目，根据重要性给予基础权重
        const importance = SUBJECT_IMPORTANCE[subject.subject] || 5
        weight = 30 + (importance / 10) * 20
      }
      
      weights.set(subject.subject, weight)
    })
    
    return weights
  }

  // 计算科目重要程度权重
  calculateImportanceWeight(subjects: string[]): Map<string, number> {
    const weights = new Map<string, number>()
    
    subjects.forEach(subject => {
      const importance = SUBJECT_IMPORTANCE[subject] || 5
      // 将10分制转换为百分制权重
      const weight = (importance / 10) * 100
      weights.set(subject, weight)
    })
    
    return weights
  }

  // 计算难易程度权重
  calculateDifficultyWeight(subjects: string[]): Map<string, number> {
    const weights = new Map<string, number>()
    
    subjects.forEach(subject => {
      const difficulty = SUBJECT_DIFFICULTY[subject] || 5
      // 难度越高，权重越高（优先安排难的科目）
      const weight = (difficulty / 10) * 100
      weights.set(subject, weight)
    })
    
    return weights
  }

  // 计算科目关联性权重
  calculateCorrelationWeight(subjects: string[], recentSubjects: string[] = []): Map<string, number> {
    const weights = new Map<string, number>()
    
    subjects.forEach(subject => {
      let correlationScore = 0
      
      // 检查与最近学习科目的关联性
      recentSubjects.forEach(recent => {
        const correlations = SUBJECT_CORRELATIONS[recent] || []
        if (correlations.includes(subject)) {
          correlationScore += 50 // 有关联性增加权重
        }
      })
      
      // 检查该科目与其他待学科目的关联性
      const subjectCorrelations = SUBJECT_CORRELATIONS[subject] || []
      const correlatedCount = subjectCorrelations.filter(s => subjects.includes(s)).length
      correlationScore += correlatedCount * 10
      
      weights.set(subject, Math.min(correlationScore, 100))
    })
    
    return weights
  }

  // 综合计算科目权重并排序
  calculateSubjectPriority(
    progress: SubjectProgress[],
    options: {
      recentSubjects?: string[]
      userPreference?: 'progress' | 'importance' | 'difficulty' | 'balanced'
    } = {}
  ): SubjectWeight[] {
    const subjects = progress.map(p => p.subject)
    
    // 计算各维度权重
    const progressWeights = this.calculateProgressWeight(progress)
    const importanceWeights = this.calculateImportanceWeight(subjects)
    const difficultyWeights = this.calculateDifficultyWeight(subjects)
    const correlationWeights = this.calculateCorrelationWeight(subjects, options.recentSubjects)
    
    // 根据用户偏好调整权重比例
    let weightRatios = {
      progress: 0.60,
      importance: 0.25,
      difficulty: 0.10,
      correlation: 0.05
    }
    
    if (options.userPreference === 'importance') {
      weightRatios = { progress: 0.40, importance: 0.45, difficulty: 0.10, correlation: 0.05 }
    } else if (options.userPreference === 'difficulty') {
      weightRatios = { progress: 0.40, importance: 0.20, difficulty: 0.35, correlation: 0.05 }
    } else if (options.userPreference === 'balanced') {
      weightRatios = { progress: 0.25, importance: 0.25, difficulty: 0.25, correlation: 0.25 }
    }
    
    // 计算综合权重
    const subjectWeights: SubjectWeight[] = subjects.map(subject => {
      const progressWeight = progressWeights.get(subject) || 0
      const importanceWeight = importanceWeights.get(subject) || 0
      const difficultyWeight = difficultyWeights.get(subject) || 0
      const correlationWeight = correlationWeights.get(subject) || 0
      
      const totalWeight = 
        progressWeight * weightRatios.progress +
        importanceWeight * weightRatios.importance +
        difficultyWeight * weightRatios.difficulty +
        correlationWeight * weightRatios.correlation
      
      return {
        subject,
        progress_weight: progressWeight,
        importance_weight: importanceWeight,
        difficulty_weight: difficultyWeight,
        correlation_weight: correlationWeight,
        total_weight: totalWeight,
        priority_rank: 0
      }
    })
    
    // 按总权重排序
    subjectWeights.sort((a, b) => b.total_weight - a.total_weight)
    
    // 设置优先级排名
    subjectWeights.forEach((weight, index) => {
      weight.priority_rank = index + 1
    })
    
    return subjectWeights
  }

  // 生成智能排序建议
  generateSortingSuggestion(weights: SubjectWeight[]): string {
    const top3 = weights.slice(0, 3)
    const suggestions: string[] = []
    
    // 分析排序理由
    top3.forEach((subject, index) => {
      const reasons: string[] = []
      
      if (subject.progress_weight > 70) {
        reasons.push('接近完成')
      }
      if (subject.importance_weight > 80) {
        reasons.push('考试重点')
      }
      if (subject.difficulty_weight > 70) {
        reasons.push('难度较高')
      }
      if (subject.correlation_weight > 30) {
        reasons.push('知识关联')
      }
      
      suggestions.push(`${index + 1}. ${subject.subject}${reasons.length > 0 ? `（${reasons.join('、')}）` : ''}`)
    })
    
    return `基于您的学习进度和科目特点，建议优先学习顺序：\n${suggestions.join('\n')}`
  }

  // 验证排序合理性
  validateSubjectOrder(
    orderedSubjects: string[],
    progress: SubjectProgress[]
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // 检查是否有已完成科目排在未完成科目前面
    let foundIncomplete = false
    orderedSubjects.forEach(subject => {
      const subjectProgress = progress.find(p => p.subject === subject)
      if (subjectProgress) {
        if (subjectProgress.status === 'completed' && foundIncomplete) {
          warnings.push(`已完成的${subject}建议安排在未完成科目之后`)
        }
        if (subjectProgress.status !== 'completed') {
          foundIncomplete = true
        }
      }
    })
    
    // 检查关联科目是否分散太远
    orderedSubjects.forEach((subject, index) => {
      const correlations = SUBJECT_CORRELATIONS[subject] || []
      correlations.forEach(related => {
        const relatedIndex = orderedSubjects.indexOf(related)
        if (relatedIndex !== -1 && Math.abs(index - relatedIndex) > 3) {
          warnings.push(`${subject}与${related}有关联性，建议安排得更近一些`)
        }
      })
    })
    
    return {
      valid: warnings.length === 0,
      warnings
    }
  }
}