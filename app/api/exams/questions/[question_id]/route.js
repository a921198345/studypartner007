import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 数据库连接配置 - 使用环境变量或默认值
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'law_app_user',
  password: process.env.DB_PASSWORD || 'pass@123',
  database: process.env.DB_NAME || 'law_exam_assistant',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000 // 连接超时时间设置为30秒
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 简单测试连接函数
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('数据库连接成功！');
    return true;
  } catch (err) {
    console.error('数据库连接失败:', err);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// 处理GET请求 - 获取单个题目详情
export async function GET(request, { params }) {
  console.log("获取题目详情");

  try {
    const questionId = params.question_id;
    
    // 获取会话信息，用于检查收藏状态
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    const connection = await pool.getConnection();
    console.log("数据库连接成功！");

    try {
      // 获取题目详情
      const [question] = await connection.execute(
        `
        SELECT 
          id, 
          question_code,
          subject, 
          year, 
          question_type, 
          question_text, 
          options_json
        FROM questions 
        WHERE id = ?
        `,
        [questionId]
      );

      if (question.length === 0) {
        return NextResponse.json(
          { success: false, message: "题目不存在" },
          { status: 404 }
        );
      }

      // 查询用户是否收藏了该题目
      let isFavorite = false;
      
      if (userId) {
        const [favoriteResult] = await connection.execute(
          `SELECT * FROM user_favorites WHERE user_id = ? AND question_id = ?`,
          [userId, questionId]
        );
        
        isFavorite = favoriteResult.length > 0;
      }
      
      // 处理选项
      const questionData = question[0];
      let options = [];

      try {
        // 尝试解析JSON
        if (questionData.options_json) {
          options = JSON.parse(questionData.options_json);
          
          // 检查格式并标准化
          if (Array.isArray(options)) {
            // 确保每个选项都有key和text字段
            options = options.map((opt, index) => {
              const key = opt.key || opt.value || opt.id || String.fromCharCode(65 + index); // 如果没有key，使用A, B, C...
              const text = opt.text || opt.label || opt.content || (typeof opt === 'string' ? opt : '选项内容');
              
              return { key, text };
            });
          } else if (typeof options === 'object' && options !== null) {
            // 如果是对象形式 {A: "选项1", B: "选项2"} 转换为标准格式
            options = Object.entries(options).map(([key, text]) => ({ key, text }));
          } else {
            console.error("选项不是数组或对象格式:", options);
            options = [];
          }
        }
      } catch (err) {
        console.error("解析选项JSON出错:", err);
        console.error("原始选项数据:", questionData.options_json);
        
        // 尝试按照常见错误格式处理
        try {
          // 如果是字符串格式 "A. 选项1\nB. 选项2" 转换为标准格式
          if (typeof questionData.options_json === 'string') {
            const optionsStr = questionData.options_json.trim();
            if (optionsStr.includes('\n') || optionsStr.includes('.')) {
              const optionLines = optionsStr.split(/\n|\\n/);
              options = optionLines.map(line => {
                const match = line.match(/^([A-Z])\.?\s*(.*)/i);
                if (match) {
                  return { key: match[1], text: match[2].trim() };
                }
                return null;
              }).filter(Boolean);
            }
          }
          
          // 如果还是没有选项，创建一些虚拟选项
          if (options.length === 0) {
            options = ['A', 'B', 'C', 'D'].map(key => ({ key, text: `选项${key} (解析错误)` }));
          }
        } catch (fallbackErr) {
          console.error("选项数据备选解析也失败:", fallbackErr);
          options = ['A', 'B', 'C', 'D'].map(key => ({ key, text: `选项${key} (数据错误)` }));
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: questionData.id,
          question_code: questionData.question_code,
          subject: questionData.subject,
          year: questionData.year,
          question_type: questionData.question_type,
          question_text: questionData.question_text,
          options: options,
          is_favorite: isFavorite
        }
      });
    } catch (error) {
      console.error("获取题目详情出错:", error);
      return NextResponse.json(
        { success: false, message: "获取题目详情失败" },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("获取题目详情出错:", error);
    return NextResponse.json(
      { success: false, message: "获取题目详情失败" },
      { status: 500 }
    );
  }
} 