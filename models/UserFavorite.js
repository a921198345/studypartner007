const { executeQuery } = require('../config/database');

class UserFavorite {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.question_id = data.question_id;
    this.created_at = data.created_at;
  }

  // 添加收藏
  static async add(userId, questionId) {
    // 检查是否已收藏
    const checkSql = 'SELECT id FROM user_favorites WHERE user_id = ? AND question_id = ?';
    const checkResult = await executeQuery(checkSql, [userId, questionId]);
    
    if (checkResult.length > 0) {
      // 已收藏，返回已存在的ID
      return checkResult[0].id;
    }
    
    // 未收藏，添加新记录
    const insertSql = 'INSERT INTO user_favorites (user_id, question_id) VALUES (?, ?)';
    const result = await executeQuery(insertSql, [userId, questionId]);
    
    return result.insertId;
  }

  // 取消收藏
  static async remove(userId, questionId) {
    const sql = 'DELETE FROM user_favorites WHERE user_id = ? AND question_id = ?';
    const result = await executeQuery(sql, [userId, questionId]);
    
    return result.affectedRows > 0;
  }

  // 获取收藏列表
  static async getUserFavorites(userId, page = 1, limit = 10) {
    // 获取收藏的题目
    const sql = `
      SELECT q.*, uf.created_at as favorite_at 
      FROM questions q
      JOIN user_favorites uf ON q.id = uf.question_id
      WHERE uf.user_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const offset = (page - 1) * limit;
    const results = await executeQuery(sql, [userId, parseInt(limit), parseInt(offset)]);
    
    // 处理JSON字段
    const questions = results.map(q => {
      if (typeof q.options_json === 'string') {
        q.options_json = JSON.parse(q.options_json);
      }
      return {
        ...q,
        options: q.options_json
      };
    });
    
    // 获取总数
    const countSql = 'SELECT COUNT(*) as total FROM user_favorites WHERE user_id = ?';
    const countResult = await executeQuery(countSql, [userId]);
    const total = countResult[0].total;
    
    return {
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // 检查题目是否已收藏
  static async isFavorited(userId, questionId) {
    const sql = 'SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ? AND question_id = ?';
    const result = await executeQuery(sql, [userId, questionId]);
    
    return result[0].count > 0;
  }
  
  // 获取用户收藏统计
  static async getFavoriteStats(userId) {
    const sql = `
      SELECT subject, COUNT(*) as count 
      FROM user_favorites uf
      JOIN questions q ON uf.question_id = q.id
      WHERE uf.user_id = ?
      GROUP BY subject
      ORDER BY count DESC
    `;
    
    return await executeQuery(sql, [userId]);
  }
}

module.exports = UserFavorite; 