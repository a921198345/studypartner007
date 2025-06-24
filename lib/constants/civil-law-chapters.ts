// 民法详细章节数据结构
export interface Chapter {
  id: string
  title: string
  sections?: Section[]
}

export interface Section {
  id: string
  title: string
  page?: number
}

export const CIVIL_LAW_CHAPTERS: Chapter[] = [
  {
    id: "part1",
    title: "第一编 总则",
    sections: [
      { id: "1-1", title: "第一章 基本规定", page: 1 },
      { id: "1-2", title: "第二章 自然人", page: 13 },
      { id: "1-3", title: "第三章 法人", page: 43 },
      { id: "1-4", title: "第四章 非法人组织", page: 49 },
      { id: "1-5", title: "第五章 民事权利", page: 50 },
      { id: "1-6", title: "第六章 民事法律行为", page: 59 },
      { id: "1-7", title: "第七章 代理", page: 64 },
      { id: "1-8", title: "第八章 民事责任", page: 68 },
      { id: "1-9", title: "第九章 诉讼时效", page: 79 }
    ]
  },
  {
    id: "part2", 
    title: "第二编 物权",
    sections: [
      { id: "2-1", title: "第一章 一般规定", page: 189 },
      { id: "2-2", title: "第二章 物权的设立、变更、转让和消灭", page: 199 },
      { id: "2-3", title: "第三章 物权的保护", page: 214 },
      { id: "2-4", title: "第四章 所有权", page: 204 },
      { id: "2-5", title: "第五章 用益物权", page: 265 },
      { id: "2-6", title: "第六章 担保物权", page: 288 },
      { id: "2-7", title: "第七章 合用（古）占有", page: 217 },
      { id: "2-8", title: "第八章 质权", page: 304 },
      { id: "2-9", title: "第九章 留置权", page: 310 },
      { id: "2-10", title: "第十章 定金", page: 316 },
      { id: "2-11", title: "第十一章 综合习题", page: 342 },
      { id: "2-12", title: "第十二章 物权综合", page: 357 },
      { id: "2-13", title: "第十三章 实际问题", page: 361 },
      { id: "2-14", title: "第十四章 习题综合", page: 368 },
      { id: "2-15", title: "第十五章 综合演练", page: 376 },
      { id: "2-16", title: "第十六章 相关综合", page: 383 },
      { id: "2-17", title: "第十七章 整体练习", page: 387 },
      { id: "2-18", title: "第十八章 复习要点", page: 392 },
      { id: "2-19", title: "第十九章 核心总结", page: 395 },
      { id: "2-20", title: "第二十章 提升训练", page: 400 }
    ]
  },
  {
    id: "part3",
    title: "第三编 合同",
    sections: [
      { id: "3-1", title: "第一章 一般规定", page: 407 },
      { id: "3-2", title: "第二章 合同的订立", page: 421 },
      { id: "3-3", title: "第三章 合同的效力", page: 433 },
      { id: "3-4", title: "第四章 合同的履行", page: 441 },
      { id: "3-5", title: "第五章 合同的保全", page: 461 },
      { id: "3-6", title: "第六章 合同的变更和转让", page: 472 },
      { id: "3-7", title: "第七章 合同的终止", page: 476 },
      { id: "3-8", title: "第八章 违约责任", page: 505 },
      { id: "3-9", title: "第九章 典型合同", page: 510 }
    ]
  },
  {
    id: "part4",
    title: "第四编 人格权",
    sections: [
      { id: "4-1", title: "第一章 一般规定", page: 407 },
      { id: "4-2", title: "第二章 生命权、身体权和健康权", page: 421 },
      { id: "4-3", title: "第三章 姓名权和名称权", page: 433 }
    ]
  },
  {
    id: "part5",
    title: "第五编 婚姻家庭",
    sections: [
      { id: "5-1", title: "第一章 一般规定", page: 441 },
      { id: "5-2", title: "第二章 结婚", page: 461 },
      { id: "5-3", title: "第三章 家庭关系", page: 472 },
      { id: "5-4", title: "第四章 离婚", page: 476 },
      { id: "5-5", title: "第五章 收养", page: 505 }
    ]
  },
  {
    id: "part6",
    title: "第六编 继承",
    sections: [
      { id: "6-1", title: "第一章 一般规定", page: 461 },
      { id: "6-2", title: "第二章 法定继承", page: 472 },
      { id: "6-3", title: "第三章 遗嘱继承和遗赠", page: 476 },
      { id: "6-4", title: "第四章 遗产的处理", page: 505 }
    ]
  },
  {
    id: "part7",
    title: "第七编 侵权责任",
    sections: [
      { id: "7-1", title: "第一章 一般规定", page: 461 },
      { id: "7-2", title: "第二章 损害赔偿", page: 472 },
      { id: "7-3", title: "第三章 责任主体的特殊规定", page: 476 },
      { id: "7-4", title: "第四章 产品责任", page: 505 },
      { id: "7-5", title: "第五章 机动车交通事故责任", page: 510 },
      { id: "7-6", title: "第六章 医疗损害责任", page: 510 },
      { id: "7-7", title: "第七章 环境污染和生态破坏责任", page: 510 },
      { id: "7-8", title: "第八章 高度危险活动致害责任", page: 510 },
      { id: "7-9", title: "第九章 饲养动物损害责任", page: 510 },
      { id: "7-10", title: "第十章 建筑物和物件损害责任", page: 510 }
    ]
  }
]

// 简化版本，用于快速选择
export const CIVIL_LAW_PARTS = CIVIL_LAW_CHAPTERS.map(chapter => chapter.title)

// 根据编号获取详细章节
export function getCivilLawChapterSections(partId: string): Section[] {
  const chapter = CIVIL_LAW_CHAPTERS.find(c => c.id === partId)
  return chapter?.sections || []
}

// 计算总章节数
export function getTotalCivilLawSections(): number {
  return CIVIL_LAW_CHAPTERS.reduce((total, chapter) => total + (chapter.sections?.length || 0), 0)
}

// 根据进度百分比计算完成的章节
export function getCompletedSectionsByProgress(progress: number): Section[] {
  const totalSections = getTotalCivilLawSections()
  const completedCount = Math.floor((progress / 100) * totalSections)
  
  const allSections: Section[] = []
  CIVIL_LAW_CHAPTERS.forEach(chapter => {
    if (chapter.sections) {
      allSections.push(...chapter.sections)
    }
  })
  
  return allSections.slice(0, completedCount)
}