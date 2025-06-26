import mysql from 'mysql2/promise';

async function fixMembershipEnum() {
  try {
    const connection = await mysql.createConnection({
      host: '8.141.4.192',
      port: 3306,
      user: 'law_user',
      password: 'Accd0726351x.',
      database: 'law_exam_assistant',
      charset: 'utf8mb4'
    });

    console.log('🔧 修改 membership_type 字段的 ENUM 值...');
    
    // 方法1：添加 'active_member' 到 ENUM 中
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN membership_type ENUM('free', 'paid', 'active_member', 'premium', 'vip') 
      DEFAULT 'free'
    `);
    
    console.log('✅ ENUM 字段已更新，现在支持: free, paid, active_member, premium, vip');
    
    // 将现有的 'paid' 用户升级为 'active_member'
    const [result] = await connection.execute(
      "UPDATE users SET membership_type = 'active_member' WHERE membership_type = 'paid'"
    );
    
    console.log(`✅ 已将 ${result.affectedRows} 个 'paid' 用户升级为 'active_member'`);
    
    // 验证结果
    const [users] = await connection.execute(
      'SELECT user_id, phone_number, membership_type, membership_expires_at FROM users WHERE user_id = ?',
      [4]
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('\n📊 用户ID 4 的最新状态:');
      console.log('- 会员类型:', user.membership_type);
      console.log('- 会员过期时间:', user.membership_expires_at);
      
      const is_active_member = user.membership_type === 'active_member';
      console.log('- 状态:', is_active_member ? '✅ 活跃会员（可使用所有功能）' : '❌ 非活跃会员');
    }
    
    // 查看新的表结构
    const [columns] = await connection.execute("SHOW COLUMNS FROM users WHERE Field = 'membership_type'");
    console.log('\n📋 新的 membership_type 字段结构:');
    console.log(`- 类型: ${columns[0].Type}`);

    await connection.end();
    console.log('\n🎉 修复完成！现在数据库结构与代码逻辑一致了');
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error('错误详情:', error);
  }
}

fixMembershipEnum();