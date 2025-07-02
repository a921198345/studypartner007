import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mysql from 'mysql2/promise';

// 将exec转换为Promise形式
const execAsync = promisify(exec);

export async function POST(request) {
  let tempFilePath = null;
  let connection = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subject = formData.get('subject');
    
    if (!file || !subject) {
      return NextResponse.json(
        { error: '请提供文件和学科' },
        { status: 400 }
      );
    }
    
    // 检查文件类型
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      return NextResponse.json(
        { error: '只支持.docx或.doc格式的文件' },
        { status: 400 }
      );
    }
    
    // 创建上传目录
    const uploadDir = join(process.cwd(), 'uploads');
    
    // 保存文件
    const fileName = `${subject}_${Date.now()}.docx`;
    tempFilePath = join(uploadDir, fileName);
    
    const fileBuffer = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(fileBuffer));
    
    // 使用不保存数据库的Python脚本解析文件
    const pythonPath = join(process.cwd(), 'venv_flask_api/bin/python');
    const scriptPath = join(process.cwd(), 'parse_questions_no_db.py');
    
    console.log('执行解析脚本:', `${pythonPath} ${scriptPath} "${tempFilePath}" "${subject}" --output-json`);
    
    // 执行Python脚本解析文件
    const { stdout, stderr } = await execAsync(
      `${pythonPath} ${scriptPath} "${tempFilePath}" "${subject}" --output-json`,
      { timeout: 30000 } // 30秒超时
    );
    
    if (stderr) {
      console.error('解析错误:', stderr);
      throw new Error(`文件解析失败: ${stderr}`);
    }
    
    // 解析Python脚本的输出
    let parseResult;
    try {
      parseResult = JSON.parse(stdout);
    } catch (e) {
      console.error('解析输出失败:', e);
      throw new Error('解析脚本输出格式错误');
    }
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || '解析失败');
    }
    
    // 使用Node.js连接数据库并保存题目
    if (parseResult.questions && parseResult.questions.length > 0) {
      console.log(`准备保存 ${parseResult.questions.length} 个题目到数据库...`);
      
      // 创建数据库连接
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || '8.141.4.192',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'law_user',
        password: process.env.DB_PASSWORD || 'Accd0726351x.',
        database: process.env.DB_NAME || 'law_exam_assistant',
        connectTimeout: 10000
      });
      
      console.log('数据库连接成功');
      
      // 保存题目到数据库
      let savedCount = 0;
      for (const question of parseResult.questions) {
        try {
          // 检查题目是否已存在
          const [existing] = await connection.execute(
            'SELECT id FROM questions WHERE question_code = ?',
            [question.question_id]
          );
          
          if (existing.length > 0) {
            // 更新现有题目
            await connection.execute(
              `UPDATE questions 
               SET subject = ?, year = ?, question_text = ?, options_json = ?,
                   correct_answer = ?, explanation_text = ?, question_type = ?
               WHERE question_code = ?`,
              [
                question.subject,
                question.year,
                question.question_text,
                question.options,
                question.correct_answer,
                question.analysis,
                question.question_type,
                question.question_id
              ]
            );
          } else {
            // 插入新题目
            await connection.execute(
              `INSERT INTO questions 
               (question_code, subject, year, question_text, options_json, 
                correct_answer, explanation_text, question_type)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                question.question_id,
                question.subject,
                question.year,
                question.question_text,
                question.options,
                question.correct_answer,
                question.analysis,
                question.question_type
              ]
            );
          }
          savedCount++;
        } catch (dbError) {
          console.error(`保存题目 ${question.question_id} 失败:`, dbError);
        }
      }
      
      console.log(`成功保存 ${savedCount} 个题目到数据库`);
      
      // 关闭数据库连接
      await connection.end();
      
      // 删除临时文件
      await unlink(tempFilePath);
      
      // 返回成功结果
      return NextResponse.json({
        success: true,
        message: `文件上传并解析成功，已保存 ${savedCount} 个题目到数据库`,
        total_questions: parseResult.total_questions,
        parsed_questions: parseResult.parsed_questions,
        saved_questions: savedCount,
        format_issues: parseResult.format_issues || {}
      });
    } else {
      // 没有解析到题目
      await unlink(tempFilePath);
      
      return NextResponse.json({
        success: false,
        message: '未能解析到任何题目',
        total_questions: 0,
        parsed_questions: 0,
        format_issues: parseResult.format_issues || {}
      });
    }
    
  } catch (error) {
    console.error('处理上传文件时出错:', error);
    
    // 清理资源
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        console.error('关闭数据库连接失败:', e);
      }
    }
    
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        console.error('删除临时文件失败:', e);
      }
    }
    
    return NextResponse.json(
      { error: error.message || '服务器处理文件时出错' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';