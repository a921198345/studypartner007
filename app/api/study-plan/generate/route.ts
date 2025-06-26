import { NextRequest, NextResponse } from 'next/server'
import { getDeepSeekCompletion } from '@/lib/deepseek'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('开始生成学习计划，用户数据:', JSON.stringify(body, null, 2))

    // 调用DeepSeek API生成学习计划
    const aiPlan = await generateAIPlan(body)
    
    console.log('学习计划生成成功')
    
    return NextResponse.json({
      success: true,
      data: aiPlan
    })

  } catch (error) {
    console.error('生成学习计划失败:', error)
    
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '生成学习计划失败',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

async function generateAIPlan(formData: any) {
  try {
    // 验证输入数据
    if (!formData.subject_progress || Object.keys(formData.subject_progress).length === 0) {
      throw new Error('请至少选择一个科目的学习进度')
    }
    
    if (!formData.study_schedule || !formData.study_schedule.daily_hours) {
      throw new Error('请设置每日学习时长')
    }
    
    console.log('构建AI提示词...')
    
    // 构建专业的学习计划生成提示词
    const prompt = buildEnhancedPrompt(formData)
    
    console.log('调用DeepSeek API...')
    
    // 使用优化后的DeepSeek API调用
    const aiResponse = await getDeepSeekCompletion(prompt)
    
    if (!aiResponse) {
      throw new Error('AI服务返回空响应')
    }
    
    console.log('解析AI响应...')
    
    // 解析AI响应并结构化
    const parsedPlan = parseAIResponse(aiResponse, formData)
    
    console.log('学习计划解析完成')
    
    return parsedPlan
    
  } catch (error) {
    console.error('生成AI学习计划失败:', error)
    throw new Error(`AI生成失败: ${error.message}`)
  }
}

function buildEnhancedPrompt(formData: any) {
  const { subject_progress, subject_order, study_schedule, exam_date, calculated_total_hours, custom_notes } = formData
  
  // 计算学习统计
  const activeSubjects = subject_order.map((item: any) => {
    const progress = subject_progress[item.subject]
    return {
      subject: item.subject,
      status: progress?.status || 'not_started',
      progress: progress?.progress || 0,
      chapters: progress?.chapters || [],
      completedSections: progress?.completedSections || []
    }
  })

  // 计算距离法考的天数
  const today = new Date()
  const examDay = new Date(exam_date)
  const daysToExam = Math.max(0, Math.ceil((examDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  // 筛选需要学习的科目（按优先级顺序）
  const subjectsToStudy = activeSubjects.filter(s => s.status !== 'completed')
  
  // 当前正在学习的科目（第一个未完成的科目）
  const currentSubject = subjectsToStudy[0]
  
  // 下一个要学习的科目
  const nextSubject = subjectsToStudy[1]

  const prompt = `# 法考学习计划定制专家

你是一位专业的法考辅导专家，具有多年的法考培训经验。请严格按照以下要求为学生制定个性化的学习计划。

## 🎯 核心学习原则

### ⭐ 重要原则（必须严格遵守）：
1. **科目完成原则**：一个科目完全掌握后再进行下一个科目
2. **客观题优先**：客观题学习占80%时间，主观题学习占20%时间
3. **主观题融合**：主观题学习穿插在相关客观题学习过程中
4. **具体到章节**：计划必须具体到章节、专题、真题练习，绝不能使用"第X章"这样的模糊描述

## 📚 各科目具体章节框架（必须按此来制定计划）：

### 民法典章节：
- 总则编：第一章自然人、第二章法人、第三章非法人组织、第四章民事权利、第五章民事法律行为、第六章代理、第七章民事责任、第八章诉讼时效、第九章期间计算
- 物权编：第一章通则、第二章所有权、第三章用益物权、第四章担保物权
- 合同编：第一章通则、第二章合同的订立、第三章合同的效力、第四章合同的履行、第五章合同的保全、第六章合同的变更和转让、第七章合同的权利义务终止、第八章违约责任、第九章准合同
- 人格权编：第一章一般规定、第二章生命权身体权健康权、第三章姓名权和名称权、第四章肖像权、第五章名誉权和荣誉权、第六章隐私权和个人信息保护
- 婚姻家庭编：第一章一般规定、第二章结婚、第三章家庭关系、第四章离婚、第五章收养
- 继承编：第一章一般规定、第二章法定继承、第三章遗嘱继承和遗赠、第四章遗产的处理

### 刑法章节：
- 总则：第一章刑法的任务基本原则和适用范围、第二章犯罪、第三章刑罚
- 分则：第一章危害国家安全罪、第二章危害公共安全罪、第三章破坏社会主义市场经济秩序罪、第四章侵犯公民人身权利民主权利罪、第五章侵犯财产罪、第六章妨害社会管理秩序罪、第七章危害国防利益罪、第八章贪污贿赂罪、第九章渎职罪、第十章军人违反职责罪

### 行政法章节：
- 第一章行政法基本理论、第二章行政法主体、第三章行政行为、第四章行政程序、第五章行政复议、第六章行政诉讼、第七章行政赔偿、第八章监察法

### 民事诉讼法章节：
- 第一章总则、第二章管辖、第三章审判组织、第四章回避、第五章诉讼参加人、第六章证据、第七章期间送达、第八章调解、第九章财产保全和先予执行、第十章对妨害民事诉讼的强制措施、第十一章诉讼费用

### 刑事诉讼法章节：
- 第一章任务和基本原则、第二章管辖、第三章回避、第四章辩护与代理、第五章证据、第六章强制措施、第七章附带民事诉讼、第八章期间送达、第九章立案、第十章侦查、第十一章起诉、第十二章审判、第十三章执行

### 商经法章节：
- 公司法：第一章总则、第二章有限责任公司的设立和组织机构、第三章股份有限公司的设立和组织机构、第四章股份有限公司的股份发行和转让、第五章公司董事监事高级管理人员的资格和义务、第六章公司债券、第七章公司财务会计、第八章公司合并分立增资减资、第九章公司解散和清算、第十章外国公司的分支机构
- 合伙企业法、个人独资企业法、企业破产法、证券法、保险法、票据法、反垄断法、反不正当竞争法、消费者权益保护法、产品质量法

### 理论法章节：
- 法理学：第一章法学和法理学、第二章法的本质与特征、第三章法的起源与发展、第四章法的作用与价值、第五章法的渊源形式和效力、第六章法的要素、第七章法的体系、第八章法的运行、第九章法与社会
- 宪法：第一章宪法基本理论、第二章国家的基本制度、第三章公民的基本权利和义务、第四章国家机构
- 法制史：第一章中国法制史、第二章外国法制史

### 三国法章节：
- 国际公法：第一章导论、第二章国际法主体、第三章国家领土、第四章海洋法、第五章空间法、第六章外交和领事关系法、第七章条约法、第八章国际争端的和平解决、第九章战争与武装冲突法、第十章国际法上的个人
- 国际私法：第一章总论、第二章冲突规范和准据法、第三章适用冲突规范的制度、第四章国际民商事关系的法律适用、第五章国际民商事争议的解决、第六章区际法律问题
- 国际经济法：第一章导论、第二章国际货物买卖法、第三章国际货物运输与保险法、第四章国际贸易支付法、第五章世界贸易组织法、第六章国际投资法、第七章国际金融法、第八章国际税法、第九章国际经济争议的解决

## 📊 当前学习状况

### 法考倒计时
- **法考日期**: ${exam_date}
- **剩余天数**: ${daysToExam}天
- **总学习时长**: ${calculated_total_hours}小时

### 学习时间安排
- **每日学习时长**: ${study_schedule.daily_hours}小时（智能计算）
- **每周学习天数**: ${study_schedule.weekly_days}天
- **每周总学时**: ${study_schedule.daily_hours * study_schedule.weekly_days}小时

### 科目学习状态（按优先级顺序）
${activeSubjects.map((s, index) => {
  const statusText = s.status === 'in_progress' ? `进行中(${s.progress}%)` : 
                   s.status === 'not_started' ? '未开始' : '已完成(100%)'
  const isCurrentSubject = s.subject === currentSubject?.subject ? ' ← **当前重点科目**' : ''
  return `${index + 1}. **${s.subject}**: ${statusText}${isCurrentSubject}`
}).join('\n')}

### 当前学习重点
- **主要科目**: ${currentSubject?.subject || '无'}
- **学习进度**: ${currentSubject?.progress || 0}%
- **下一科目**: ${nextSubject?.subject || '无'}

### 个人学习需求
${custom_notes || '无特殊要求'}

---

## 📝 生成要求

请严格按照以下要求和格式生成学习计划：

### **总体规划思路**
分析当前学习状况，制定总体策略：
- 📊 当前进度分析：针对${currentSubject?.subject || '第一科目'}的学习状态
- 🎯 科目完成策略：专注当前科目，一个科目完全掌握后再进行下一个
- ⚖️ 客观题80% + 主观题20%的时间分配原则
- 📈 具体到章节专题的学习路径规划

### **今日学习计划**
制定今天的详细学习安排（总时长${study_schedule.daily_hours}小时），专注${currentSubject?.subject || '当前科目'}：

#### 🎯 今日学习目标 (3分钟)
- 📖 查看${currentSubject?.subject || '当前科目'}知识导图，了解今日学习章节在整体框架中的位置
- 🔍 明确今日具体要掌握的章节和专题

#### 📚 客观题学习 (${Math.round(study_schedule.daily_hours * 60 * 0.8)}分钟 - 80%时间)
**具体章节学习：**
- 必须从上述章节框架中选择${currentSubject?.subject || '当前科目'}的具体章节名称进行学习
- 重点法条梳理和理解
- 配套教材精读
- **真题练习**：练习该章节对应的历年客观题真题
- **知识导图**：查看对应章节的知识导图，理解知识点关联
- **AI问答**：针对重点难点法条进行深度提问

#### ✍️ 主观题学习 (${Math.round(study_schedule.daily_hours * 60 * 0.2)}分钟 - 20%时间)
- **案例分析**：学习与今日客观题章节相关的主观题解题方法
- **答题技巧**：掌握该知识点在主观题中的考查方式
- **模板记忆**：背诵相关主观题答题模板

#### 📝 学习总结 (5分钟)
- 整理今日学习的重点法条和知识点笔记
- 标记疑难问题，准备明日AI问答

### **本周学习计划**
本周专注完成${currentSubject?.subject || '当前科目'}的系统学习：

#### 🎯 本周目标
- 完成${currentSubject?.subject || '当前科目'}的具体章节（必须从上述章节框架中选择具体章节名称）
- 掌握该科目的核心法条和重点考点
- 完成该科目80%的客观题真题练习
- 掌握该科目相关的主观题答题技巧

#### 📅 每日具体安排（必须使用具体章节名称）
**周一**: ${currentSubject?.subject || '当前科目'} - 必须选择具体章节名称（如：民法总则编第一章自然人）
- 客观题学习: 具体法条 + 对应真题练习 + 知识导图查看
- 主观题学习: 相关案例分析方法
- AI问答重点: 具体法条疑问

**周二**: ${currentSubject?.subject || '当前科目'} - 必须选择具体章节名称（如：民法总则编第二章法人）
- 客观题学习: 具体法条 + 对应真题练习 + 知识导图查看  
- 主观题学习: 相关答题模板
- AI问答重点: 具体概念辨析

**周三至周${['天', '一', '二', '三', '四', '五', '六', '日'][study_schedule.weekly_days]}**: 继续按此模式安排，每天必须指定具体章节名称

#### 📊 学习资源利用
- **知识导图**: 每日学习前先查看${currentSubject?.subject || '当前科目'}知识导图的对应章节
- **AI问答**: 针对重点法条、疑难概念进行深度提问
- **真题题库**: 系统练习${currentSubject?.subject || '当前科目'}的历年真题，按章节分类练习
- **学习笔记**: 建立${currentSubject?.subject || '当前科目'}的系统笔记，重点记录法条要点

---

**生成要求**：
1. ⚠️ **必须指定具体的章节专题名称**，严格按照上述章节框架，如"民法总则编第一章自然人"而不是"第一章"
2. ⚠️ **必须体现80%客观题 + 20%主观题的时间分配**
3. ⚠️ **必须专注当前科目**：${currentSubject?.subject || '第一优先科目'}
4. ⚠️ **必须包含具体的真题练习安排**和知识导图查看指导
5. ⚠️ **必须提供具体的AI问答建议**，针对具体法条和概念
6. ⚠️ **严禁使用模糊表述**：绝不能说"相关章节"、"对应章节"、"第X章"等模糊词汇
7. ⚠️ **每日计划必须明确指定**：今日学习"${currentSubject?.subject || '民法'}的XX编第X章XXX"的具体章节名称

请严格按照上述章节框架生成具体到章节名称的详细学习计划：`

  return prompt
}

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

  // 后备解析方法：如果正则匹配失败，尝试分段解析
  if (!overallStrategy && !dailyPlan && !weeklyPlan) {
    const lines = aiResponse.split('\n')
    let currentSection = ''
    let tempStrategy = []
    let tempDaily = []
    let tempWeekly = []

    for (const line of lines) {
      const cleanLine = line.trim()
      
      if (cleanLine.includes('总体规划思路') || cleanLine.includes('总体策略')) {
        currentSection = 'strategy'
        continue
      } else if (cleanLine.includes('今日学习计划') || cleanLine.includes('今日计划')) {
        currentSection = 'daily'
        continue
      } else if (cleanLine.includes('本周学习计划') || cleanLine.includes('本周计划')) {
        currentSection = 'weekly'
        continue
      }

      if (currentSection === 'strategy' && cleanLine && !cleanLine.includes('今日学习计划') && !cleanLine.includes('本周学习计划')) {
        tempStrategy.push(cleanLine)
      } else if (currentSection === 'daily' && cleanLine && !cleanLine.includes('本周学习计划')) {
        tempDaily.push(cleanLine)
      } else if (currentSection === 'weekly' && cleanLine) {
        tempWeekly.push(cleanLine)
      }
    }

    overallStrategy = tempStrategy.join('\n').trim()
    dailyPlan = tempDaily.join('\n').trim()
    weeklyPlan = tempWeekly.join('\n').trim()
  }

  // 最终检查：如果还是没有内容，将完整响应作为总体策略
  if (!overallStrategy && !dailyPlan && !weeklyPlan) {
    overallStrategy = aiResponse.trim()
  }

  // 清理和格式化内容
  const cleanContent = (content: string) => {
    return content
      .replace(/^#+\s*/, '') // 移除开头的markdown标题符号
      .replace(/^\*\*.*?\*\*\s*\n?/, '') // 移除开头的粗体标题
      .trim()
  }

  // 生成默认内容的函数
  const generateDefaultDaily = () => {
    const hours = formData.study_schedule.daily_hours
    const firstSubject = formData.subject_order[0]?.subject || '民法'
    
    // 根据科目选择具体章节
    const getSpecificChapter = (subject) => {
      const chapterMap = {
        '民法': '民法总则编第一章自然人',
        '刑法': '刑法总则第一章刑法的任务基本原则和适用范围',
        '行政法': '行政法第一章行政法基本理论',
        '民事诉讼法': '民事诉讼法第一章总则',
        '刑事诉讼法': '刑事诉讼法第一章任务和基本原则',
        '商经法': '公司法第一章总则',
        '理论法': '法理学第一章法学和法理学',
        '三国法': '国际公法第一章导论'
      }
      return chapterMap[subject] || '民法总则编第一章自然人'
    }
    
    const specificChapter = getSpecificChapter(firstSubject)
    
    return `📅 ${new Date().toLocaleDateString()} 学习计划 (总时长${hours}小时)

🎯 今日学习目标 (5分钟)
📖 知识导图预习：浏览"${specificChapter}"在知识框架中的位置
🔍 明确目标：深入掌握${specificChapter}的核心内容

📚 客观题学习 (${Math.round(hours * 60 * 0.8)}分钟 - 80%时间)
**具体章节学习：${specificChapter}**
• 重点法条梳理：该章节的核心法律条文
• 配套教材精读：深入理解法条背景和适用
• 真题练习：练习${specificChapter}对应的历年客观题真题
• 知识导图：查看该章节在整体知识体系中的位置
• AI问答：针对重难点法条进行深度提问

✍️ 主观题学习 (${Math.round(hours * 60 * 0.2)}分钟 - 20%时间)
• 案例分析：学习与${specificChapter}相关的主观题解题方法
• 答题技巧：掌握该知识点在主观题中的考查方式
• 模板记忆：背诵相关主观题答题模板

📝 学习总结 (5分钟)
• 整理${specificChapter}的重点法条和知识点笔记
• 标记疑难问题，准备明日AI问答`
  }

  const generateDefaultWeekly = () => {
    const days = formData.study_schedule.weekly_days
    const hours = formData.study_schedule.daily_hours
    const firstSubject = formData.subject_order[0]?.subject || '民法'
    
    // 根据科目获取具体章节列表
    const getWeeklyChapters = (subject) => {
      const chapterMap = {
        '民法': [
          '民法总则编第一章自然人',
          '民法总则编第二章法人', 
          '民法总则编第三章非法人组织',
          '民法总则编第四章民事权利',
          '民法总则编第五章民事法律行为'
        ],
        '刑法': [
          '刑法总则第一章刑法的任务基本原则和适用范围',
          '刑法总则第二章犯罪',
          '刑法总则第三章刑罚',
          '刑法分则第一章危害国家安全罪',
          '刑法分则第二章危害公共安全罪'
        ],
        '行政法': [
          '行政法第一章行政法基本理论',
          '行政法第二章行政法主体', 
          '行政法第三章行政行为',
          '行政法第四章行政程序',
          '行政法第五章行政复议'
        ]
      }
      return chapterMap[subject] || chapterMap['民法']
    }
    
    const weeklyChapters = getWeeklyChapters(firstSubject)
    
    return `🗓️ 本周学习计划

🎯 本周目标：完成${firstSubject}核心章节系统学习
⏰ 预计总时长：${hours * days}小时（每天${hours}小时 × ${days}天）

📚 每日具体安排：
${Array.from({length: days}, (_, i) => {
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const specificChapter = weeklyChapters[i] || weeklyChapters[0]
  return `
📖 ${dayNames[i]}：${specificChapter}
• 客观题学习（${Math.round(hours * 60 * 0.8)}分钟）：
  - 重点法条梳理和理解
  - 配套教材精读
  - 真题练习：${specificChapter}相关客观题
  - 知识导图查看：该章节知识框架
• 主观题学习（${Math.round(hours * 60 * 0.2)}分钟）：
  - 案例分析方法
  - 答题技巧掌握
• AI问答：针对该章节重难点法条深度提问`
}).join('\n')}

💡 本周学习要点：
• 系统掌握${firstSubject}的基础理论框架
• 充分利用知识导图理解章节间的逻辑关联
• 通过AI问答深度解析每章的重难点法条
• 建立完整的${firstSubject}学习笔记体系`
  }

  return {
    overallStrategy: cleanContent(overallStrategy) || `🎯 学习计划总体策略

📊 当前进度分析：
• 当前重点科目：${formData.subject_order[0]?.subject || '民法'}
• 学习方式：遵循80%客观题 + 20%主观题的科学配比
• 时间安排：每日${formData.study_schedule.daily_hours}小时，每周${formData.study_schedule.weekly_days}天

🎯 具体学习目标：
• 专注完成${formData.subject_order[0]?.subject || '民法'}的系统学习，一个科目完全掌握后再进行下一个
• 深入掌握每个具体章节的核心法条和适用要点
• 通过知识导图建立章节间的逻辑关联
• 充分利用AI问答功能解决重难点法条疑问

📚 科学学习策略：
• 章节化学习：严格按照具体章节名称进行系统学习
• 理论实践结合：学完理论立即进行对应真题练习
• 知识体系化：通过知识导图理解章节在整体框架中的位置
• 问题导向：通过AI问答深度解析疑难概念和法条适用`,
    
    dailyPlan: cleanContent(dailyPlan) || generateDefaultDaily(),
    
    weeklyPlan: cleanContent(weeklyPlan) || generateDefaultWeekly(),
    
    generatedAt: today.toISOString(),
    settings: {
      dailyHours: formData.study_schedule.daily_hours,
      weeklyDays: formData.study_schedule.weekly_days,
      subjects: formData.subject_order.map((item: any) => item.subject)
    }
  }
}