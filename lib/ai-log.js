/**
 * AI交互日志模块
 * 
 * 用于记录用户与AI系统的交互历史
 */

import { query } from './db.js';

/**
 * 记录用户提问
 * @param {number} userId - 用户ID
 * @param {string} sessionId - 会话ID
 * @param {string} queryText - 用户问题文本
 * @param {string|null} imageUrl - 图片URL，如果有的话
 * @returns {Promise<number>} - 记录的ID
 */
export async function logUserQuestion(userId, sessionId, queryText, imageUrl = null) {
  try {
    const result = await query(
      `INSERT INTO user_ai_chat_history 
       (user_id, session_id, user_query_text, user_query_image_url, timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, sessionId || generateSessionId(), queryText, imageUrl]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('记录用户问题失败:', error);
    // 即使记录失败也不中断主流程
    return null;
  }
}

/**
 * 记录AI回答
 * @param {number} chatId - 对话记录ID
 * @param {string} aiResponseText - AI回答文本
 * @param {string|null} relatedKnowledgePoints - 关联知识点JSON字符串
 * @returns {Promise<boolean>} - 是否成功
 */
export async function logAIResponse(chatId, aiResponseText, relatedKnowledgePoints = null) {
  try {
    await query(
      `UPDATE user_ai_chat_history
       SET ai_response_text = ?, related_knowledge_points = ?
       WHERE chat_id = ?`,
      [aiResponseText, relatedKnowledgePoints, chatId]
    );
    
    return true;
  } catch (error) {
    console.error('记录AI回答失败:', error);
    return false;
  }
}

/**
 * 获取用户历史问答记录
 * @param {number} userId - 用户ID
 * @param {number} limit - 返回记录数量限制
 * @param {number} offset - 分页偏移量
 * @returns {Promise<Array>} - 历史记录数组
 */
export async function getUserChatHistory(userId, limit = 10, offset = 0) {
  try {
    const results = await query(
      `SELECT * FROM user_ai_chat_history
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    return results;
  } catch (error) {
    console.error('获取用户聊天历史失败:', error);
    return [];
  }
}

/**
 * 生成唯一会话ID
 * @returns {string} 会话ID
 */
function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${random}`;
}

export default {
  logUserQuestion,
  logAIResponse,
  getUserChatHistory
}; 