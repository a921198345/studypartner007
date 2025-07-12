# 🚀 API端点命名标准化方案

## 📋 现状分析

### ❌ 当前存在的非标准命名

1. **动作型端点**（不符合RESTful）
   - `POST /api/ai/ask/answer` → 应该是 `POST /api/ai/answers`
   - `POST /api/ai/ask/stream` → 应该是 `POST /api/ai/answers/stream`
   - `POST /api/membership/simple-upgrade` → 应该是 `PATCH /api/membership`

2. **混合名词和动词**
   - `POST /api/exams/questions/[id]/submit` → 应该是 `POST /api/exams/questions/[id]/answers`
   - `GET /api/admin/check-uploads` → 应该是 `GET /api/admin/uploads/status`

3. **非标准嵌套**
   - `POST /api/notes/save-from-ai` → 应该是 `POST /api/notes?source=ai`

## ✅ RESTful API命名标准

### 基础原则

1. **使用名词而非动词**
   - ✅ `GET /api/users` 
   - ❌ `GET /api/getUsers`

2. **使用复数形式**
   - ✅ `GET /api/questions`
   - ❌ `GET /api/question`

3. **HTTP动词表示操作**
   - `GET` - 获取资源
   - `POST` - 创建资源
   - `PUT` - 完整更新资源
   - `PATCH` - 部分更新资源
   - `DELETE` - 删除资源

4. **嵌套路径表示关系**
   - ✅ `GET /api/users/{id}/notes`
   - ❌ `GET /api/getUserNotes/{id}`

### 标准化路径模式

```
/api/{resource}                    # 资源集合
/api/{resource}/{id}               # 特定资源
/api/{resource}/{id}/{subresource} # 子资源
/api/{resource}/{id}/actions       # 资源操作
```

## 🔄 重构计划

### 第一阶段：AI相关API

#### 当前 → 新设计
```
POST /api/ai/ask/answer           → POST /api/ai/answers
POST /api/ai/ask/stream           → POST /api/ai/answers/stream  
POST /api/ai/ask/context          → GET  /api/ai/context
POST /api/ai/extract-keywords     → POST /api/ai/keywords
POST /api/ai/extract-single-keyword → POST /api/ai/keywords/single
```

#### 新的AI API结构
```
/api/ai/
├── answers/          # AI问答
│   ├── POST          # 创建答案
│   └── stream/       # 流式答案
│       └── POST      # 创建流式答案
├── keywords/         # 关键词提取
│   ├── POST          # 批量提取
│   └── single/       # 单个提取
│       └── POST      
└── context/          # 上下文分析
    └── GET           # 获取上下文
```

### 第二阶段：会员系统API

#### 当前 → 新设计
```
GET  /api/membership/status        → GET    /api/membership
POST /api/membership/purchase      → POST   /api/membership/orders
POST /api/membership/simple-upgrade → PATCH /api/membership
POST /api/membership/webhook       → POST  /api/membership/webhooks
```

#### 新的会员API结构
```
/api/membership/
├── GET               # 获取会员状态
├── PATCH             # 更新会员状态
├── orders/           # 订单管理
│   ├── POST          # 创建订单
│   └── [id]/         # 特定订单
│       ├── GET       # 获取订单
│       └── PATCH     # 更新订单状态
└── webhooks/         # 支付回调
    └── POST          # 处理回调
```

### 第三阶段：题库系统API

#### 当前 → 新设计
```
GET  /api/exams/questions/search     → GET  /api/questions?search=keyword
POST /api/exams/questions/[id]/submit → POST /api/questions/[id]/answers
GET  /api/exams/questions/favorites  → GET  /api/questions/favorites
POST /api/exams/questions/[id]/favorite → POST /api/questions/[id]/favorites
```

#### 新的题库API结构
```
/api/questions/
├── GET               # 获取题目列表 (支持搜索参数)
├── POST              # 创建题目 (管理员)
├── [id]/             # 特定题目
│   ├── GET           # 获取题目详情
│   ├── answers/      # 答题记录
│   │   ├── GET       # 获取答题历史
│   │   └── POST      # 提交答案
│   └── favorites/    # 收藏操作
│       ├── POST      # 添加收藏
│       └── DELETE    # 取消收藏
└── favorites/        # 收藏管理
    └── GET           # 获取收藏列表
```

### 第四阶段：学习笔记API

#### 当前 → 新设计
```
POST /api/notes/save-from-ai → POST /api/notes?source=ai
GET  /api/notes/trash        → GET  /api/notes?status=deleted
```

#### 新的笔记API结构
```
/api/notes/
├── GET               # 获取笔记列表 (支持筛选参数)
├── POST              # 创建笔记 (支持source参数)
├── [id]/             # 特定笔记
│   ├── GET           # 获取笔记详情
│   ├── PATCH         # 更新笔记
│   └── DELETE        # 删除笔记 (软删除)
└── categories/       # 分类管理
    ├── GET           # 获取分类列表
    └── POST          # 创建分类
```

## 📊 URL参数标准化

### 查询参数规范

1. **分页参数**
   ```
   ?page=1&limit=20
   ```

2. **排序参数**
   ```
   ?sort=created_at&order=desc
   ```

3. **筛选参数**
   ```
   ?status=active&category=law&search=keyword
   ```

4. **包含关系**
   ```
   ?include=user,category
   ```

### 响应格式标准化

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1"
  }
}
```

## 🔄 迁移策略

### 向后兼容迁移

1. **阶段1：新端点创建**
   - 创建新的标准化端点
   - 保留旧端点，添加deprecation警告

2. **阶段2：客户端迁移**
   - 更新前端调用新端点
   - 在开发环境测试

3. **阶段3：旧端点下线**
   - 监控旧端点使用情况
   - 逐步移除旧端点

### 实施时间表

- **第1周**：AI API重构
- **第2周**：会员系统API重构  
- **第3周**：题库系统API重构
- **第4周**：笔记系统API重构
- **第5周**：前端客户端迁移
- **第6周**：旧端点清理

## 📝 开发规范

### 新API开发检查清单

- [ ] 使用名词而非动词
- [ ] 使用复数形式
- [ ] 正确的HTTP动词
- [ ] 标准化的响应格式
- [ ] 适当的状态码
- [ ] 统一的错误处理
- [ ] API文档更新

### 命名约定

1. **URL路径**: 小写，用连字符分隔
   - ✅ `/api/study-plans`
   - ❌ `/api/studyPlans`

2. **参数名**: 蛇形命名法
   - ✅ `user_id`, `created_at`
   - ❌ `userId`, `createdAt`

3. **资源名**: 英文名词，复数形式
   - ✅ `questions`, `notes`, `users`
   - ❌ `question`, `note`, `user`