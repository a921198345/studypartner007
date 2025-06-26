import mysql from 'mysql2/promise';

async function checkUsersTable() {
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
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    
    console.log('📊 users 表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}) ${col.Default ? `默认: ${col.Default}` : ''}`);
    });

    // 特别检查 membership_type 字段
    const membershipCol = columns.find(col => col.Field === 'membership_type');
    if (membershipCol) {
      console.log('\n🔍 membership_type 字段详情:');
      console.log('- 类型:', membershipCol.Type);
      console.log('- 默认值:', membershipCol.Default);
      
      if (membershipCol.Type.includes('enum')) {
        console.log('⚠️  这是 ENUM 类型，需要使用预定义的值');
        console.log('🔧 建议的有效值: free_user, active_member');
      }
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkUsersTable();