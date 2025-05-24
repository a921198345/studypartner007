const { executeQuery } = require('../config/database');

class Question {
  constructor(data) {
    this.id = data.id;
    this.subject = data.subject;
    this.year = data.year;
    this.question_type = data.question_type;
    this.question_text = data.question_text;
    this.options_json = data.options_json;
    this.correct_answer = data.correct_answer;
    this.explanation_text = data.explanation_text;
    this.difficulty = data.difficulty || 3;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // 创建新题目
  static async create(questionData) {
    // 确保options_json是字符串
    const options = typeof questionData.options_json === 'string' 
      ? questionData.options_json 
      : JSON.stringify(questionData.options_json);
    
    const sql = `
      INSERT INTO questions 
      (subject, year, question_type, question_text, options_json, correct_answer, explanation_text, difficulty) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(sql, [
      questionData.subject,
      questionData.year,
      questionData.question_type,
      questionData.question_text,
      options,
      questionData.correct_answer,
      questionData.explanation_text,
      questionData.difficulty || 3
    ]);
    
    return result.insertId;
  }

  // 根据ID查找题目
  static async findById(id) {
    const sql = 'SELECT * FROM questions WHERE id = ?';
    const results = await executeQuery(sql, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    // 确保options_json是对象
    const question = results[0];
    if (typeof question.options_json === 'string') {
      question.options_json = JSON.parse(question.options_json);
    }
    
    return new Question(question);
  }

  // 根据条件查询题目列表
  static async findByFilter(filters = {}, page = 1, limit = 10) {
    // 构建WHERE子句
    let whereConditions = [];
    let queryParams = [];
    
    if (filters.subject) {
      whereConditions.push('subject = ?');
      queryParams.push(filters.subject);
    }
    
    if (filters.year) {
      whereConditions.push('year = ?');
      queryParams.push(filters.year);
    }
    
    if (filters.question_type) {
      whereConditions.push('question_type = ?');
      queryParams.push(filters.question_type);
    }
    
    // 组合WHERE子句
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // 计算偏移量
    const offset = (page - 1) * limit;
    
    // 查询数据
    const sql = `
      SELECT * FROM questions 
      ${whereClause} 
      ORDER BY year DESC, id ASC
      LIMIT ? OFFSET ?
    `;
    
    // 添加分页参数
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const results = await executeQuery(sql, queryParams);
    
    // 处理结果集，将options_json从字符串转换为对象
    const questions = results.map(q => {
      if (typeof q.options_json === 'string') {
        q.options_json = JSON.parse(q.options_json);
      }
      return new Question(q);
    });
    
    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM questions 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countSql, queryParams.slice(0, -2));
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

  // 更新题目
  static async update(id, questionData) {
    // 构建SET子句
    const updates = [];
    const queryParams = [];
    
    // 遍历可更新的字段
    const updatableFields = ['subject', 'year', 'question_type', 'question_text', 
                           'options_json', 'correct_answer', 'explanation_text', 'difficulty'];
    
    updatableFields.forEach(field => {
      if (questionData[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        // 特殊处理options_json字段
        if (field === 'options_json' && typeof questionData[field] !== 'string') {
          queryParams.push(JSON.stringify(questionData[field]));
        } else {
          queryParams.push(questionData[field]);
        }
      }
    });
    
    if (updates.length === 0) {
      return false; // 没有要更新的字段
    }
    
    const sql = `
      UPDATE questions
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    
    queryParams.push(id);
    
    const result = await executeQuery(sql, queryParams);
    return result.affectedRows > 0;
  }

  // 删除题目
  static async delete(id) {
    const sql = 'DELETE FROM questions WHERE id = ?';
    const result = await executeQuery(sql, [id]);
    return result.affectedRows > 0;
  }
  
  // 获取所有可用的学科
  static async getSubjects() {
    const sql = 'SELECT DISTINCT subject FROM questions ORDER BY subject';
    const results = await executeQuery(sql);
    return results.map(row => row.subject);
  }
  
  // 获取所有可用的年份
  static async getYears() {
    const sql = 'SELECT DISTINCT year FROM questions ORDER BY year DESC';
    const results = await executeQuery(sql);
    return results.map(row => row.year);
  }
  
  // 将数据库记录转换为API响应格式
  toPublic(includeAnswer = false) {
    // 基本信息，不包含答案和解析
    const publicData = {
      id: this.id,
      subject: this.subject,
      year: this.year,
      question_type: this.question_type,
      question_text: this.question_text,
      options: this.options_json,
      difficulty: this.difficulty
    };
    
    // 如果需要包含答案和解析
    if (includeAnswer) {
      publicData.correct_answer = this.correct_answer;
      publicData.explanation_text = this.explanation_text;
    }
    
    return publicData;
  }
}

module.exports = Question; 