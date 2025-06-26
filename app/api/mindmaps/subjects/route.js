/**
 * GET /api/mindmaps/subjects
 * 返回当前数据库 mind_maps 中已存在的科目列表
 */
import { NextResponse } from 'next/server';
import db from '../../../../lib/db.js';

export async function GET() {
  try {
    // 确保 mind_maps 表存在（如果 knowledge-map 页面首次访问时已创建，这里就省事了）
    await db.query(`CREATE TABLE IF NOT EXISTS mind_maps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject_name VARCHAR(255) NOT NULL UNIQUE,
      map_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // 定义所有可用的法律科目
    const allSubjects = [
      '民法',
      '刑法', 
      '民事诉讼法',
      '刑事诉讼法',
      '行政法',
      '商经知',
      '三国法',
      '理论法'
    ];

    return NextResponse.json({ success: true, subjects: allSubjects });
  } catch (error) {
    console.error('获取科目列表失败:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
} 