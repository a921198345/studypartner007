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
    
    // 确保以二进制模式保存文件
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    
    console.log('保存文件:', tempFilePath, '大小:', buffer.length, 'bytes');
    
    await writeFile(tempFilePath, buffer, { encoding: null }); // 明确指定无编码，纯二进制
    
    // 验证文件已正确保存
    const savedFileStats = await execAsync(`file "${tempFilePath}"`);
    console.log('保存后的文件类型:', savedFileStats.stdout);
    
    // 构造解析脚本的绝对路径，防止找不到脚本
    const scriptPath = join(process.cwd(), 'parse_questions.py');
    // 执行Python脚本解析文件
    const pythonCommand = `python "${scriptPath}" "${tempFilePath}" "${subject}" --validate --output-json`;
    
    // 验证上传的文件
    console.log('验证上传的文件:', tempFilePath);
    const fileStats = await execAsync(`ls -la "${tempFilePath}"`);
    console.log('文件信息:', fileStats.stdout);
    
    console.log('执行解析脚本:', pythonCommand);
    
    // 执行Python脚本解析文件
    const { stdout, stderr } = await execAsync(
      pythonCommand,
      { 
        timeout: 60000, // 增加到60秒超时
        maxBuffer: 10 * 1024 * 1024 // 增加输出缓冲区大小到10MB
      }
    );
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('[调试]')) {
      console.error('解析错误:', stderr);
      // 如果stderr只包含警告信息或调试信息，不要抛出错误
      if (!stdout) {
        throw new Error(`文件解析失败: ${stderr}`);
      }
    }
    
    // 解析Python脚本的输出
    let parseResult;
    try {
      parseResult = JSON.parse(stdout);
    } catch (e) {
      console.error('解析输出失败:', e);
      console.error('原始输出:', stdout);
      console.error('错误输出:', stderr);
      throw new Error('解析脚本输出格式错误: ' + e.message);
    }
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || '解析失败');
    }
    
    // 使用Node.js连接数据库并保存题目
    if (parseResult.questions && parseResult.questions.length > 0) {
      console.log(`准备保存 ${parseResult.questions.length} 个题目到数据库...`);
      
      // 创建数据库连接
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10000
      });
      
      console.log('数据库连接成功');
      
      // 开始事务
      await connection.beginTransaction();
      console.log('开始数据库事务');
      
      // 保存题目到数据库
      let savedCount = 0;
      let updateCount = 0;
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
                JSON.stringify(question.options),
                question.correct_answer,
                question.analysis,
                question.question_type === 'multiple' ? 2 : 1,  // 转换为数字
                question.question_id
              ]
            );
            updateCount++;
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
                JSON.stringify(question.options),  // 转换为JSON字符串
                question.correct_answer,
                question.analysis,
                question.question_type === 'multiple' ? 2 : 1  // 转换为数字
              ]
            );
          }
          savedCount++;
        } catch (dbError) {
          console.error(`保存题目 ${question.question_id} 失败:`, dbError);
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log(`事务提交成功，保存了 ${savedCount} 个新题目，更新了 ${updateCount} 个题目`);
      
      // 验证数据
      const [verifyCount] = await connection.execute('SELECT COUNT(*) as total FROM questions');
      console.log('数据库中现有题目总数:', verifyCount[0].total);
      
      // 关闭数据库连接
      await connection.end();
      
      // 删除临时文件
      await unlink(tempFilePath);
      
      // 构建返回消息
      let successMessage = `文件上传并解析成功，新增 ${savedCount} 个题目`;
      if (updateCount > 0) {
        successMessage += `，更新 ${updateCount} 个题目`;
      }
      successMessage += `，数据库中共有 ${verifyCount[0].total} 个题目`;
      if (parseResult.auto_fixed_count > 0) {
        successMessage += `（自动修复了 ${parseResult.auto_fixed_count} 个异常空白问题）`;
      }
      
      // 返回成功结果
      return NextResponse.json({
        success: true,
        message: successMessage,
        total_questions: parseResult.total_questions,
        parsed_questions: parseResult.parsed_questions,
        saved_questions: savedCount,
        auto_fixed_count: parseResult.auto_fixed_count || 0,
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
    
    // 回滚事务
    if (connection) {
      try {
        await connection.rollback();
        console.log('事务已回滚');
      } catch (rollbackError) {
        console.error('回滚事务失败:', rollbackError);
      }
    }
    
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
        // 如果是Package not found错误，保留文件以便调试
        if (error.message && error.message.includes('Package not found')) {
          console.log(`[调试] 保留问题文件以便检查: ${tempFilePath}`);
          console.log(`[调试] 请运行: ./venv_flask_api/bin/python diagnose-upload.py "${tempFilePath}"`);
        } else {
          await unlink(tempFilePath);
        }
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