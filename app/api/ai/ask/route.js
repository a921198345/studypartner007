import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, queryOne } from '@/lib/db.js';
import { processImage, isValidImage } from '@/lib/ocr.js';
import { logUserQuestion } from '@/lib/ai-log.js';
import { getTextEmbedding } from '@/lib/embeddings.js';
import { searchVectorChunks, searchByKeywords } from '@/lib/vector-search.js';

// AI问答POST接口
export async function POST(request) {
  try {
    // 1. 获取会话，检查用户是否登录
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        message: '请先登录再使用AI问答功能'
      }, { status: 401 });
    }

    // 2. 解析请求数据
    const formData = await request.formData();
    const question_text = formData.get('question_text');
    const image_file = formData.get('image_file');
    const subject = formData.get('subject') || '民法'; // 获取学科，默认为民法
    
    // 开发环境启用模拟向量模式
    if (process.env.NODE_ENV === 'development') {
      process.env.MOCK_EMBEDDINGS = 'true';
    }
    
    // 3. 参数验证
    if (!question_text && !image_file) {
      return NextResponse.json({
        success: false,
        message: '请提供问题文本或图片'
      }, { status: 400 });
    }
    
    // 3.1 验证图片类型和大小
    if (image_file && !isValidImage(image_file)) {
      return NextResponse.json({
        success: false,
        message: '图片格式无效或尺寸过大，请上传5MB以内的JPG、PNG、GIF或WEBP格式图片'
      }, { status: 400 });
    }
    
    // 4. 检查用户会员状态和使用权限
    const userId = session.user.id;
    const userStatus = await checkUserMembershipStatus(userId);
    
    // 4.1 检查是否超过每日限制
    if (userStatus.hasReachedLimit) {
      return NextResponse.json({
        success: false,
        message: '您今日免费使用次数已用完，请升级会员继续使用',
        data: {
          usageInfo: {
            dailyUsed: userStatus.queriesUsed,
            dailyLimit: userStatus.dailyLimit
          }
        }
      }, { status: 403 });
    }
    
    // 5. 处理图片 (如果有)
    let combinedText = question_text || '';
    if (image_file) {
      try {
        // 调用OCR处理图片
        const extractedText = await processImage(image_file);
        if (extractedText) {
          combinedText = combinedText 
            ? `${combinedText}\n\n图片内容：${extractedText}` 
            : `图片内容：${extractedText}`;
        }
      } catch (ocrError) {
        console.error('OCR处理失败:', ocrError);
        // OCR失败时继续处理，但记录错误
      }
    }
    
    // 6. 内容审核 - 检查问题是否含有不良内容
    const moderationResult = await moderateContent(combinedText);
    if (!moderationResult.isAllowed) {
      return NextResponse.json({
        success: false,
        message: `内容审核未通过: ${moderationResult.reason}`
      }, { status: 403 });
    }
    
    // 7. 更新用户的AI问答使用次数
    await updateUserQuestionCount(userId);
    
    // 8. 记录用户问题到数据库
    const sessionId = formData.get('session_id') || null;
    const chatId = await logUserQuestion(
      userId, 
      sessionId,
      combinedText,
      image_file ? 'pending_image_url' : null  // 实际项目中可以存储图片到CDN并记录URL
    );
    
    // 9. 任务6.2: 向量化问题并检索相关上下文
    console.log(`开始向量化问题: "${combinedText.substring(0, 50)}${combinedText.length > 50 ? '...' : ''}"`);
    const questionVector = await getTextEmbedding(combinedText);
    
    // 获取相关知识库内容
    let contextChunks = [];
    let searchMethod = '';
    
    if (questionVector) {
      // 如果成功获取向量，使用向量搜索
      console.log('使用向量搜索相似内容...');
      contextChunks = await searchVectorChunks(subject, questionVector, 5);
      searchMethod = 'vector';
    } else {
      // 如果向量获取失败，回退到关键词搜索
      console.log('向量化失败，使用关键词搜索相似内容...');
      contextChunks = await searchByKeywords(combinedText, subject, 5);
      searchMethod = 'keyword';
    }
    
    // 整合上下文
    const contextTexts = contextChunks.map(chunk => chunk.original_text || '');
    
    // 提取关键知识点，可用于后续可视化
    const knowledgePaths = contextChunks
      .filter(chunk => chunk.path)
      .map(chunk => chunk.path);
    
    const uniqueKnowledgePaths = [...new Set(knowledgePaths)];
    
    // 10. 准备响应
    return NextResponse.json({
      success: true,
      message: '问题已接收，正在处理',
      data: {
        question_text: combinedText,
        session_id: sessionId || `new_session_${Date.now()}`,
        chat_id: chatId,
        subject: subject,
        usageInfo: {
          dailyUsed: userStatus.queriesUsed + 1,  // +1 因为已经增加了使用次数
          dailyLimit: userStatus.dailyLimit
        },
        context: {
          texts: contextTexts,
          knowledge_points: uniqueKnowledgePaths,
          search_method: searchMethod,
          has_relevant_context: contextTexts.length > 0,
          context_count: contextTexts.length
        }
      }
    });
    
  } catch (error) {
    console.error('AI问答处理错误:', error);
    return NextResponse.json({
      success: false,
      message: '服务器错误，请稍后重试'
    }, { status: 500 });
  }
}

/**
 * 检查用户会员状态和使用权限
 */
async function checkUserMembershipStatus(userId) {
  try {
    // 获取用户信息
    const user = await queryOne(
      `SELECT u.membership_status, u.membership_expiry_date, 
              u.daily_ai_queries_used, u.last_ai_query_date 
       FROM users u 
       WHERE u.id = ?`,
      [userId]
    );
    
    if (!user) {
      throw new Error('找不到用户信息');
    }
    
    // 检查今日是否已重置计数
    const today = new Date().toISOString().split('T')[0];
    const lastQueryDate = user.last_ai_query_date
      ? new Date(user.last_ai_query_date).toISOString().split('T')[0]
      : null;
    
    // 如果是新的一天，重置计数
    if (lastQueryDate !== today) {
      await query(
        'UPDATE users SET daily_ai_queries_used = 0, last_ai_query_date = ? WHERE id = ?',
        [new Date(), userId]
      );
      user.daily_ai_queries_used = 0;
    }
    
    // 检查会员状态
    const isMember = user.membership_status === 'active_member' && 
                     (!user.membership_expiry_date || new Date(user.membership_expiry_date) > new Date());
    
    // 检查免费用户的使用次数限制
    const hasReachedLimit = !isMember && user.daily_ai_queries_used >= 2;
    
    return {
      isMember,
      hasReachedLimit,
      queriesUsed: user.daily_ai_queries_used,
      dailyLimit: isMember ? null : 2
    };
  } catch (error) {
    console.error('检查用户会员状态错误:', error);
    throw error;
  }
}

/**
 * 更新用户的AI问答使用次数
 */
async function updateUserQuestionCount(userId) {
  try {
    await query(
      'UPDATE users SET daily_ai_queries_used = daily_ai_queries_used + 1, last_ai_query_date = NOW() WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('更新用户问答次数错误:', error);
    throw error;
  }
}

/**
 * 内容审核 - 检查是否包含不良内容
 */
async function moderateContent(text) {
  // 基础关键词过滤逻辑
  const bannedKeywords = ['赌博', '色情', '暴力', '政治敏感', '诈骗'];
  
  for (const keyword of bannedKeywords) {
    if (text.includes(keyword)) {
      return {
        isAllowed: false,
        reason: `内容包含不适当的词语: ${keyword}`
      };
    }
  }
  
  // 检查是否是法律相关问题 (可以使用更复杂的逻辑)
  const legalKeywords = ['法律', '法条', '案例', '条款', '合同', '诉讼', '权利', '义务', 
                         '犯罪', '刑事', '民事', '行政', '诉讼', '法院', '判决', '律师'];
  
  let hasLegalContext = false;
  for (const keyword of legalKeywords) {
    if (text.includes(keyword)) {
      hasLegalContext = true;
      break;
    }
  }
  
  if (!hasLegalContext && text.length > 10) { // 短问题不做主题检查
    return {
      isAllowed: true, // 暂时允许非法律问题，但可以根据需求调整
      reason: '提醒：你的问题似乎与法律考试无关。AI将尽力回答，但建议提问法考相关内容以获得更专业的解答。'
    };
  }
  
  return { isAllowed: true };
} 