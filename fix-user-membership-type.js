import mysql from 'mysql2/promise';

async function fixUserMembershipType() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔧 修复用户会员类型...');
    
    // 将所有 'paid' 类型的用户改为 'active_member'
    const [result] = await connection.execute(
      'UPDATE users SET membership_type = ? WHERE membership_type = ?',
      ['active_member', 'paid']
    );

    console.log(`✅ 更新了 ${result.affectedRows} 个用户的会员类型`);
    
    // 验证用户ID为4的状态
    const [rows] = await connection.execute(
      'SELECT user_id, phone_number, membership_type, membership_expires_at FROM users WHERE user_id = ?',
      [4]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log('\n📊 用户ID 4 的最新信息:');
      console.log('- 用户ID:', user.user_id);
      console.log('- 手机号:', user.phone_number);
      console.log('- 会员类型:', user.membership_type);
      console.log('- 会员过期时间:', user.membership_expires_at);
      
      const is_active_member = user.membership_type === 'active_member';
      console.log('\n✅ 会员状态:', is_active_member ? '活跃会员（可使用所有功能）' : '非会员');
    }

    await connection.end();
    console.log('\n🎉 修复完成！现在用户可以使用所有会员功能了');
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  }
}

fixUserMembershipType();