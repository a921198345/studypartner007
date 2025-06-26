// 会员权限配置
export const MEMBERSHIP_CONFIG = {
  // 免费用户可以访问的年份
  FREE_YEARS: ['2022'],
  
  // 各年份的访问权限要求
  YEAR_ACCESS: {
    '2024': 'member', // 需要会员权限
    '2023': 'member', // 需要会员权限
    '2022': 'free',   // 免费
    '2021': 'member', // 需要会员权限
    '2020': 'member', // 需要会员权限
    '2019': 'member', // 需要会员权限
  },
  
  // 会员类型
  MEMBERSHIP_TYPES: {
    FREE: 'free',
    MEMBER: 'member',
    ADMIN: 'admin'
  }
};

// 检查用户是否有权限访问指定年份的题目
export function hasAccessToYear(year, membershipType) {
  // 管理员可以访问所有年份
  if (membershipType === MEMBERSHIP_CONFIG.MEMBERSHIP_TYPES.ADMIN) {
    return true;
  }
  
  // 检查年份的访问权限
  const requiredAccess = MEMBERSHIP_CONFIG.YEAR_ACCESS[year];
  
  if (!requiredAccess || requiredAccess === 'free') {
    return true; // 免费年份或未配置的年份
  }
  
  // 需要会员权限
  return membershipType === MEMBERSHIP_CONFIG.MEMBERSHIP_TYPES.MEMBER;
}

// 获取用户可访问的年份列表
export function getAccessibleYears(membershipType) {
  if (membershipType === MEMBERSHIP_CONFIG.MEMBERSHIP_TYPES.ADMIN || 
      membershipType === MEMBERSHIP_CONFIG.MEMBERSHIP_TYPES.MEMBER) {
    // 会员和管理员可以访问所有年份
    return Object.keys(MEMBERSHIP_CONFIG.YEAR_ACCESS);
  }
  
  // 免费用户只能访问免费年份
  return MEMBERSHIP_CONFIG.FREE_YEARS;
}