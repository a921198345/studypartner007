import mysql from 'mysql2/promise';

async function upgradeUserToMember() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔄 将用户ID为4升级为会员...');
    
    // 设置会员过期时间为1个月后
    const expires_at = new Date();
    expires_at.setMonth(expires_at.getMonth() + 1);
    
    const [result] = await connection.execute(
      'UPDATE users SET membership_type = ?, membership_expires_at = ? WHERE user_id = ?',
      ['paid', expires_at, 4]
    );

    if (result.affectedRows > 0) {
      console.log('✅ 用户升级成功！');
      console.log('- 新会员类型: paid');
      console.log('- 会员过期时间:', expires_at.toISOString().split('T')[0]);
      
      // 验证更新结果
      const [rows] = await connection.execute(
        'SELECT user_id, phone_number, membership_type, membership_expires_at FROM users WHERE user_id = ?',
        [4]
      );
      
      if (rows.length > 0) {
        const user = rows[0];
        console.log('\n📊 更新后的用户信息:');
        console.log('- 用户ID:', user.user_id);
        console.log('- 手机号:', user.phone_number);
        console.log('- 会员类型:', user.membership_type);
        console.log('- 会员过期时间:', user.membership_expires_at);
      }
    } else {
      console.log('❌ 升级失败，没有找到用户或没有变更');
    }

    await connection.end();
    console.log('\n🎉 现在你可以访问所有学科的知识导图了！');
    console.log('🔄 请刷新浏览器页面来测试刑法知识导图');
  } catch (error) {
    console.error('❌ 升级失败:', error.message);
  }
}

upgradeUserToMember();