import { query, queryOne, transaction } from '../lib/db';

class Question {
  /**
   * 获取所有题目
   * @returns {Promise<Array>} 题目列表
   */
  static async getAll() {
    return await query('SELECT * FROM questions');
  }
  
  /**
   * 根据ID获取题目
   * @param {number} id - 题目ID
   * @returns {Promise<Object|null>} 题目对象或null
   */
  static async getById(id) {
    return await queryOne('SELECT * FROM questions WHERE id = ?', [id]);
  }
  
  /**
   * 按学科和年份筛选题目
   * @param {string} subject - 学科名称
   * @param {number} year - 年份
   * @param {number} page - 页码，默认为1
   * @param {number} limit - 每页条数，默认为10
   * @returns {Promise<Array>} 题目列表
   */
  static async getBySubjectAndYear(subject, year, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params = [];
    
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    
    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    return await query(sql, params);
  }
  
  /**
   * 获取题目总数(用于分页)
   * @param {string} subject - 学科名称，可选
   * @param {number} year - 年份，可选
   * @returns {Promise<number>} 题目总数
   */
  static async getCount(subject = null, year = null) {
    let sql = 'SELECT COUNT(*) as total FROM questions WHERE 1=1';
    const params = [];
    
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    
    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  }
  
  /**
   * 创建新题目
   * @param {Object} questionData - 题目数据
   * @param {string} questionData.subject - 学科
   * @param {number} questionData.year - 年份
   * @param {string} questionData.question_text - 题目文本
   * @param {Object} questionData.options_json - 选项JSON对象
   * @param {string} questionData.correct_answer - 正确答案
   * @param {string} questionData.explanation_text - 题目解析
   * @param {number} questionData.question_type - 题目类型(1:单选,2:多选,3:不定项)
   * @returns {Promise<Object>} 插入结果
   */
  static async create(questionData) {
    const sql = `
      INSERT INTO questions 
      (subject, year, question_text, options_json, correct_answer, explanation_text, question_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      questionData.subject,
      questionData.year,
      questionData.question_text,
      JSON.stringify(questionData.options_json),
      questionData.correct_answer,
      questionData.explanation_text,
      questionData.question_type
    ];
    
    return await query(sql, params);
  }
  
  /**
   * 批量创建题目
   * @param {Array<Object>} questionsData - 题目数据数组
   * @returns {Promise<Object>} 执行结果
   */
  static async createBatch(questionsData) {
    return await transaction(async (connection) => {
      const results = [];
      
      for (const questionData of questionsData) {
        const sql = `
          INSERT INTO questions 
          (subject, year, question_text, options_json, correct_answer, explanation_text, question_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          questionData.subject,
          questionData.year,
          questionData.question_text,
          JSON.stringify(questionData.options_json),
          questionData.correct_answer,
          questionData.explanation_text,
          questionData.question_type
        ];
        
        const [result] = await connection.execute(sql, params);
        results.push(result);
      }
      
      return results;
    });
  }
  
  /**
   * 更新题目
   * @param {number} id - 题目ID
   * @param {Object} questionData - 题目更新数据
   * @returns {Promise<Object>} 更新结果
   */
  static async update(id, questionData) {
    const sql = `
      UPDATE questions 
      SET subject = ?, 
          year = ?, 
          question_text = ?, 
          options_json = ?, 
          correct_answer = ?, 
          explanation_text = ?, 
          question_type = ?
      WHERE id = ?
    `;
    
    const params = [
      questionData.subject,
      questionData.year,
      questionData.question_text,
      JSON.stringify(questionData.options_json),
      questionData.correct_answer,
      questionData.explanation_text,
      questionData.question_type,
      id
    ];
    
    return await query(sql, params);
  }
  
  /**
   * 删除题目
   * @param {number} id - 题目ID
   * @returns {Promise<Object>} 删除结果
   */
  static async delete(id) {
    return await query('DELETE FROM questions WHERE id = ?', [id]);
  }
}

export default Question;
