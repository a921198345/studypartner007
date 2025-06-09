/**
 * DeepSeek API 交互模块
 * 
 * 提供与DeepSeek对话API交互的功能，用于生成AI回答
 */

import axios from 'axios';

/**
 * 构建提示词
 * @param {string} question - 用户问题
 * @param {Array<string>} context - 相关上下文数组
 * @returns {string} - 完整的提示词
 */
export function buildPrompt(question, context = []) {
  // 构建专业的系统提示词，专门针对法考学生
  const systemPrompt = `你是一名专业的法考辅导老师，专门帮助法律职业资格考试考生解答疑问。你的回答需要：

**核心要求：**
1. 专业准确：基于最新的法律法规和司法解释
2. 考试导向：重点突出法考重点和考点
3. 逻辑清晰：使用条理化的结构组织答案
4. 实用性强：结合具体案例和解题技巧

**回答格式：**
1. **法条依据**：精确引用相关法条条文（包括条款号）
2. **重点解析**：分析法条的关键要素和适用条件
3. **考试要点**：标明该知识点在法考中的重要程度和常见考法
4. **案例分析**：结合典型案例帮助理解（如有）
5. **记忆技巧**：提供便于记忆的方法或口诀（如适用）

**注意事项：**
- 如果上下文资料不足，请明确标注哪些内容是基于一般法律知识
- 对于有争议的法律问题，请说明不同观点
- 适当提醒考生注意相关的易混淆概念
- 使用专业法律术语，但确保表达清晰易懂`;

  // 构建上下文部分
  let contextText = '';
  if (context && context.length > 0) {
    contextText = `**相关法律资料：**\n${context.map((ctx, index) => `${index + 1}. ${ctx}`).join('\n\n')}\n\n`;
  }

  // 完整提示词
  return `${systemPrompt}\n\n${contextText}**考生问题：** ${question}\n\n请根据上述要求为这位法考考生提供专业、详细的解答。`;
}

/**
 * 调用DeepSeek API生成回答
 * @param {string} prompt - 完整的提示词
 * @returns {Promise<string>} - AI生成的回答
 */
export async function generateAnswer(prompt) {
  try {
    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('未设置DEEPSEEK_API_KEY环境变量');
    }


    // 从环境变量获取API URL，如果没有则使用默认值
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    
    console.log('调用DeepSeek API生成回答...');
    
    const response = await axios.post(
      apiUrl,
      {
        model: 'deepseek-chat',  // 使用DeepSeek的对话模型
        messages: [
          { role: 'system', content: '你是一名专业的法考辅导老师，专门为法律职业资格考试考生提供准确、专业、考试导向的法律知识解答。请严格按照用户要求的格式和标准回答问题。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000 // 60秒超时
      }
    );

    // 检查响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      console.error('API响应格式无效:', response.data);
      throw new Error('API响应格式无效');
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.message);
    
    // 如果是API请求错误且有响应，打印更多信息
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
    }
    
    throw new Error(`DeepSeek API错误: ${error.message}`);
  }
}

/**
 * 生成流式回答
 * @param {string} prompt - 完整的提示词
 * @returns {ReadableStream} - 流式回答
 */
export async function generateAnswerStream(prompt) {
  try {
    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('未设置DEEPSEEK_API_KEY环境变量');
    }
    
    // 调试：显示API密钥的后4位
    console.log('当前使用的API密钥后4位:', apiKey.slice(-4));


    // 使用DeepSeek API URL
    const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    console.log('调用DeepSeek API生成流式回答...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一名专业的法考辅导老师，专门为法律职业资格考试考生提供准确、专业、考试导向的法律知识解答。请严格按照用户要求的格式和标准回答问题。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,  // 降低温度以获得更准确的回答
        max_tokens: 1500,  // 控制回答长度
        top_p: 0.8,        // 使用nucleus sampling提高质量
        stream: true  // 启用流式输出
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API错误:', errorData);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    // 返回流式响应
    return response.body;
  } catch (error) {
    console.error('DeepSeek流式API调用失败:', error.message);
    
    // 如果是API请求错误且有响应，打印更多信息
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
    }
    
    throw new Error(`DeepSeek 流式 API错误: ${error.message}`);
  }
}

// 已移除模拟回答函数
function generateMockAnswer_removed(prompt) {
  // 简单地提取问题用于生成有关联性的回答
  const question = prompt.includes('**考生问题：**') 
    ? prompt.split('**考生问题：**')[1].trim() 
    : prompt;
  
  // 基于问题生成不同的回答
  if (question.includes('抵押权') || question.includes('抵押')) {
    return `## 📖 抵押权重点考点详解

### **法条依据**
《民法典》第十六章 抵押权（第394条-第419条）

### **核心概念**
抵押权是指债权人对于债务人或者第三人不转移占有的担保财产，在债务人不履行到期债务或者发生当事人约定的实现抵押权的情形时，依法享有就该财产优先受偿的权利。

### **重点解析**

**1. 抵押权的设立（第394-395条）**
- **生效要件**：
  - 不动产抵押：抵押合同 + 办理抵押登记
  - 动产抵押：抵押合同生效时设立
- **抵押合同内容**：被担保债权的种类和数额、债务人履行债务的期限、抵押财产的名称数量等

**2. 抵押财产（第395-400条）**
- **可抵押财产**：
  - 建筑物和其他土地附着物
  - 建设用地使用权
  - 生产设备、原材料、半成品、产品
  - 正在建造的建筑物、船舶、航空器
  - 交通运输工具
- **禁止抵押财产**：
  - 土地所有权
  - 学校、医院等公益设施
  - 被查封、扣押、监管的财产

**3. 抵押权的效力（第401-408条）**
- **对抵押财产的效力**：抵押权设立后，抵押财产转让的，抵押权不受影响
- **抵押权的顺位**：同一财产向两个以上债权人抵押的，拍卖、变卖抵押财产所得的价款按照登记的时间先后确定清偿顺序
- **抵押权与租赁权**：抵押权设立前抵押财产已经出租并转移占有的，原租赁关系不受该抵押权的影响

**4. 抵押权的实现（第410-419条）**
- **实现条件**：债务履行期限届满前，债务人或者抵押人在合理期限内仍不清偿债务或者发生当事人约定的实现抵押权的情形
- **实现方式**：与抵押人协议以抵押财产折价或者以拍卖、变卖该抵押财产所得的价款优先受偿

### **考试要点**

**高频考点：**
1. **抵押权的设立要件**：不动产抵押以登记为生效要件
2. **抵押财产的范围**：能够抵押的财产和禁止抵押的财产
3. **抵押权的顺位**：多个抵押权的清偿顺序
4. **抵押权的实现**：实现条件和方式

**易错点提醒：**
- 动产抵押不需要登记，合同生效时设立
- 抵押权设立后，抵押人可以转让抵押财产，但不影响抵押权
- 先登记的抵押权优于后登记的抵押权

### **典型案例分析**
甲公司向银行借款1000万元，以其厂房设定抵押：
- **抵押权设立**：需签订抵押合同并办理不动产登记
- **抵押权效力**：即使甲公司转让厂房，银行抵押权仍然存在
- **抵押权实现**：甲公司到期不还款时，银行可申请拍卖厂房优先受偿

### **记忆技巧**
**"抵押三要素"**：
1. **不转移占有** - 抵押人仍可使用抵押财产
2. **登记生效** - 不动产抵押权以登记为准
3. **优先受偿** - 抵押权人享有优先清偿权

### **与其他担保物权的区别**
| 担保方式 | 占有转移 | 生效条件 | 适用财产 |
|---------|---------|---------|---------|
| 抵押权 | 不转移 | 登记(不动产)/合同(动产) | 不动产、动产 |
| 质权 | 转移 | 交付 | 动产、权利 |
| 留置权 | 已占有 | 法定 | 动产 |

💡 **考试提示**：抵押权是担保物权的核心，既有客观题考查具体规定，也有主观题结合案例分析，务必掌握设立、效力、实现的完整体系。`;
  } else if (question.includes('担保物权') || question.includes('质押') || question.includes('留置')) {
    return `## 📖 担保物权考点详解

### **法条依据**
根据《民法典》第三编第十六章至第十八章的规定，担保物权包括抵押权、质权和留置权。

### **重点解析**

**1. 抵押权（第十六章）**
- **设立条件**：《民法典》第394条-395条
  - 抵押合同 + 登记生效（不动产）/ 合同生效（动产）
  - 抵押财产须为抵押人所有或有权处分
- **抵押财产范围**：建筑物、建设用地使用权、生产设备、原材料等
- **禁止抵押财产**：土地所有权、学校等公益设施、被查封财产

**2. 质权（第十七章）**
- **动产质权**：质物交付 + 质押合同
- **权利质权**：权利凭证交付或登记
- **质权人义务**：妥善保管质物，不得擅自使用

**3. 留置权（第十八章）**
- **成立要件**：债权人合法占有债务人动产 + 债权与动产有牵连关系
- **行使条件**：债务履行期届满 + 催告程序（2个月以上）

### **考试要点**

**高频考点：**
1. **抵押权登记效力**：不动产抵押权以登记为生效要件
2. **抵押权顺位**：按登记时间确定清偿顺序
3. **质权实现**：质权人有权就质物优先受偿
4. **留置权行使**：须履行催告义务，期限不得少于2个月

**易错点提醒：**
- 抵押权设立≠抵押权实现，注意区分
- 质押与抵押的关键区别：是否转移占有
- 留置权的牵连性要求：债权与留置物须有法律上关联

### **案例分析**
甲向银行贷款，以房屋设定抵押。此时：
- 抵押权设立：需签订抵押合同并办理登记
- 抵押权效力：银行享有优先受偿权
- 抵押权实现：甲违约时，银行可申请拍卖房屋

### **记忆技巧**
**"三权口诀"**：
- 抵押不转移，登记是关键
- 质押要交付，权利可登记  
- 留置有牵连，催告须两月

💡 **考试提示**：担保物权是物权法重点章节，客观题常考设立条件和效力，主观题常结合合同法考查担保合同效力。`;
  } else if (question.includes('合同') || question.includes('协议')) {
    return `根据《民法典》第四百六十九条，当事人订立合同，可以采用书面形式、口头形式或者其他形式。
    
书面形式是指合同书、信件、电报、电传、传真等可以有形地表现所载内容的形式。
    
以电子数据交换、电子邮件等方式能够有形地表现所载内容，并可以随时调取查用的数据电文，视为书面形式。
    
关于合同效力，《民法典》第一百四十三条规定，具备以下条件的民事法律行为有效：
1. 行为人具有相应的民事行为能力
2. 意思表示真实
3. 不违反法律、行政法规的强制性规定，不违背公序良俗

希望这个解答对你有所帮助！`;
  } else if (question.includes('刑法') || question.includes('犯罪')) {
    return `《刑法》第十三条规定，一切危害国家主权、领土完整和安全，分裂国家、颠覆人民民主专政的政权和推翻社会主义制度，破坏社会秩序和经济秩序，侵犯国有财产或者劳动群众集体所有的财产，侵犯公民私人所有的财产，侵犯公民的人身权利、民主权利和其他权利，以及其他危害社会的行为，依照法律应当受刑罚处罚的，都是犯罪，但是情节显著轻微危害不大的，不认为是犯罪。
    
犯罪构成要件包括：
1. 客体要件：行为侵犯的是刑法所保护的社会关系
2. 客观要件：行为人实施了危害社会的行为
3. 主体要件：行为人达到法定责任年龄且具有刑事责任能力
4. 主观要件：行为人对自己行为持故意或过失的心理态度

希望这个回答对你的法考学习有所帮助！`;
  } else {
    return `根据你的问题，我需要从法律角度为你解答。

在法考中，这类问题主要涉及以下法律要点：
1. 相关法条分析：首先要明确适用的法条和法律规定
2. 案例结合：通过典型案例理解法条的实际应用
3. 法理解释：从法理学角度分析法律条文的目的和精神

解题思路：
- 首先明确案件事实和争议焦点
- 其次找出适用的法律规定
- 然后进行法律推理，得出结论
- 最后检验结论的合理性

希望这个思路对你的法考备考有所帮助！如果有更具体的问题，欢迎继续提问。`;
  }
}

// 已移除模拟流式回答函数
function generateMockStream_removed(prompt) {
  // 获取模拟回答内容
  const answer = generateMockAnswer(prompt);
  
  // 创建一个 ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // 将答案分成更小的块，模拟真实的流式输出
      const words = answer.split('');
      const chunkSize = 5; // 每次发送5个字符
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join('');
        
        // 模拟DeepSeek的响应格式
        const data = {
          choices: [{
            delta: {
              content: chunk
            },
            index: 0
          }]
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        
        // 添加小延迟以模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      // 发送完成标记
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  
  return stream;
}

export default {
  generateAnswer,
  generateAnswerStream,
  buildPrompt
}; 