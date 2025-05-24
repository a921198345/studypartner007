const { executeQuery } = require('../config/database');

class UserWrongAnswer {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.question_id = data.question_id;
    this.wrong_count = data.wrong_count || 1;
    this.last_wrong_at = data.last_wrong_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // 添加一个错题记录
  static async add(userId, questionId) {
    // 先检查是否存在记录
    const checkSql = 'SELECT * FROM user_wrong_answers WHERE user_id = ? AND question_id = ?';
    const checkResult = await executeQuery(checkSql, [userId, questionId]);
    
    if (checkResult.length > 0) {
      // 如果已存在，则增加错误计数
      const updateSql = `
        UPDATE user_wrong_answers 
        SET wrong_count = wrong_count + 1, last_wrong_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND question_id = ?
      `;
      await executeQuery(updateSql, [userId, questionId]);
      return checkResult[0].id;
    } else {
      // 如果不存在，则创建新记录
      const insertSql = `
        INSERT INTO user_wrong_answers (user_id, question_id) 
        VALUES (?, ?)
      `;
      const result = await executeQuery(insertSql, [userId, questionId]);
      return result.insertId;
    }
  }

  // 移除一个错题记录
  static async remove(userId, questionId) {
    const sql = 'DELETE FROM user_wrong_answers WHERE user_id = ? AND question_id = ?';
    const result = await executeQuery(sql, [userId, questionId]);
    return result.affectedRows > 0;
  }

  // 获取用户的错题列表
  static async getUserWrongQuestions(userId, page = 1, limit = 10) {
    // 获取错题关联的题目信息
    const sql = `
      SELECT q.*, uwa.wrong_count, uwa.last_wrong_at 
      FROM questions q
      JOIN user_wrong_answers uwa ON q.id = uwa.question_id
      WHERE uwa.user_id = ?
      ORDER BY uwa.last_wrong_at DESC
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
    const countSql = `
      SELECT COUNT(*) as total 
      FROM user_wrong_answers 
      WHERE user_id = ?
    `;
    
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
  
  // 检查问题是否在用户的错题集中
  static async isInWrongAnswers(userId, questionId) {
    const sql = 'SELECT COUNT(*) as count FROM user_wrong_answers WHERE user_id = ? AND question_id = ?';
    const result = await executeQuery(sql, [userId, questionId]);
    return result[0].count > 0;
  }
  
  // 获取用户错题统计
  static async getWrongAnswerStats(userId) {
    const sql = `
      SELECT subject, COUNT(*) as count 
      FROM user_wrong_answers uwa
      JOIN questions q ON uwa.question_id = q.id
      WHERE uwa.user_id = ?
      GROUP BY subject
      ORDER BY count DESC
    `;
    
    return await executeQuery(sql, [userId]);
  }
}

module.exports = UserWrongAnswer; 