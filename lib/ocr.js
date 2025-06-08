/**
 * 图片OCR处理模块
 * 使用tesseract.js提取图片中的文字
 */

import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';

// 文件操作异步化
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * 从图片中提取文字
 * @param {File} imageFile - 上传的图片文件
 * @returns {Promise<string>} 提取的文字内容
 */
export async function processImage(imageFile) {
  try {
    // 1. 保存上传的图片到临时文件
    const tempDir = os.tmpdir();
    const fileName = `ocr-${Date.now()}-${Math.round(Math.random() * 1000)}.png`;
    const filePath = path.join(tempDir, fileName);
    
    // 将文件数据转换为Buffer并保存
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await writeFileAsync(filePath, buffer);
    
    console.log(`图片已保存到临时文件: ${filePath}`);
    
    // 2. 创建OCR worker
    const worker = await createWorker('chi_sim+eng');
    
    // 3. 识别图片文字
    const { data: { text } } = await worker.recognize(filePath);
    
    // 4. 终止worker
    await worker.terminate();
    
    // 5. 清理临时文件
    try {
      await unlinkAsync(filePath);
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError);
    }
    
    // 6. 处理并返回识别的文字
    return text.trim();
  } catch (error) {
    console.error('OCR处理失败:', error);
    throw new Error(`图片文字识别失败: ${error.message}`);
  }
}

/**
 * 检查图片是否符合要求
 * @param {File} file - 要检查的文件
 * @returns {boolean} 是否符合要求
 */
export function isValidImage(file) {
  // 检查文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return false;
  }
  
  // 检查文件大小 (小于5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
}

export default {
  processImage,
  isValidImage
}; 