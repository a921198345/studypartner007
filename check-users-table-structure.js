import mysql from 'mysql2/promise';

async function checkUsersTableStructure() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查 users 表结构...');
    
    // 查看表结构
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    
    console.log('\n📊 users 表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? '可空' : '不可空'}) ${col.Key ? `[${col.Key}]` : ''} ${col.Default ? `默认: ${col.Default}` : ''}`);
    });
    
    // 查看 membership_type 字段的可能值
    const membershipColumn = columns.find(col => col.Field === 'membership_type');
    if (membershipColumn) {
      console.log(`\n🔍 membership_type 字段详情:`);
      console.log(`- 类型: ${membershipColumn.Type}`);
      console.log(`- 默认值: ${membershipColumn.Default}`);
      
      // 如果是 ENUM 类型，显示可能的值
      if (membershipColumn.Type.includes('enum')) {
        console.log(`- 可能的值: ${membershipColumn.Type}`);
      }
    }
    
    // 查看当前用户数据
    const [users] = await connection.execute(
      'SELECT user_id, phone_number, membership_type, membership_expires_at FROM users WHERE user_id = ?',
      [4]
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('\n📋 用户ID 4 当前状态:');
      console.log('- 会员类型:', user.membership_type);
      console.log('- 会员过期时间:', user.membership_expires_at);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkUsersTableStructure();