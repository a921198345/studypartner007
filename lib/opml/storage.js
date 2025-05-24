/**
 * OPML存储模块
 * 
 * 提供将OPML文件和解析后的JSON数据存储到数据库的功能
 */

import db from '../db';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// 文件异步操作
const statAsync = promisify(fs.stat);

/**
 * 将上传的OPML文件信息保存到数据库
 * @param {string} filename - 文件名
 * @param {string} subjectName - 学科名称
 * @returns {Promise<string>} - 保存后的文件路径
 */
export async function saveOPMLFile(filename, subjectName) {
  try {
    const filePath = path.join('public/uploads/opml', filename);
    const absolutePath = path.join(process.cwd(), filePath);
    
    // 获取文件大小
    const stats = await statAsync(absolutePath);
    const fileSize = stats.size;
    
    // 检查是否已存在该学科的记录
    const existingRecord = await db.queryOne(
      'SELECT * FROM MindMapOPMLs WHERE subject_name = ?',
      [subjectName]
    );
    
    if (existingRecord) {
      // 更新现有记录
      await db.query(
        'UPDATE MindMapOPMLs SET file_path = ?, file_size = ?, version = version + 1, upload_date = NOW(), is_active = 1 WHERE subject_name = ?',
        [filePath, fileSize, subjectName]
      );
    } else {
      // 插入新记录
      await db.query(
        'INSERT INTO MindMapOPMLs (subject_name, file_path, file_size, version, upload_date, is_active) VALUES (?, ?, ?, 1, NOW(), 1)',
        [subjectName, filePath, fileSize]
      );
    }
    
    return filePath;
  } catch (error) {
    console.error('保存OPML文件信息失败:', error);
    throw error;
  }
}

/**
 * 将解析后的知识导图JSON数据保存到数据库
 * @param {string} subjectName - 学科名称
 * @param {Object} jsonData - 解析后的JSON数据
 * @returns {Promise<void>}
 */
export async function saveMindMapToDB(subjectName, jsonData) {
  try {
    // JSON数据转字符串
    const jsonString = JSON.stringify(jsonData);
    
    // 检查是否已存在该学科的记录
    const existingRecord = await db.queryOne(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      [subjectName]
    );
    
    if (existingRecord) {
      // 更新现有记录
      await db.query(
        'UPDATE mind_maps SET map_data = ?, updated_at = NOW() WHERE subject_name = ?',
        [jsonString, subjectName]
      );
    } else {
      // 插入新记录
      await db.query(
        'INSERT INTO mind_maps (subject_name, map_data, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [subjectName, jsonString]
      );
    }
    
    console.log(`知识导图数据已保存: ${subjectName}`);
  } catch (error) {
    console.error('保存知识导图数据失败:', error);
    throw error;
  }
}

/**
 * 根据学科名称获取知识导图数据
 * @param {string} subjectName - 学科名称
 * @returns {Promise<Object|null>} - 知识导图数据或null
 */
export async function getMindMapBySubject(subjectName) {
  try {
    const result = await db.queryOne(
      'SELECT * FROM mind_maps WHERE subject_name = ?',
      [subjectName]
    );
    
    if (!result) {
      return null;
    }
    
    // 直接返回map_data，因为它应该已经被mysql2驱动解析为对象了
    return result.map_data;
  } catch (error) {
    console.error('获取知识导图数据失败:', error);
    throw error;
  }
} 