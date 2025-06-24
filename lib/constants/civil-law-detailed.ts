// 民法详细结构：九个部分，50个专题
export interface Topic {
  id: string
  title: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  estimatedHours: number
}

export interface Part {
  id: string
  title: string
  description: string
  topics: Topic[]
}

export const CIVIL_LAW_DETAILED_STRUCTURE: Part[] = [
  {
    id: "part1",
    title: "第一部分 民法总论",
    description: "民法基本原理、主体、客体、法律行为等基础理论",
    topics: [
      { id: "1-1", title: "民法基本原则", difficulty: "basic", estimatedHours: 4 },
      { id: "1-2", title: "民法渊源与适用", difficulty: "basic", estimatedHours: 3 },
      { id: "1-3", title: "自然人的民事权利能力", difficulty: "intermediate", estimatedHours: 5 },
      { id: "1-4", title: "自然人的民事行为能力", difficulty: "intermediate", estimatedHours: 6 },
      { id: "1-5", title: "监护制度", difficulty: "intermediate", estimatedHours: 4 },
      { id: "1-6", title: "宣告失踪和宣告死亡", difficulty: "intermediate", estimatedHours: 3 }
    ]
  },
  {
    id: "part2", 
    title: "第二部分 法人制度",
    description: "法人的设立、变更、终止及非法人组织",
    topics: [
      { id: "2-1", title: "法人的概念和分类", difficulty: "basic", estimatedHours: 4 },
      { id: "2-2", title: "法人的设立、变更和终止", difficulty: "intermediate", estimatedHours: 5 },
      { id: "2-3", title: "法人的民事权利能力和行为能力", difficulty: "intermediate", estimatedHours: 4 },
      { id: "2-4", title: "非法人组织", difficulty: "intermediate", estimatedHours: 3 },
      { id: "2-5", title: "个体工商户和农村承包经营户", difficulty: "basic", estimatedHours: 3 }
    ]
  },
  {
    id: "part3",
    title: "第三部分 民事权利与民事法律行为",
    description: "民事权利的种类、民事法律行为的构成要件与效力",
    topics: [
      { id: "3-1", title: "民事权利的分类", difficulty: "basic", estimatedHours: 3 },
      { id: "3-2", title: "民事法律行为的概念和特征", difficulty: "intermediate", estimatedHours: 4 },
      { id: "3-3", title: "意思表示", difficulty: "advanced", estimatedHours: 8 },
      { id: "3-4", title: "民事法律行为的成立与生效", difficulty: "advanced", estimatedHours: 6 },
      { id: "3-5", title: "条件和期限", difficulty: "intermediate", estimatedHours: 4 },
      { id: "3-6", title: "无效的民事法律行为", difficulty: "advanced", estimatedHours: 6 },
      { id: "3-7", title: "可撤销的民事法律行为", difficulty: "advanced", estimatedHours: 7 }
    ]
  },
  {
    id: "part4",
    title: "第四部分 代理制度",
    description: "代理的种类、代理权、代理行为的效力",
    topics: [
      { id: "4-1", title: "代理的概念和特征", difficulty: "basic", estimatedHours: 3 },
      { id: "4-2", title: "代理的种类", difficulty: "intermediate", estimatedHours: 4 },
      { id: "4-3", title: "代理权的产生、行使和消灭", difficulty: "intermediate", estimatedHours: 5 },
      { id: "4-4", title: "无权代理", difficulty: "advanced", estimatedHours: 6 },
      { id: "4-5", title: "表见代理", difficulty: "advanced", estimatedHours: 7 }
    ]
  },
  {
    id: "part5",
    title: "第五部分 物权总论",
    description: "物权的基本原理、物权变动、物权保护",
    topics: [
      { id: "5-1", title: "物权的概念和特征", difficulty: "basic", estimatedHours: 4 },
      { id: "5-2", title: "物权的种类和体系", difficulty: "intermediate", estimatedHours: 5 },
      { id: "5-3", title: "物权变动的原因", difficulty: "advanced", estimatedHours: 6 },
      { id: "5-4", title: "不动产物权变动", difficulty: "advanced", estimatedHours: 8 },
      { id: "5-5", title: "动产物权变动", difficulty: "advanced", estimatedHours: 7 },
      { id: "5-6", title: "物权保护方法", difficulty: "intermediate", estimatedHours: 5 }
    ]
  },
  {
    id: "part6",
    title: "第六部分 所有权",
    description: "所有权的内容、取得、共有关系",
    topics: [
      { id: "6-1", title: "所有权的概念和内容", difficulty: "basic", estimatedHours: 4 },
      { id: "6-2", title: "所有权的取得", difficulty: "intermediate", estimatedHours: 6 },
      { id: "6-3", title: "共有", difficulty: "advanced", estimatedHours: 8 },
      { id: "6-4", title: "建筑物区分所有权", difficulty: "advanced", estimatedHours: 7 },
      { id: "6-5", title: "相邻关系", difficulty: "intermediate", estimatedHours: 5 }
    ]
  },
  {
    id: "part7",
    title: "第七部分 用益物权与担保物权",
    description: "用益物权和担保物权的种类、设立、效力",
    topics: [
      { id: "7-1", title: "用益物权概述", difficulty: "basic", estimatedHours: 3 },
      { id: "7-2", title: "土地承包经营权", difficulty: "intermediate", estimatedHours: 5 },
      { id: "7-3", title: "建设用地使用权", difficulty: "intermediate", estimatedHours: 5 },
      { id: "7-4", title: "宅基地使用权", difficulty: "intermediate", estimatedHours: 4 },
      { id: "7-5", title: "担保物权概述", difficulty: "basic", estimatedHours: 3 },
      { id: "7-6", title: "抵押权", difficulty: "advanced", estimatedHours: 10 },
      { id: "7-7", title: "质权", difficulty: "advanced", estimatedHours: 7 },
      { id: "7-8", title: "留置权", difficulty: "intermediate", estimatedHours: 4 }
    ]
  },
  {
    id: "part8",
    title: "第八部分 债权债务关系",
    description: "债的发生、履行、担保、转移和消灭",
    topics: [
      { id: "8-1", title: "债的概念和特征", difficulty: "basic", estimatedHours: 3 },
      { id: "8-2", title: "债的发生原因", difficulty: "intermediate", estimatedHours: 4 },
      { id: "8-3", title: "债的履行", difficulty: "advanced", estimatedHours: 8 },
      { id: "8-4", title: "债的保全", difficulty: "advanced", estimatedHours: 6 },
      { id: "8-5", title: "债的担保", difficulty: "advanced", estimatedHours: 7 },
      { id: "8-6", title: "债的转移", difficulty: "advanced", estimatedHours: 6 },
      { id: "8-7", title: "债的消灭", difficulty: "intermediate", estimatedHours: 5 }
    ]
  },
  {
    id: "part9",
    title: "第九部分 侵权责任与其他",
    description: "侵权责任的构成、类型及人格权、婚姻家庭、继承法要点",
    topics: [
      { id: "9-1", title: "侵权责任的概念和特征", difficulty: "basic", estimatedHours: 4 },
      { id: "9-2", title: "侵权责任的归责原则", difficulty: "advanced", estimatedHours: 6 },
      { id: "9-3", title: "一般侵权责任", difficulty: "advanced", estimatedHours: 7 },
      { id: "9-4", title: "特殊侵权责任", difficulty: "advanced", estimatedHours: 8 },
      { id: "9-5", title: "人格权保护", difficulty: "intermediate", estimatedHours: 5 },
      { id: "9-6", title: "婚姻家庭法要点", difficulty: "intermediate", estimatedHours: 6 },
      { id: "9-7", title: "继承法要点", difficulty: "intermediate", estimatedHours: 5 }
    ]
  }
]

// 计算总计信息
export const getCivilLawStats = () => {
  const totalParts = CIVIL_LAW_DETAILED_STRUCTURE.length
  const totalTopics = CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => sum + part.topics.length, 0)
  const totalHours = CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => 
    sum + part.topics.reduce((partSum, topic) => partSum + topic.estimatedHours, 0), 0
  )
  
  const difficultyStats = CIVIL_LAW_DETAILED_STRUCTURE.reduce((stats, part) => {
    part.topics.forEach(topic => {
      stats[topic.difficulty] = (stats[topic.difficulty] || 0) + 1
    })
    return stats
  }, {} as Record<string, number>)

  return {
    totalParts,
    totalTopics,
    totalHours,
    difficultyStats
  }
}

// 根据进度百分比获取已完成的专题
export function getCompletedTopicsByProgress(progress: number): string[] {
  const totalTopics = CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => sum + part.topics.length, 0)
  const completedCount = Math.floor((progress / 100) * totalTopics)
  
  const allTopics: string[] = []
  CIVIL_LAW_DETAILED_STRUCTURE.forEach(part => {
    part.topics.forEach(topic => {
      allTopics.push(topic.id)
    })
  })
  
  return allTopics.slice(0, completedCount)
}

// 根据已完成的专题ID列表计算进度百分比
export function calculateProgressFromTopics(completedTopicIds: string[]): number {
  const totalTopics = CIVIL_LAW_DETAILED_STRUCTURE.reduce((sum, part) => sum + part.topics.length, 0)
  return Math.round((completedTopicIds.length / totalTopics) * 100)
}

// 获取部分的完成状态
export function getPartCompletionStatus(partId: string, completedTopicIds: string[]) {
  const part = CIVIL_LAW_DETAILED_STRUCTURE.find(p => p.id === partId)
  if (!part) return { completed: 0, total: 0, status: 'not_started', completionRate: 0 }
  
  const completed = part.topics.filter(topic => completedTopicIds.includes(topic.id)).length
  const total = part.topics.length
  const completionRate = Math.round((completed / total) * 100)
  
  let status = 'not_started'
  if (completed === total) status = 'completed'
  else if (completed > 0) status = 'in_progress'
  
  return { completed, total, status, completionRate }
}