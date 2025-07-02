import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { legalDocVectors } from '../../../../../db';
import { mkdir } from 'fs/promises';

/**
 * 处理法律文本上传和处理的API路由
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subject = formData.get('subject_area') || '未知领域';
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 400 }
      );
    }
    
    // 检查文件类型
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    const fileType = file.type;
    
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, message: '不支持的文件类型，请上传.doc或.docx文件' },
        { status: 400 }
      );
    }
    
    // 创建目录（如果不存在）
    await mkdir(path.join(process.cwd(), 'uploads', 'documents'), { recursive: true });
    
    // 保存上传的文件
    const fileName = `${subject}_${Date.now()}_${file.name}`;
    const filePath = path.join(process.cwd(), 'uploads', 'documents', fileName);
    
    const fileBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(fileBuffer));
    
    // 生成唯一ID
    const documentId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 启动Python进程处理文档
    const pythonCommand = `python ${path.join(process.cwd(), 'process_document.py')} --file="${filePath}" --law_name="${subject}" --doc_id="${documentId}"`;
    
    return new Promise((resolve) => {
      exec(pythonCommand, async (error, stdout, stderr) => {
        if (error) {
          console.error('文档处理错误:', error.message);
          console.error('stderr:', stderr);
          resolve(NextResponse.json(
            { success: false, message: `文档处理失败: ${error.message}` },
            { status: 500 }
          ));
          return;
        }
        
        try {
          // 解析输出结果
          const result = JSON.parse(stdout);
          
          // 成功处理文档
          resolve(NextResponse.json({
            success: true,
            message: '文档上传并处理成功，已按法律结构分段',
            data: {
              doc_id: documentId,
              file_path: filePath,
              subject_area: subject,
              segments_count: result.segments_count || 0,
              metadata: result.metadata || {}
            }
          }, { status: 200 }));
          
        } catch (jsonError) {
          console.error('解析Python输出失败:', jsonError);
          console.log('Python输出:', stdout);
          resolve(NextResponse.json(
            { success: false, message: '处理文档结果解析失败' },
            { status: 500 }
          ));
        }
      });
    });
    
  } catch (error) {
    console.error('上传处理错误:', error);
    return NextResponse.json(
      { success: false, message: `上传处理失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * 获取已上传的法律文档
 */
export async function GET() {
  try {
    // 实现获取已上传的法律文档文件列表
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    
    // 确保目录存在
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ success: true, documents: [] });
    }
    
    // 读取文件列表
    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.docx') || file.endsWith('.doc'));
    
    const documents = files.map(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      // 从文件名解析主题（假设文件名格式为 "subject_timestamp_filename"）
      const fileNameParts = file.split('_');
      const subject = fileNameParts.length > 0 ? fileNameParts[0] : '未知';
      
      return {
        name: file,
        path: filePath,
        size: stats.size,
        subject_area: subject,
        created_at: stats.birthtime
      };
    });
    
    return NextResponse.json({
      success: true,
      documents
    });
    
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return NextResponse.json(
      { success: false, message: `获取文档列表失败: ${error.message}` },
      { status: 500 }
    );
  }
} 