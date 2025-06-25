import mysql from 'mysql2/promise';

async function resetUserToFree() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔄 将用户ID为4重置为免费用户...');
    
    const [result] = await connection.execute(
      'UPDATE users SET membership_type = ?, membership_expires_at = NULL WHERE user_id = ?',
      ['free', 4]
    );

    if (result.affectedRows > 0) {
      console.log('✅ 用户已重置为免费用户！');
      
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
      console.log('❌ 重置失败，没有找到用户或没有变更');
    }

    await connection.end();
    console.log('\n🎯 现在你可以测试升级会员功能了！');
    console.log('🔄 请刷新个人中心页面，应该会显示"免费用户"和"升级会员"按钮');
  } catch (error) {
    console.error('❌ 重置失败:', error.message);
  }
}

resetUserToFree();