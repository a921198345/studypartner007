# 🔄 认证系统迁移指南

## 概述

本指南说明如何从当前的多重认证系统迁移到统一认证系统。

## 迁移前后对比

### 迁移前（问题）
```typescript
// 三套并存的认证系统
import { authOptions } from '@/lib/auth'; // NextAuth
import { withAuth } from '@/lib/auth-middleware'; // 自定义JWT
import { withAuth } from '@/lib/api-auth'; // 另一套JWT
```

### 迁移后（统一）
```typescript
// 统一认证系统
import { 
  withUnifiedAuth, 
  withMembershipAuth, 
  getCurrentUser,
  authOptions 
} from '@/lib/unified-auth';
```

## 🚀 迁移步骤

### 1. API路由迁移

#### 旧代码：
```typescript
// 使用旧的认证中间件
import { withAuth } from '@/lib/auth-middleware';

export const POST = withAuth(async (request, context) => {
  const user = request.user;
  // ...
});
```

#### 新代码：
```typescript
// 使用统一认证中间件
import { withUnifiedAuth } from '@/lib/unified-auth';

export const POST = withUnifiedAuth(async (request, context) => {
  const user = request.user; // 类型安全，完整用户信息
  // ...
});
```

### 2. 会员权限检查迁移

#### 旧代码：
```typescript
// 手动检查会员权限
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(async (request) => {
  if (request.user.membership_type !== 'paid') {
    return NextResponse.json({ error: '需要会员权限' }, { status: 403 });
  }
  // ...
});
```

#### 新代码：
```typescript
// 自动会员权限检查
import { withMembershipAuth } from '@/lib/unified-auth';

export const POST = withMembershipAuth(async (request, context) => {
  // 已经确保用户是有效会员
  // ...
});
```

### 3. 客户端认证迁移

#### 旧代码：
```typescript
// 混合使用NextAuth和自定义token
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
const token = localStorage.getItem('auth-token');
```

#### 新代码：
```typescript
// 统一使用NextAuth session
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
// session.user 包含完整的用户信息
```

## 📝 需要更新的文件

### API路由文件
- [ ] `/app/api/notes/route.ts`
- [ ] `/app/api/notes/save-from-ai/route.ts`
- [ ] `/app/api/mindmaps/[subject]/route.ts`
- [ ] `/app/api/membership/status/route.ts`
- [ ] `/app/api/membership/purchase/route.ts`
- [ ] `/app/api/exams/questions/search/route.ts`
- [ ] `/app/api/exams/questions/route.ts`
- [ ] `/app/api/exams/questions/[question_id]/route.ts`
- [ ] `/app/api/auth/profile/route.ts`
- [ ] `/app/api/ai/ask/stream/route.ts`

### 组件文件
- [ ] `stores/user-store.ts` - 更新用户状态管理
- [ ] `hooks/useAuth.ts` - 统一认证hooks
- [ ] `components/auth/` - 认证相关组件

### 配置文件
- [ ] `app/api/auth/[...nextauth]/route.ts` - 更新NextAuth配置

## ⚠️ 迁移注意事项

1. **数据库兼容性**：确保用户表字段与新认证系统匹配
2. **会话持久性**：迁移期间用户可能需要重新登录
3. **API客户端**：更新所有API调用的认证头
4. **错误处理**：统一错误响应格式

## 🧪 测试清单

- [ ] 手机号验证码登录
- [ ] JWT token验证
- [ ] 会员权限检查
- [ ] 会话持久性
- [ ] 登出功能
- [ ] API认证
- [ ] 错误处理

## 📚 新增功能

1. **自动会员状态检查**：包括过期检查
2. **统一错误处理**：一致的错误响应格式
3. **类型安全**：完整的TypeScript类型定义
4. **向后兼容**：旧API逐步迁移支持
5. **session和token双支持**：灵活的认证方式

## 🔧 回滚计划

如果迁移出现问题，可以通过以下步骤回滚：

1. 恢复旧的认证文件
2. 更新import语句
3. 重启应用服务

备份文件位置：
- `lib/auth.ts.backup`
- `lib/auth-middleware.ts.backup`
- `lib/api-auth.ts.backup`