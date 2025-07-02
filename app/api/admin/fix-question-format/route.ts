import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// 将exec转换为Promise形式
const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subject = formData.get('subject');
    const autoFix = formData.get('autoFix') === 'true';
    
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
    const fileName = `${subject}_to_fix_${Date.now()}.docx`;
    const filePath = join(uploadDir, fileName);
    
    const fileBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(fileBuffer));
    
    // 使用虚拟环境中的Python执行脚本修复文件格式
    const pythonPath = join(process.cwd(), 'venv_flask_api/bin/python');
    const scriptPath = join(process.cwd(), 'fix_question_format.py');
    const outputFilePath = join(uploadDir, `${subject}_fixed_${Date.now()}.docx`);
    
    const { stdout, stderr } = await execAsync(
      `${pythonPath} ${scriptPath} "${filePath}" "${outputFilePath}" "${subject}"`,
      { timeout: 30000 } // 30秒超时
    );
    
    if (stderr && !stderr.includes('[调试]')) {
      console.error('修复错误:', stderr);
      return NextResponse.json(
        { error: '文件格式修复失败', details: stderr },
        { status: 500 }
      );
    }
    
    // 读取修复后的文件
    const fixedFileBuffer = await readFile(outputFilePath);
    
    // 返回修复后的文件作为响应
    const response = new NextResponse(fixedFileBuffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // 使用encodeURIComponent处理中文文件名
    const encodedFilename = encodeURIComponent(`${subject}_fixed.docx`);
    response.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    
    return response;
    
  } catch (error) {
    console.error('处理文件修复时出错:', error);
    return NextResponse.json(
      { error: '服务器处理文件时出错' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs'; 