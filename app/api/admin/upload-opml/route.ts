/**
 * 管理员 API 端点 - OPML 文件上传与解析（基于 Next.js 14 App Router）
 * POST /api/admin/upload-opml
 *
 * 接收 multipart/form-data：
 *   - opmlFile  : .opml / .xml 文件
 *   - subjectName : 学科名称
 *
 * 不再依赖 multer，直接通过 `req.formData()` 读取文件。
 */

import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { parseOpmlToJsonTree } from '../../../../lib/opml/parser';
import { saveOPMLFile, saveMindMapToDB } from '../../../../lib/opml/storage';

/**
 * POST 处理程序
 */
export async function POST(req) {
  try {
    // 解析 multipart/form-data
    const formData = await req.formData();

    const subjectName = formData.get('subjectName');
    const file = formData.get('opmlFile');

    // 参数校验
    if (!subjectName || typeof subjectName !== 'string') {
      return NextResponse.json({ success: false, message: '缺少学科名称参数' }, { status: 400 });
    }

    if (!file || typeof file === 'string') {
      // 当 file 不存在或被解析为普通字段时返回错误
      return NextResponse.json({ success: false, message: '没有上传文件' }, { status: 400 });
    }

    // 检查文件类型
    const allowedTypes = ['application/xml', 'text/xml', 'text/plain'];
    const fileName = file.name;
    const isOpml = fileName.endsWith('.opml') || fileName.endsWith('.xml');
    if (!isOpml && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: '只接受 .opml / .xml 文件' }, { status: 400 });
    }

    // 生成随机文件名，防止冲突
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(fileName) || '.opml';
    const savedFileName = `opmlFile-${uniqueSuffix}${ext}`;

    // 保存文件到 public/uploads/opml
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'opml');
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, savedFileName);
    await writeFile(filePath, buffer);

    // 解析 OPML 内容
    const opmlContent = buffer.toString('utf8');
    const parsedData = await parseOpmlToJsonTree(opmlContent);

    // 保存到数据库（文件信息 + MindMap 数据）
    await saveOPMLFile(savedFileName, subjectName);
    await saveMindMapToDB(subjectName, parsedData);

    return NextResponse.json(
      {
        success: true,
        message: '知识导图上传并解析成功',
        data: {
          subject: subjectName,
          filePath: `/public/uploads/opml/${savedFileName}`,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('OPML 上传失败:', error);
    return NextResponse.json({ success: false, message: `处理失败: ${error.message}` }, { status: 500 });
  }
} 