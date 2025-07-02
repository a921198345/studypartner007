import { NextResponse } from 'next/server';
import { withAuth, getUserFromRequest } from '@/lib/auth-middleware';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+08:00'
};

// 获取用户资料
async function getProfile(request) {
  let connection;
  
  try {
    // 从认证中间件获取用户信息
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      );
    }

    connection = await mysql.createConnection(dbConfig);
    
    // 查询用户详细信息
    const sql = `
      SELECT user_id, phone_number, nickname, avatar_url, 
             membership_type, membership_expires_at, 
             created_at, last_login
      FROM users 
      WHERE user_id = ?
    `;
    
    const [rows] = await connection.execute(sql, [user.user_id]);
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const userProfile = rows[0];
    
    return NextResponse.json({
      success: true,
      user: {
        user_id: userProfile.user_id,
        phone_number: userProfile.phone_number,
        nickname: userProfile.nickname,
        avatar_url: userProfile.avatar_url,
        membership_type: userProfile.membership_type,
        membership_expires_at: userProfile.membership_expires_at,
        created_at: userProfile.created_at,
        last_login: userProfile.last_login
      }
    });
    
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 应用认证中间件
export const GET = withAuth(getProfile);