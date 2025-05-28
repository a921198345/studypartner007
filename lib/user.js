/**
 * 用户管理服务模块
 * 
 * 提供用户注册、登录、管理等功能
 */

import { query, queryOne } from './db.js';
import { verifyCode } from './sms.js';
import jwt from 'jsonwebtoken';

/**
 * 根据手机号查询用户
 * @param {string} phoneNumber - 用户手机号
 * @returns {Promise<Object|null>} - 用户信息或null
 */
export async function getUserByPhone(phoneNumber) {
  return await queryOne('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
}

/**
 * 创建新用户
 * @param {string} phoneNumber - 用户手机号
 * @param {string} nickname - 用户昵称（可选）
 * @param {string} avatarUrl - 用户头像URL（可选）
 * @returns {Promise<Object>} - 新创建的用户信息
 */
export async function createUser(phoneNumber, nickname = null, avatarUrl = null) {
  // 如果没有提供昵称，生成默认昵称（手机号后4位）
  if (!nickname) {
    nickname = `用户${phoneNumber.slice(-4)}`;
  }
  
  // 插入新用户
  const result = await query(
    `INSERT INTO users (phone_number, nickname, avatar_url)
     VALUES (?, ?, ?)`,
    [phoneNumber, nickname, avatarUrl]
  );
  
  // 返回新创建的用户信息
  return {
    user_id: result.insertId,
    phone_number: phoneNumber,
    nickname,
    avatar_url: avatarUrl,
    membership_type: 'free_user',
    created_at: new Date()
  };
}

/**
 * 通过短信验证码登录或注册
 * @param {string} phoneNumber - 用户手机号
 * @param {string} verificationCode - 短信验证码
 * @returns {Promise<Object>} - 登录结果，包含用户信息和JWT令牌
 */
export async function loginWithSmsCode(phoneNumber, verificationCode) {
  try {
    // 1. 验证短信验证码
    const isCodeValid = await verifyCode(phoneNumber, verificationCode);
    
    if (!isCodeValid) {
      return {
        success: false,
        message: '验证码错误或已过期'
      };
    }
    
    // 2. 查询用户是否存在
    let user = await getUserByPhone(phoneNumber);
    let isNewUser = false;
    
    // 3. 如果用户不存在，则创建新用户
    if (!user) {
      user = await createUser(phoneNumber);
      isNewUser = true;
    }
    
    // 4. 更新最后登录时间
    await query(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );
    
    // 5. 生成JWT令牌
    const token = generateToken(user);
    
    // 6. 返回登录结果
    return {
      success: true,
      user: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        membership_type: user.membership_type
      },
      token,
      isNewUser
    };
    
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
}

/**
 * 生成JWT令牌
 * @param {Object} user - 用户信息
 * @returns {string} JWT令牌
 */
function generateToken(user) {
  const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    {
      user_id: user.user_id,
      phone_number: user.phone_number,
      membership_type: user.membership_type
    },
    jwtSecret,
    { expiresIn }
  );
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Promise<Object>} - 验证结果
 */
export async function verifyToken(token) {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    const decoded = jwt.verify(token, jwtSecret);
    
    // 验证用户是否存在
    const user = await queryOne('SELECT * FROM users WHERE user_id = ?', [decoded.user_id]);
    
    if (!user) {
      return {
        success: false,
        message: '用户不存在'
      };
    }
    
    return {
      success: true,
      user: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        membership_type: user.membership_type
      }
    };
    
  } catch (error) {
    console.error('令牌验证失败:', error);
    return {
      success: false,
      message: '登录已过期，请重新登录'
    };
  }
}

/**
 * 修改用户信息
 * @param {number} userId - 用户ID
 * @param {Object} updates - 要更新的字段
 * @returns {Promise<Object>} - 更新结果
 */
export async function updateUserProfile(userId, updates) {
  try {
    // 允许更新的字段
    const allowedFields = ['nickname', 'avatar_url'];
    const updateFields = {};
    
    // 过滤更新字段
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields[key] = updates[key];
      }
    });
    
    // 如果没有可更新的字段
    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        message: '没有提供有效的更新字段'
      };
    }
    
    // 构建更新SQL
    const setClause = Object.keys(updateFields)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updateFields), userId];
    
    // 执行更新
    await query(
      `UPDATE users SET ${setClause} WHERE user_id = ?`,
      values
    );
    
    return {
      success: true,
      message: '个人信息更新成功'
    };
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      message: '更新失败，请稍后重试'
    };
  }
}

export default {
  getUserByPhone,
  createUser,
  loginWithSmsCode,
  verifyToken,
  updateUserProfile
}; 