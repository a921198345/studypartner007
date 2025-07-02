# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于Next.js 14的法考助手应用，提供AI问答、知识导图、真题库、学习计划等功能。主要服务于法律职业资格考试的学习者。

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本  
npm run build

# 启动生产服务
npm run start

# 类型检查（如果有TypeScript）
npm run type-check

# 代码检查
npm run lint
```

## 部署命令

```bash
# 使用部署脚本
bash deploy.sh

# 或手动部署
npm run build
pm2 restart law-exam-assistant
```

## 技术架构

### 核心技术栈
- **前端**: Next.js 14 (App Router) + React 18
- **UI**: shadcn/ui + Tailwind CSS + Ant Design  
- **状态管理**: Redux Toolkit + Zustand
- **数据库**: MySQL + SQLite (混合使用)
- **AI服务**: DeepSeek API
- **认证**: NextAuth.js + 阿里云短信验证

### 关键目录结构
```
app/
├── api/              # API路由层
│   ├── admin/        # 管理员功能
│   ├── ai/          # AI问答接口
│   ├── auth/        # 认证相关
│   ├── exams/       # 题库系统
│   ├── mindmaps/    # 知识导图
│   └── study-plan/  # 学习计划
├── ai-chat/         # AI问答页面
├── knowledge-map/   # 知识导图页面
├── question-bank/   # 题库页面
└── learning-plan/   # 学习计划页面

components/          # 共享组件
lib/                # 工具库和配置
db/                 # 数据库迁移文件
data/               # 数据备份文件
```

## 数据库架构

### 主要数据表
- `questions` - 题目表，包含历年真题数据
- `users` - 用户表，支持手机号注册
- `mindmaps` - 知识导图数据表
- `user_wrong_answers` - 用户错题记录
- `user_favorites` - 用户收藏题目
- `notes` - 学习笔记
- `study_plans` - 个性化学习计划

### 数据库连接
- **统一使用MySQL数据库** (生产和开发环境)
- 连接配置在`lib/db`，使用连接池管理
- 环境变量配置：`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`

## API设计模式

### 认证中间件
所有需要登录的API都应使用认证中间件：
```javascript
import { verifyToken } from '@/lib/auth';
```

### 错误处理
API应该返回统一的错误格式：
```javascript
return NextResponse.json({ error: 'Error message' }, { status: 400 });
```

## 开发注意事项

### 状态管理策略
- **统一使用Zustand进行状态管理**
- 状态按功能模块拆分：
  - `stores/user-store.ts` - 用户认证和会员信息
  - `stores/study-plan-store.ts` - 学习计划管理
  - `stores/study-session-store.ts` - 学习会话和进度跟踪
  - `hooks/useChatStore.ts` - AI聊天对话状态
- **已移除Redux依赖** - 项目不再使用Redux Toolkit

### 组件开发规范
- **统一使用shadcn/ui组件库** + Tailwind CSS
- **已移除Ant Design依赖** - 避免UI风格冲突
- 自定义组件放在`components/`对应子目录
- 页面级组件直接在app路由中定义
- **Logo组件已统一** - 使用`StudyBuddyLogoSimple.tsx`

### 数据库操作
- 使用预处理语句防止SQL注入
- 错误查询应该有适当的错误处理
- 注意MySQL和SQLite语法差异

### AI功能集成
- AI问答使用DeepSeek API
- API调用需要错误重试机制
- 注意API调用频率限制

## 常见问题解决

### 构建问题
- 如果遇到路径别名问题，检查`next.config.mjs`配置
- TypeScript错误优先检查`tsconfig.json`

### 数据库连接问题
- 检查环境变量配置
- 确认数据库服务状态
- 注意生产和开发环境数据库差异

### 部署问题  
- 确保PM2配置正确
- 检查服务器权限和端口配置
- 宝塔面板部署需要检查反向代理设置

## 环境变量

确保以下环境变量正确配置：
- `DATABASE_URL` - 数据库连接字符串
- `DEEPSEEK_API_KEY` - DeepSeek AI API密钥
- `NEXTAUTH_SECRET` - NextAuth加密密钥
- `ALIYUN_SMS_*` - 阿里云短信服务配置

## 项目维护

### 代码清理
项目中存在大量临时文件和脚本，开发时应：
- 定期清理`_archived_scripts/`目录
- 删除不必要的调试文件
- 统一文件命名规范（避免中文文件名）

### 性能优化
- 定期检查Bundle大小
- 优化数据库查询
- 实现适当的缓存策略