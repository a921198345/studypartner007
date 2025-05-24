/**
 * 管理员API端点 - OPML文件上传与解析
 * 
 * 该接口允许管理员上传OPML格式的知识导图文件并存储到数据库
 * 支持大于1MB的文件上传
 */

import { NextResponse } from 'next/server';
import { parseOpmlToJsonTree } from '../../../../lib/opml/parser';
import { saveOPMLFile, saveMindMapToDB } from '../../../../lib/opml/storage';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// 将文件读取改为异步Promise版本
const readFileAsync = promisify(fs.readFile);

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'public/uploads/opml'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 创建multer上传实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制为5MB
  },
  fileFilter: function (req, file, cb) {
    // 只接受XML或OPML文件
    if (file.mimetype === 'application/xml' || 
        file.mimetype === 'text/xml' || 
        file.originalname.endsWith('.opml') || 
        file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('只接受XML或OPML文件'));
    }
  }
});

// 创建上传处理中间件
const uploadMiddleware = upload.single('opmlFile');

// 处理multer中间件在Next.js API路由中的使用
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * POST 处理程序
 * 接收OPML文件上传，解析并存储到数据库
 */
export async function POST(req) {
  try {
    // 克隆请求及响应对象(为了兼容Express中间件)
    const res = {};
    
    try {
      // 运行上传中间件
      await runMiddleware(req, res, uploadMiddleware);
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: `文件上传失败: ${error.message}`
      }, { status: 400 });
    }
    
    // 获取表单数据
    const formData = await req.formData();
    const subjectName = formData.get('subjectName');
    const file = req.file; // multer添加的文件信息
    
    if (!subjectName) {
      return NextResponse.json({
        success: false,
        message: '缺少学科名称参数'
      }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({
        success: false,
        message: '没有上传文件'
      }, { status: 400 });
    }
    
    // 读取上传的文件内容
    const filePath = file.path;
    const opmlContent = await readFileAsync(filePath, 'utf8');
    
    // 解析OPML为JSON树结构
    const parsedData = await parseOpmlToJsonTree(opmlContent);
    
    // 保存文件路径到数据库
    const savedFilePath = await saveOPMLFile(file.filename, subjectName);
    
    // 保存解析后的数据到数据库
    await saveMindMapToDB(subjectName, parsedData);
    
    return NextResponse.json({
      success: true,
      message: '知识导图上传并解析成功',
      data: {
        subject: subjectName,
        filePath: savedFilePath
      }
    });
    
  } catch (error) {
    console.error('上传处理失败:', error);
    return NextResponse.json({
      success: false,
      message: `处理失败: ${error.message}`
    }, { status: 500 });
  }
} 