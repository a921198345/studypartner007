import mysql from 'mysql2/promise';

async function checkUserMembership() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔍 检查用户ID为4的会员状态...');
    
    const [rows] = await connection.execute(
      'SELECT user_id, phone_number, membership_type, membership_expires_at, created_at FROM users WHERE user_id = ?',
      [4]
    );

    if (rows.length > 0) {
      const user = rows[0];
      console.log('📊 用户信息:');
      console.log('- 用户ID:', user.user_id);
      console.log('- 手机号:', user.phone_number);
      console.log('- 会员类型:', user.membership_type);
      console.log('- 会员过期时间:', user.membership_expires_at);
      console.log('- 注册时间:', user.created_at);
      
      const is_member = user.membership_type === 'active_member';
      console.log('\n✅ 会员状态检查结果:');
      console.log('- 是否为会员:', is_member ? '是' : '否');
      
      if (!is_member) {
        console.log('🔒 403错误原因: 用户不是会员，无法访问刑法等付费内容');
        console.log('💡 解决方案: 需要升级为 active_member 或显示升级提示');
      }
    } else {
      console.log('❌ 未找到用户ID为4的用户');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

checkUserMembership();