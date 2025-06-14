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
export function buildPrompt(question, context = [], imageBase64 = null) {
  // 构建专业的系统提示词，专门针对法考学生，融入费曼学习法
  const systemPrompt = `你是一位深受学生喜爱的法考辅导专家，擅长用费曼学习法帮助学生理解复杂的法律概念。你的教学理念是"用最简单的语言解释最复杂的法律"。你可以分析学生上传的图片（包括题目截图、法条图片等）。

**核心教学方法 - 费曼学习法：**
1. **简单解释**：先用通俗易懂的语言解释核心概念，就像给一个没有法律背景的朋友解释
2. **生动类比**：使用生活中的例子来类比法律概念，让抽象变具体
3. **逻辑推导**：展示法条背后的逻辑，解释"为什么"而不仅是"是什么"
4. **实践应用**：通过案例展示知识如何在实践中运用

**回答结构要求：**

### 一、通俗理解（费曼式解释）
- 用最简单的语言解释这个法律概念
- 打个生活化的比方，让学生一下就明白

### 二、法条精析
- **具体条文**：《XXX法》第X条第X款："完整引用条文内容"
- **条文解读**：逐句解析关键词和法律要件
- **立法本意**：解释为什么要这样规定

### 三、生动案例
- 创造一个贴近生活、容易记忆的案例
- 案例要有趣味性，最好带有情节冲突
- 通过案例分析展示法条的具体适用

### 四、考点提炼
- **必考要点**：标注★★★（高频）、★★（中频）、★（低频）
- **易错陷阱**：提醒常见的理解误区
- **对比记忆**：与相似概念进行对比区分

### 五、记忆锦囊
- 提供朗朗上口的口诀或记忆技巧
- 总结3-5个核心要点

**教学风格要求：**
- 语言亲切自然，像朋友聊天而非照本宣科
- 多用"比如说"、"想象一下"、"举个例子"等引导语
- 适时加入鼓励语言，如"这个概念其实很简单"、"掌握了这个，你就能轻松应对考试"
- 用emoji表情增加趣味性（如 📖 法条、💡 要点、⚠️ 注意、🎯 考点）

**特别注意：**
- 法条引用必须准确到条、款、项，不能含糊
- 案例要贴近生活，避免过于学术化
- 解释要层层深入，从简单到复杂
- 始终站在学生角度思考，什么样的解释最容易理解和记忆`;

  // 构建上下文部分
  let contextText = '';
  if (context && context.length > 0) {
    contextText = `**相关法律资料：**\n${context.map((ctx, index) => `${index + 1}. ${ctx}`).join('\n\n')}\n\n`;
  }

  // 如果有图片，添加图片说明
  let imagePrompt = '';
  if (imageBase64) {
    imagePrompt = '\n\n**学生上传了一张图片。由于技术限制，我无法直接查看图片内容。请学生用文字描述图片中的题目或法条内容，我会为您详细解答。**';
  }

  // 完整提示词
  return `${systemPrompt}\n\n${contextText}${imagePrompt}\n\n**考生问题：** ${question}\n\n请根据上述要求为这位法考考生提供专业、生动、易懂的解答。记住：
1. 如果用户上传了图片，提醒他们用文字描述题目内容
2. 一定要精确引用具体法条（如《民法典》第1条第1款）
3. 创造一个有趣的生活化案例来解释
4. 用最简单的语言让零基础的人也能理解
5. 标注这个知识点在法考中的重要程度（★★★高频/★★中频/★低频）
6. 最后给出一个好记的口诀或记忆方法`;
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
          { role: 'system', content: '你是一位深受学生喜爱的法考辅导专家，擅长用费曼学习法帮助学生理解复杂的法律概念。你的教学理念是"用最简单的语言解释最复杂的法律"。请用通俗易懂的语言、生动形象的例子，帮助学生理解和记忆法律知识。回答时要：1)先用简单语言解释概念；2)精确引用法条(包括条款号)；3)举生动有趣的生活化例子；4)标注考试重点；5)提供记忆技巧。' },
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
 * @param {string} imageBase64 - Base64编码的图片（可选）
 * @returns {ReadableStream} - 流式回答
 */
export async function generateAnswerStream(prompt, imageBase64 = null) {
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
    
    // 构建消息数组
    const messages = [
      { 
        role: 'system', 
        content: '你是一位深受学生喜爱的法考辅导专家，擅长用费曼学习法帮助学生理解复杂的法律概念。你的教学理念是"用最简单的语言解释最复杂的法律"。请用通俗易懂的语言、生动形象的例子，帮助学生理解和记忆法律知识。回答时要：1)先用简单语言解释概念；2)精确引用法条(包括条款号)；3)举生动有趣的生活化例子；4)标注考试重点；5)提供记忆技巧。' 
      }
    ];
    
    // 如果有图片，提醒用户DeepSeek暂不支持图片
    if (imageBase64) {
      // DeepSeek暂不支持图片，只能处理文本
      const imageNotice = '\n\n[注意：您上传了一张图片，但DeepSeek API目前暂不支持图片识别功能。请您用文字描述图片中的题目或内容，我会为您解答。]';
      messages.push({ 
        role: 'user', 
        content: prompt + imageNotice 
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',  // DeepSeek不支持视觉模型，暂时只能处理文本
        messages: messages,
        temperature: 0.6,  // 适中温度，平衡准确性和创造性
        max_tokens: 2000,  // 增加长度以容纳详细解释和例子
        top_p: 0.85,       // 使用nucleus sampling提高质量
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