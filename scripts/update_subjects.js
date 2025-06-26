// 更新数据库中的科目数据
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// 科目映射表
const subjectMapping = {
  // 原名称 -> 新名称
  '商法': '商经知',
  '经济法': '商经知',
  '商法与经济法': '商经知',
  '法理学': '理论法',
  '理论法学': '理论法',
  '行政法': '行政法与行政诉讼法',
  '行政诉讼法': '行政法与行政诉讼法',
  '国际法': '三国法',
  '宪法': '理论法',
  '法制史': '理论法',
  '司法制度与法律职业道德': '理论法',
  '国际私法': '三国法',
  '国际经济法': '三国法',
  '国际公法': '三国法',
  '知识产权法': '商经知',
  '劳动法': '商经知',
  '环境资源法': '商经知',
  // 已经正确的保持不变
  '刑法': '刑法',
  '民法': '民法',
  '刑事诉讼法': '刑事诉讼法',
  '民事诉讼法': '民事诉讼法',
  '行政法与行政诉讼法': '行政法与行政诉讼法',
  '商经知': '商经知',
  '三国法': '三国法',
  '理论法': '理论法'
};

async function updateSubjects() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('已连接到数据库');
    
    // 1. 检查当前的科目分布
    console.log('\n=== 当前科目分布 ===');
    const [currentSubjects] = await connection.execute(
      'SELECT subject, COUNT(*) as count FROM questions GROUP BY subject ORDER BY count DESC'
    );
    currentSubjects.forEach(row => {
      console.log(`${row.subject}: ${row.count} 题`);
    });
    
    // 2. 更新questions表的科目
    console.log('\n=== 更新questions表 ===');
    for (const [oldSubject, newSubject] of Object.entries(subjectMapping)) {
      if (oldSubject !== newSubject) {
        const [result] = await connection.execute(
          'UPDATE questions SET subject = ? WHERE subject = ?',
          [newSubject, oldSubject]
        );
        if (result.affectedRows > 0) {
          console.log(`更新 ${oldSubject} -> ${newSubject}: ${result.affectedRows} 条`);
        }
      }
    }
    
    // 3. 更新vector_chunks表的law_name
    console.log('\n=== 更新vector_chunks表 ===');
    for (const [oldSubject, newSubject] of Object.entries(subjectMapping)) {
      if (oldSubject !== newSubject) {
        const [result] = await connection.execute(
          'UPDATE vector_chunks SET law_name = ? WHERE law_name = ?',
          [newSubject, oldSubject]
        );
        if (result.affectedRows > 0) {
          console.log(`更新 ${oldSubject} -> ${newSubject}: ${result.affectedRows} 条`);
        }
      }
    }
    
    // 4. 更新knowledge_documents表的subject_area
    console.log('\n=== 更新knowledge_documents表 ===');
    for (const [oldSubject, newSubject] of Object.entries(subjectMapping)) {
      if (oldSubject !== newSubject) {
        const [result] = await connection.execute(
          'UPDATE knowledge_documents SET subject_area = ? WHERE subject_area = ?',
          [newSubject, oldSubject]
        );
        if (result.affectedRows > 0) {
          console.log(`更新 ${oldSubject} -> ${newSubject}: ${result.affectedRows} 条`);
        }
      }
    }
    
    // 5. 更新notes表的category（如果表存在）
    console.log('\n=== 检查notes表 ===');
    try {
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'notes'"
      );
      if (tables.length > 0) {
        console.log('更新notes表...');
        for (const [oldSubject, newSubject] of Object.entries(subjectMapping)) {
          if (oldSubject !== newSubject) {
            const [result] = await connection.execute(
              'UPDATE notes SET category = ? WHERE category = ?',
              [newSubject, oldSubject]
            );
            if (result.affectedRows > 0) {
              console.log(`更新 ${oldSubject} -> ${newSubject}: ${result.affectedRows} 条`);
            }
          }
        }
      } else {
        console.log('notes表不存在，跳过');
      }
    } catch (e) {
      console.log('更新notes表失败:', e.message);
    }
    
    // 6. 显示更新后的科目分布
    console.log('\n=== 更新后的科目分布 ===');
    const [updatedSubjects] = await connection.execute(
      'SELECT subject, COUNT(*) as count FROM questions GROUP BY subject ORDER BY count DESC'
    );
    updatedSubjects.forEach(row => {
      console.log(`${row.subject}: ${row.count} 题`);
    });
    
    console.log('\n✅ 科目更新完成！');
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行更新
updateSubjects();