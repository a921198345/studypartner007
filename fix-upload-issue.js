// 修复文件上传问题的建议

/*
问题分析：
1. 文件本身是正常的（直接测试可以打开）
2. 但通过Web上传后会出现"Package not found"错误
3. 可能是文件在上传过程中被损坏

可能的原因：
1. 文件流处理不当
2. 文件编码问题
3. 文件保存时的权限问题
*/

// 建议的修复方案：

// 1. 修改文件保存方式，使用更安全的流处理
const fs = require('fs').promises;
const path = require('path');

async function saveUploadedFile(file, uploadDir) {
  try {
    // 确保目录存在
    await fs.mkdir(uploadDir, { recursive: true });
    
    // 使用时间戳和随机数生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${file.subject}_${timestamp}_${random}.docx`;
    const filePath = path.join(uploadDir, fileName);
    
    // 将文件转换为Buffer
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    
    // 写入文件，确保使用二进制模式
    await fs.writeFile(filePath, buffer, { encoding: null });
    
    // 验证文件是否正确保存
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('文件保存失败：文件大小为0');
    }
    
    return filePath;
  } catch (error) {
    console.error('保存文件失败:', error);
    throw error;
  }
}

// 2. 添加文件验证
async function validateDocxFile(filePath) {
  const { exec } = require('child_process').promises;
  
  try {
    // 使用file命令检查文件类型
    const { stdout } = await exec(`file "${filePath}"`);
    
    if (!stdout.includes('Microsoft Word') && !stdout.includes('Zip archive')) {
      throw new Error('文件格式不正确');
    }
    
    return true;
  } catch (error) {
    console.error('文件验证失败:', error);
    return false;
  }
}

module.exports = { saveUploadedFile, validateDocxFile };