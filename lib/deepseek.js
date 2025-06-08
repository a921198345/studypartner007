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
  // 构建系统提示词
  const systemPrompt = `你是一个专业的法律考试助手，帮助用户解答法律考试相关问题。
请基于提供的上下文信息进行回答。如果上下文中没有足够信息，请使用你的法律知识作答，但要明确告知用户你的回答部分是基于一般法律知识而非特定资料。
回答要专业、准确，引用相关法条和案例。对于法条，请精确引用条款号和具体内容。
回答要有层次感，使用适当的标题、分点和段落使内容更清晰。`;

  // 构建上下文部分
  let contextText = '';
  if (context && context.length > 0) {
    contextText = `以下是与问题相关的参考资料：\n\n${context.join('\n\n')}\n\n`;
  }

  // 完整提示词
  return `${systemPrompt}\n\n${contextText}用户问题: ${question}`;
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

    // 在开发环境中模拟回答
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_AI_RESPONSE === 'true') {
      console.log('开发环境：使用模拟回答');
      return generateMockAnswer(prompt);
    }

    // 从环境变量获取API URL，如果没有则使用默认值
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    
    console.log('调用DeepSeek API生成回答...');
    
    const response = await axios.post(
      apiUrl,
      {
        model: 'deepseek-chat',  // 使用DeepSeek的对话模型
        messages: [
          { role: 'system', content: '你是一个专业的法律考试助手' },
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
    
    // 开发环境下可以返回模拟回答
    if (process.env.NODE_ENV === 'development') {
      console.log('API调用失败，使用模拟回答');
      return generateMockAnswer(prompt);
    }
    
    throw new Error('生成回答时出现错误，请稍后重试');
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

    // 在开发环境中模拟流式回答
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_AI_RESPONSE === 'true') {
      console.log('开发环境：使用模拟流式回答');
      return generateMockStream(prompt);
    }

    // 使用DeepSeek API URL
    // 注意：这里使用了聊天完成接口
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
          { role: 'system', content: '你是一个专业的法律考试助手，请提供准确、专业的法律回答，引用相关法条和案例。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    
    // 开发环境下可以返回模拟流式回答
    if (process.env.NODE_ENV === 'development') {
      console.log('API调用失败，使用模拟流式回答');
      return generateMockStream(prompt);
    }
    
    throw new Error('生成流式回答时出现错误，请稍后重试');
  }
}

/**
 * 生成模拟回答（用于开发/测试）
 * @param {string} prompt - 提示词
 * @returns {string} - 模拟的回答
 */
function generateMockAnswer(prompt) {
  // 简单地提取问题用于生成有关联性的回答
  const question = prompt.includes('用户问题:') 
    ? prompt.split('用户问题:')[1].trim() 
    : prompt;
  
  // 基于问题生成不同的回答
  if (question.includes('合同') || question.includes('协议')) {
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

/**
 * 生成模拟流式回答（用于开发/测试）
 * @param {string} prompt - 提示词
 * @returns {ReadableStream} - 模拟的流式回答
 */
function generateMockStream(prompt) {
  // 获取模拟回答内容
  const answer = generateMockAnswer(prompt);
  
  // 创建一个 TransformStream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  // 模拟流式输出，每100ms发送一小段文本
  const chunks = answer.split(' ');
  let currentIndex = 0;
  
  const interval = setInterval(() => {
    if (currentIndex < chunks.length) {
      const chunk = chunks[currentIndex] + ' ';
      const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
      writer.write(new TextEncoder().encode(data));
      currentIndex++;
    } else {
      clearInterval(interval);
      writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
      writer.close();
    }
  }, 100);
  
  return readable;
}

export default {
  generateAnswer,
  generateAnswerStream,
  buildPrompt
}; 