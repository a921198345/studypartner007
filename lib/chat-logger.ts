/**
 * 聊天日志记录模块 - 用于记录AI问答交互
 * 
 * 这个模块负责记录用户的问题、AI的回答、提取的知识点等信息
 * 简单易懂，适合初中生理解
 */

const db = require('../db');

/**
 * 记录完整的问答交互
 * @param {Object} params - 日志参数
 * @param {string} params.userId - 用户ID
 * @param {string} params.sessionId - 会话ID
 * @param {string} params.userQuery - 用户原始问题
 * @param {string} params.processedQuery - 处理后的问题
 * @param {string} params.aiResponse - AI回答
 * @param {Array} params.knowledgePoints - 提取的知识点
 * @param {string} params.subject - 问题所属学科
 * @param {boolean} params.success - 是否成功
 * @returns {Promise<Object>} 记录结果
 */
async function logChatInteraction(params) {
  try {
    // 1. 准备数据库记录
    const {
      userId,
      sessionId,
      userQuery,
      processedQuery,
      aiResponse,
      knowledgePoints,
      subject,
      success
    } = params;

    const timestamp = new Date();
    
    // 2. 将知识点转换为JSON字符串
    const knowledgePointsStr = JSON.stringify(knowledgePoints || []);
    
    // 3. 插入记录到数据库
    const result = await db.query(
      `INSERT INTO UserAIChatHistory (
        user_id, 
        session_id, 
        user_query_text, 
        ai_response_text, 
        timestamp, 
        related_knowledge_points
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        sessionId || `session_${Date.now()}`,
        userQuery,
        aiResponse,
        timestamp,
        knowledgePointsStr
      ]
    );
    
    // 4. 记录成功后，更新用户的问答使用次数
    if (success) {
      await updateUserQueryCount(userId);
    }
    
    console.log(`聊天记录已保存，ID: ${result.insertId}`);
    return {
      success: true,
      chatId: result.insertId,
      timestamp
    };
  } catch (error) {
    console.error('记录聊天交互失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新用户的问答使用次数
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateUserQueryCount(userId) {
  try {
    // 1. 获取当前日期（不包含时间）
    const today = new Date().toISOString().split('T')[0];
    
    // 2. 检查用户的最后问答日期
    const [user] = await db.query(
      'SELECT daily_ai_queries_used, last_ai_query_date FROM Users WHERE user_id = ?',
      [userId]
    );
    
    let queryCount = 1;
    
    // 3. 如果最后问答日期是今天，增加计数
    if (user && user.last_ai_query_date === today) {
      queryCount = user.daily_ai_queries_used + 1;
    }
    
    // 4. 更新用户的问答次数和最后问答日期
    await db.query(
      'UPDATE Users SET daily_ai_queries_used = ?, last_ai_query_date = ? WHERE user_id = ?',
      [queryCount, today, userId]
    );
    
    console.log(`用户 ${userId} 今日问答次数更新为 ${queryCount}`);
    return true;
  } catch (error) {
    console.error('更新用户问答次数失败:', error);
    return false;
  }
}

/**
 * 获取用户的问答历史记录
 * @param {string} userId - 用户ID
 * @param {number} limit - 限制返回的记录数量
 * @returns {Promise<Array>} 问答历史记录
 */
async function getUserChatHistory(userId, limit = 10) {
  try {
    const chatHistory = await db.query(
      `SELECT 
        chat_id, 
        session_id, 
        user_query_text, 
        ai_response_text, 
        timestamp, 
        related_knowledge_points
      FROM UserAIChatHistory 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?`,
      [userId, limit]
    );
    
    // 将知识点从JSON字符串转换回对象
    return chatHistory.map(record => ({
      ...record,
      related_knowledge_points: JSON.parse(record.related_knowledge_points || '[]')
    }));
  } catch (error) {
    console.error('获取用户聊天历史失败:', error);
    return [];
  }
}

module.exports = {
  logChatInteraction,
  updateUserQueryCount,
  getUserChatHistory
}; 