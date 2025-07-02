import { getConnection } from './db';

/**
 * 检查用户是否为活跃会员
 * @param {Object} user - 用户对象
 * @returns {boolean} 是否为活跃会员
 */
export function checkMembership(user) {
  if (!user) return false;
  
  // 检查会员类型（包含paid作为有效会员类型）
  const valid_member_types = ['active_member', 'premium', 'vip', 'paid'];
  if (!valid_member_types.includes(user.membership_type)) {
    console.log('🔒 会员检查: 用户类型为', user.membership_type, '，不是会员');
    return false;
  }
  
  // 检查会员是否过期
  if (user.membership_expires_at) {
    const expires_date = new Date(user.membership_expires_at);
    if (expires_date < new Date()) {
      console.log('🔒 会员检查: 会员已过期');
      return false;
    }
  }
  
  console.log('✅ 会员检查: 用户是有效会员，类型:', user.membership_type);
  return true;
}

/**
 * 检查AI使用次数限制
 * @param {number} userId - 用户ID
 * @param {Object} connection - 数据库连接（可选）
 * @returns {Promise<{canUse: boolean, used: number, limit: number, remainingToday: number}>}
 */
export async function checkAIUsageLimit(userId, connection = null) {
  let conn = connection;
  let should_release = false;
  
  try {
    if (!conn) {
      conn = await getConnection();
      should_release = true;
    }
    
    // 获取用户信息
    const [users] = await conn.execute(
      'SELECT membership_type, daily_ai_queries_used, last_ai_query_date FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return { canUse: false, used: 0, limit: 0, remainingToday: 0 };
    }
    
    const user = users[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 如果是会员，无限制
    const valid_member_types = ['active_member', 'premium', 'vip', 'paid'];
    if (valid_member_types.includes(user.membership_type)) {
      return { canUse: true, used: 0, limit: -1, remainingToday: -1 }; // -1 表示无限
    }
    
    // 非会员每日限制3次
    const daily_limit = 3;
    
    // 检查是否需要重置计数（新的一天）
    let queries_used = user.daily_ai_queries_used || 0;
    const last_query_date = user.last_ai_query_date ? 
      new Date(user.last_ai_query_date).toISOString().split('T')[0] : null;
    
    if (last_query_date !== today) {
      // 新的一天，重置计数
      queries_used = 0;
      await conn.execute(
        'UPDATE users SET daily_ai_queries_used = 0, last_ai_query_date = ? WHERE user_id = ?',
        [today, userId]
      );
    }
    
    const can_use = queries_used < daily_limit;
    const remaining = Math.max(0, daily_limit - queries_used);
    
    return {
      canUse: can_use,
      used: queries_used,
      limit: daily_limit,
      remainingToday: remaining
    };
    
  } finally {
    if (should_release && conn) {
      conn.release();
    }
  }
}

/**
 * 增加AI使用次数
 * @param {number} userId - 用户ID
 * @param {Object} connection - 数据库连接（可选）
 * @returns {Promise<boolean>} 是否成功
 */
export async function incrementAIUsage(userId, connection = null) {
  let conn = connection;
  let should_release = false;
  
  try {
    if (!conn) {
      conn = await getConnection();
      should_release = true;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    await conn.execute(
      'UPDATE users SET daily_ai_queries_used = daily_ai_queries_used + 1, last_ai_query_date = ? WHERE user_id = ?',
      [today, userId]
    );
    
    return true;
    
  } catch (error) {
    console.error('增加AI使用次数失败:', error);
    return false;
  } finally {
    if (should_release && conn) {
      conn.release();
    }
  }
}

/**
 * 检查用户笔记数量限制
 * @param {number} userId - 用户ID
 * @param {Object} connection - 数据库连接（可选）
 * @returns {Promise<{canCreate: boolean, count: number, limit: number}>}
 */
export async function checkNotesLimit(userId, connection = null) {
  let conn = connection;
  let should_release = false;
  
  try {
    if (!conn) {
      conn = await getConnection();
      should_release = true;
    }
    
    // 获取用户信息和笔记数量
    const [users] = await conn.execute(
      'SELECT membership_type FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return { canCreate: false, count: 0, limit: 0 };
    }
    
    const user = users[0];
    
    // 获取用户笔记数量
    const [count_result] = await conn.execute(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ?',
      [userId]
    );
    
    const notes_count = count_result[0].count;
    
    // 会员无限制
    const valid_member_types = ['active_member', 'premium', 'vip', 'paid'];
    if (valid_member_types.includes(user.membership_type)) {
      return { canCreate: true, count: notes_count, limit: -1 };
    }
    
    // 非会员限制10条
    const notes_limit = 10;
    const can_create = notes_count < notes_limit;
    
    return {
      canCreate: can_create,
      count: notes_count,
      limit: notes_limit
    };
    
  } finally {
    if (should_release && conn) {
      conn.release();
    }
  }
}

/**
 * 记录功能使用日志
 * @param {number} userId - 用户ID
 * @param {string} featureType - 功能类型：ai_chat, mindmap, question_bank, notes
 * @param {string} action - 操作类型
 * @param {string} resourceId - 资源ID（可选）
 * @param {Object} connection - 数据库连接（可选）
 */
export async function logFeatureUsage(userId, featureType, action, resourceId = null, connection = null) {
  let conn = connection;
  let should_release = false;
  
  try {
    if (!conn) {
      conn = await getConnection();
      should_release = true;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    await conn.execute(
      `INSERT INTO user_usage_logs (user_id, feature_type, action, resource_id, usage_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, featureType, action, resourceId, today]
    );
    
  } catch (error) {
    console.error('记录功能使用日志失败:', error);
  } finally {
    if (should_release && conn) {
      conn.release();
    }
  }
}

/**
 * 中间件：检查会员权限
 * @param {string[]} allowedTypes - 允许访问的会员类型，默认只允许active_member
 */
export function requireMembership(allowedTypes = ['active_member']) {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户信息（假设已经通过auth中间件验证）
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '请先登录'
        });
      }
      
      // 检查会员状态
      const is_member = checkMembership(user);
      
      if (!is_member && !allowedTypes.includes('free_user')) {
        return res.status(403).json({
          success: false,
          error: 'UPGRADE_REQUIRED',
          message: '此功能需要升级会员才能使用',
          upgradeRequired: true
        });
      }
      
      next();
    } catch (error) {
      console.error('会员权限检查失败:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: '服务器错误'
      });
    }
  };
}