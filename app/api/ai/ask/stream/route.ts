import { NextRequest } from 'next/server';
import { Readable } from 'stream';

// 设置能够流式响应的headers
export const headers = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*', // 允许跨域请求
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 模拟一些法律相关的回答，以便测试流式响应效果
const SAMPLE_ANSWERS = {
  default: "我是您的法考助手，请问有什么法律问题需要解答？",
  "民法": "根据《民法典》的相关规定，这个问题涉及到民事权利的保护和民事责任的承担...",
  "刑法": "在刑法中，这个问题涉及到罪刑法定原则和刑事责任的认定...",
  "合同法": "根据合同法的相关规定，合同自由原则是基本原则之一，但也要受到法律的限制...",
  "物权法": "物权法规定物权是权利人依法对特定物享有直接支配和排他的权利...",
  "婚姻法": "婚姻法强调婚姻自由、一夫一妻、男女平等等基本原则...",
  "侵权责任": "侵权责任法规定行为人因过错侵害他人民事权益应当承担侵权责任...",
  "执行法": "执行程序是保障胜诉当事人权益的最后一道防线，对于'老赖'等失信被执行人，法律规定了一系列强制措施和信用惩戒手段...",
};

// 将文本按字符分割，并添加一些延迟，以模拟流式传输
function createResponseStream(text: string) {
  // 将回答按句子分割
  const sentences = text.split(/(?<=[。！？：；])/);
  
  // 返回一个异步生成器函数
  return async function* () {
    for (const sentence of sentences) {
      // 每个句子发送作为一个块
      yield sentence;
      
      // 添加一些随机延迟，使流式效果更自然
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    }
  };
}

// 生成完整的回答文本
function generateAnswer(question: string) {
  // 根据问题内容匹配最相关的领域
  let domain = "default";
  const keywords = [
    { key: "民法", terms: ["民法", "合同", "债务", "侵权", "物权", "婚姻", "老赖", "执行难", "债权人"] },
    { key: "刑法", terms: ["刑法", "犯罪", "刑罚", "量刑", "刑事"] },
    { key: "合同法", terms: ["合同", "协议", "违约", "订立", "效力"] },
    { key: "物权法", terms: ["物权", "所有权", "抵押", "质押", "占有"] },
    { key: "婚姻法", terms: ["婚姻", "离婚", "家庭", "子女", "继承"] },
    { key: "侵权责任", terms: ["侵权", "损害", "赔偿", "责任"] },
    { key: "执行法", terms: ["执行", "老赖", "失信被执行人", "强制执行", "执行难", "拒不执行"] },
  ];
  
  // 特殊问题处理
  if (question.includes("老赖") || question.includes("执行") || question.includes("失信")) {
    domain = "执行法";
  } else {
    // 找出问题中包含哪个领域的关键词最多
    for (const { key, terms } of keywords) {
      if (terms.some(term => question.includes(term))) {
        domain = key;
        break;
      }
    }
  }
  
  // 根据问题构建一个模拟回答
  let answer = SAMPLE_ANSWERS[domain] || SAMPLE_ANSWERS.default;
  
  // 为"执行法"领域添加特定回答
  if (domain === "执行法") {
    answer = "关于失信被执行人(俗称'老赖')的问题，根据《中华人民共和国民事诉讼法》和最高人民法院相关司法解释的规定：\n\n";
    answer += "1. 法院可以对有履行能力而拒不履行生效法律文书确定义务的被执行人采取强制措施；\n\n";
    answer += "2. 对失信被执行人，法院可以将其纳入失信被执行人名单，并依法对其采取限制消费、限制出境等措施；\n\n";
    answer += "3. 情节严重的，构成'拒不执行判决、裁定罪'，可能面临刑事处罚。";
  }
  
  // 添加一些基于问题的具体内容
  answer += `\n\n您问的是："${question}"\n\n`;
  answer += "让我详细解答这个问题：\n\n";
  
  // 添加一些法律条文引用和解释
  answer += "1. 法律依据：\n";
  if (domain === "民法") {
    answer += "《中华人民共和国民法典》第一条规定：\"为了保护民事主体的合法权益，调整民事关系，维护社会和经济秩序，适应中国特色社会主义发展要求，弘扬社会主义核心价值观，根据宪法，制定本法。\"\n\n";
    answer += "第二条规定：\"民法调整平等主体的自然人、法人和非法人组织之间的人身关系和财产关系。\"\n\n";
  } else if (domain === "刑法") {
    answer += "《中华人民共和国刑法》第二条规定：\"中华人民共和国刑法的任务，是用刑罚同一切犯罪行为作斗争，以保卫国家安全，保卫人民民主专政的政权和社会主义制度，保护国有财产和劳动群众集体所有的财产，保护公民私人所有的财产，保护公民的人身权利、民主权利和其他权利，维护社会秩序、经济秩序，保障社会主义建设事业的顺利进行。\"\n\n";
  }
  
  // 添加一些案例分析
  answer += "2. 案例分析：\n";
  answer += "在\"某某诉某某案\"(2020最高法民再123号)中，最高人民法院认为...\n\n";
  
  // 添加实务建议
  answer += "3. 实务建议：\n";
  answer += "针对您的问题，建议您注意以下几点：\n";
  answer += "- 收集相关证据，如合同、付款凭证等\n";
  answer += "- 明确法律关系的性质和适用法律\n";
  answer += "- 考虑调解等替代性纠纷解决方式\n\n";
  
  // 添加结论
  answer += "4. 结论：\n";
  answer += "综上所述，根据相关法律规定和司法实践，对于您提出的问题，应当...\n\n";
  
  // 添加提示
  answer += "希望以上解答对您有所帮助。如有更多法律问题，请继续咨询。";
  
  return answer;
}

// 接收POST请求，获取问题文本，返回流式响应
export async function POST(req: NextRequest) {
  console.log("接收到AI问答请求");
  
  try {
    // 解析请求体
    const requestData = await req.json();
    const { question, imageBase64, sessionId } = requestData;
    
    console.log("请求参数:", { 
      question: question?.substring(0, 30), 
      hasImage: !!imageBase64, 
      sessionId 
    });

    // 验证请求参数
    if (!question && !imageBase64) {
      console.log("缺少必要的请求参数");
      return new Response(JSON.stringify({ 
        success: false, 
        message: '请提供问题文本或图片' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 创建一个可读流，用于流式传输响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 确保先发送前缀文本，让用户知道AI正在处理
          controller.enqueue(encoder.encode(`data: {"content": "正在思考您的问题："${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"\\n\\n"}\n\n`));
          
          // 生成回答
          const answer = generateAnswer(question);
          
          // 将回答按句子分割
          const sentences = answer.split(/(?<=[。！？：；])/);
          
          // 模拟流式输出
          for (const sentence of sentences) {
            if (sentence.trim().length > 0) {
              // 使用JSON格式包装响应，遵循SSE标准
              const data = JSON.stringify({ content: sentence });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              // 添加一些随机延迟，使流式效果更自然
              await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 50) + 10));
            }
          }
          
          // 发送完成标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error("流式响应生成错误:", error);
          controller.error(error);
        }
      }
    });
    
    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: '处理请求时出错' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

// 生成民法学科的示例回答
function generateCivilLawAnswer(question: string, imageBase64?: string): string {
  // 如果有图片，处理图片相关回答
  if (imageBase64) {
    return `Based on the image${question ? ' and the question' : ''}, this involves a **Property Rights Law** issue in civil law.

In the Property Rights section of the Civil Code, there are specific provisions regarding this:

1. **Principle of Absolute Right**: The types and contents of rights are stipulated by law. This is one of the basic principles of the Civil Code, as stipulated in Article 207 of the Civil Code.

2. **Protection of Ownership**: Owners have the right to directly control and exclude others from their immovable or movable property. This is stipulated in Article 240 of the Civil Code.

3. **Neighboring Relations**: Neighbors should handle their relations in accordance with the principles of mutual assistance, fairness, and convenience.

If you want to learn more about this issue, you can refer to the following legal provisions:
- Article 207 (Principle of Absolute Right) of the Civil Code
- Article 240 (Contents of Ownership) of the Civil Code
- Article 288 (General Principles of Neighboring Relations) of the Civil Code

I hope this helps! If you have more specific questions, feel free to continue asking.`;
  }

  // 根据问题内容生成回答
  if (question.includes('合同') || question.includes('协议')) {
    return `关于您的合同问题，我从民法角度分析如下：

**合同订立**需要当事人的意思表示一致。根据《民法典》第四百七十条，合同可以书面形式、口头形式或者其他形式订立。

在合同履行过程中，应当遵循**诚信原则**。《民法典》第七条明确规定，民事主体在进行民事活动时，应当遵循诚信原则。

如果一方不履行合同义务或者履行合同义务不符合约定的，应当承担**违约责任**。根据《民法典》第五百七十七条，当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。

希望以上信息对您有所帮助！如果您有更具体的问题，请随时继续咨询。`;
  } else if (question.includes('侵权') || question.includes('损害赔偿')) {
    return `关于您的侵权责任问题，根据《民法典》的规定：

1. **侵权责任的构成要件**一般包括：
   - 行为人实施了侵权行为
   - 受害人受到了损害
   - 侵权行为与损害之间存在因果关系
   - 行为人主观上有过错（特殊情况适用无过错责任）

2. **责任方式**（《民法典》第一千一百六十四条）主要有：
   - 停止侵害
   - 排除妨碍
   - 消除危险
   - 返还财产
   - 恢复原状
   - 赔偿损失
   - 赔礼道歉
   - 消除影响、恢复名誉

3. **过错责任原则**：我国侵权法采取以过错责任为主、无过错责任为补充的归责体系。

希望以上信息对您有所帮助！如果您有更具体的问题，请随时继续咨询。`;
  } else if (question.includes('遗嘱')) {
    return `关于遗嘱问题，根据《民法典》的规定：

**遗嘱是自然人生前处分其财产的法律行为，自然人死亡时生效。**

1. **遗嘱形式**（《民法典》第一千一百三十四条至第一千一百四十二条）
   - 公证遗嘱：由遗嘱人经公证机构办理
   - 自书遗嘱：由遗嘱人亲笔书写，签名，注明年、月、日
   - 代书遗嘱：由他人代书，有两个以上见证人在场见证，由代书人、见证人签名，注明年、月、日
   - 打印遗嘱：由遗嘱人和两个以上见证人签名，注明年、月、日
   - 录音录像遗嘱：由遗嘱人和两个以上见证人清晰表达意思
   - 口头遗嘱：只适用于紧急情况，由两个以上见证人在场见证，在危急情况解除后，遗嘱人能够以书面或者录音录像形式立遗嘱的，所立的口头遗嘱无效

2. **遗嘱见证人**（《民法典》第一千一百四十三条）
   - 见证人不能是无民事行为能力人、限制民事行为能力人
   - 见证人不能是继承人、受遗赠人及其近亲属
   - 见证人不能是与继承人、受遗赠人有利害关系的人

3. **遗嘱效力规则**
   - 立有数份遗嘱，内容相抵触的，以最后的遗嘱为准
   - 公证遗嘱与其他形式的遗嘱内容相抵触的，优先适用公证遗嘱
   - 遗嘱应当为缺乏劳动能力又没有生活来源的继承人保留必要的遗产份额

如果您有关于特定遗嘱情况的问题，我可以提供更具体的解答。`;
  } else {
    return `在民法领域，您的问题涉及几个重要概念：

1. **民事主体**：包括自然人、法人和非法人组织，他们都可以参与民事活动，享有民事权利和承担民事义务。

2. **民事权利**：民法保护自然人的人身权利、财产权利以及其他合法权益。根据《民法典》第一百一十条，自然人享有生命权、身体权、健康权、姓名权、肖像权、名誉权、隐私权、婚姻自主权等权利。

3. **民事行为**：指能够引起民事法律关系变动的行为，包括订立合同、处分财产等。

4. **民事责任**：指民事主体因违反民事义务应当承担的法律后果，主要表现为损害赔偿、继续履行、排除妨碍等。

民法的基本原则包括平等、自愿、公平、诚信、守法以及公序良俗。

希望这些基础知识对您有所帮助。如果您有更具体的民法问题，请随时继续咨询。`;
  }
}

// 生成刑法学科的示例回答
function generateCriminalLawAnswer(question: string, imageBase64?: string): string {
  // 处理图片相关回答
  if (imageBase64) {
    return `Based on the image${question ? ' and the question' : ''}, I analyze it from the perspective of criminal law as follows:

This involves the **Conditions for Criminal Conduct** issue in criminal law. According to criminal law theory, the formation of a crime includes four aspects:

1. **Criminal Object**: It is the social relationship that the criminal act violates, including general object, similar object, and direct object.

2. **Criminal Objective Aspect**: It is the external manifestation of the criminal act, including elements such as criminal behavior, criminal result, and causal relationship.

3. **Criminal Subject**: It is the person who commits the criminal act, including general subject and special subject. According to Article 17 of the Criminal Law, a person who has reached the age of sixteen shall be criminally responsible.

4. **Criminal Subjective Aspect**: It is the subjective psychological attitude of the criminal, mainly manifested in the form of intention and negligence.

Your case needs to be analyzed from these four aspects to determine whether it constitutes a crime. If you need a more specific analysis, feel free to provide more detailed information.`;
  }

  // 根据问题内容生成回答
  if (question.includes('故意') || question.includes('过失')) {
    return `Regarding the **Intent** and **Negligence** in criminal law, this is an important part of criminal subjective aspect:

**Intent** is divided into direct intent and indirect intent:
- **Direct Intent**: Knowing that one's behavior will cause harm to society and hoping that this result will occur
- **Indirect Intent**: Knowing that one's behavior may cause harm to society and allowing this result to occur

**Negligence** is divided into gross negligence and overconfidence negligence:
- **Gross Negligence**: Should have foreseen that one's behavior may cause harm to society, but did not foresee due to negligence
- **Overconfidence Negligence**: Already foresee that one's behavior may cause harm to society, but believe that it can be avoided

The legal consequences of intentional crimes and negligent crimes are significantly different. Generally, negligent crimes are less severe than intentional crimes. And according to Article 15 of the Criminal Law, negligent crimes that should be criminally responsible, the law has explicitly stipulated that they should be criminally responsible.

I hope these information are helpful! If you have more specific questions, feel free to continue asking.`;
  } else {
    return `In the field of criminal law, your question involves several important concepts:

1. **Principle of Absolute Right**: Article 3 of the Criminal Law stipulates that crimes shall be punished according to law if they are clearly stipulated by law; crimes shall not be punished if they are not clearly stipulated by law. This is the basic principle of modern criminal law.

2. **Criminal Responsibility Age**: According to Article 17 of the Criminal Law:
   - A person who has reached the age of sixteen shall be criminally responsible
   - A person who has reached the age of fourteen but has not reached the age of sixteen and commits murder, intentional injury resulting in serious injury or death, rape, robbery, drug trafficking, arson, explosion, or the crime of deliberately releasing dangerous substances, shall be criminally responsible
   - A person who has reached the age of twelve but has not reached the age of fourteen and commits murder or intentional injury, resulting in death or causing serious injury to others with particularly cruel means, and causing serious disability with particularly serious circumstances, and has been prosecuted by the Supreme People's Procuratorate upon approval, shall be criminally responsible

3. **Types of Punishment**: The main punishment includes control, detention, imprisonment, life imprisonment, and death; the supplementary punishment includes fines, deprivation of political rights, and confiscation of property.

I hope these basic knowledge are helpful. If you have more specific criminal law questions, feel free to continue asking.`;
  }
}

// 生成其他学科的通用回答
function generateGenericAnswer(question: string, imageBase64?: string, subject: string): string {
  // 通用回答模板
  const subjectInfo: Record<string, string> = {
    '民诉法': 'Civil Procedure Law is a law that regulates civil procedural activities, mainly adjusting the legal relations formed in the process of civil litigation between the people\'s court, the parties, and other participants.',
    '刑诉法': 'Criminal Procedure Law is a law that regulates the activities of criminal litigation, and stipulates the procedural steps of the national special organs in the case filing, investigation, prosecution, trial, and execution of criminal cases.',
    '商法': 'Commercial Law is the general name of the legal norms that regulate commercial relations, including company law, bill law, insurance law, securities law, corporate bankruptcy law, etc.',
    '行政法': 'Administrative Law is a law that regulates the legal relations between administrative subjects and administrative objects, involving administrative licensing, administrative punishment, and administrative enforcement.',
    '理论法学': 'Theoretical Jurisprudence mainly studies basic theoretical issues such as jurisprudence, legal thought history, and jurisprudence sociology, which is the theoretical foundation of jurisprudence.',
    '三国法': 'Three Kingdoms Law includes international law, international private law, and international economic law, which adjust the relations between countries, international organizations, and cross-border civil and commercial relations.'
  };

  const intro = subjectInfo[subject] || `${subject} is an important part of the jurisprudence system.`;
  
  // 处理图片相关回答
  if (imageBase64) {
    return `Based on the image${question ? ' and the question' : ''}, I analyze it from the perspective of ${subject} as follows:

${intro}

Your question involves several important concepts in ${subject}:

1. **Basic Principles**: The basic principles of ${subject} include fairness, efficiency, legality, etc., which permeate the entire legal system.

2. **Core System**: ${subject} has established a series of core systems to ensure the realization and performance of rights.

3. **Practical Application**: In practical cases, it is necessary to comprehensively consider the application of laws, judicial interpretations, and typical precedents.

If you want to get a more specific analysis, I suggest providing a more detailed problem description or specific case situation. I'd be happy to provide a more in-depth legal analysis for specific issues.`;
  }

  return `Regarding your question in ${subject}, my analysis is as follows:

${intro}

From your question, it mainly involves the following aspects:

1. **Legal Basis**: The main legal basis of ${subject} includes relevant laws, judicial interpretations, and guiding cases.

2. **Basic Principles**: When dealing with such issues, it is necessary to follow the basic principles of ${subject}, such as fairness, honesty, and credit.

3. **Practical Operation**: In practical operations, it is necessary to combine procedural requirements and entity judgment to ensure the accuracy of law application.

4. **Latest Development**: In recent years, there have been new developments and changes in the field of ${subject}, including new legal regulations and judicial practices.

If you have more specific questions, feel free to continue asking, and I can provide more targeted analysis.`;
} 