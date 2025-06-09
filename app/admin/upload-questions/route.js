import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
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
    const filePath = join(uploadDir, fileName);
    
    const fileBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(fileBuffer));
    
    // 执行Python脚本解析文件
    // 注意：在生产环境中应使用更安全的方式执行命令
    const { stdout, stderr } = await execAsync(`python parse_exam_questions.py "${filePath}" "${subject}"`);
    
    if (stderr) {
      console.error('解析错误:', stderr);
      return NextResponse.json(
        { error: '文件解析失败', details: stderr },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '文件上传并解析成功',
      details: stdout
    });
    
  } catch (error) {
    console.error('处理上传文件时出错:', error);
    return NextResponse.json(
      { error: '服务器处理文件时出错' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';