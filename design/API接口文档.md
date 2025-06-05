# 法律考试助手API接口文档

## 目录

- [管理员接口](#管理员接口)
  - [上传法律文本文档](#上传法律文本文档)
  - [获取已上传法律文档](#获取已上传法律文档)
  - [上传OPML知识导图](#上传opml知识导图)
- [认证接口](#认证接口)
  - [NextAuth认证](#nextauth认证)
- [考试接口](#考试接口)
  - [获取答题历史](#获取答题历史)
  - [获取练习进度](#获取练习进度)
  - [收藏或取消收藏题目](#收藏或取消收藏题目)
  - [获取题目详情](#获取题目详情)
  - [提交题目答案](#提交题目答案)
  - [获取收藏题目列表](#获取收藏题目列表)
  - [获取题目列表](#获取题目列表)
- [知识导图接口](#知识导图接口)
  - [获取学科知识导图](#获取学科知识导图)
  - [更新学科知识导图](#更新学科知识导图)

## 管理员接口

### 上传法律文本文档

- **接口名称**: 上传法律文本文档
- **功能描述**: 接收管理员上传的法律文档（.doc或.docx格式），保存到服务器并通过Python脚本处理文档内容，将其按照法律结构进行分段，并返回处理结果
- **入参**:
  - file: File - 上传的法律文档文件，格式必须是.doc或.docx
  - subject_area: String - 学科领域，如"民法"、"刑法"等
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - doc_id: String - 文档唯一标识
    - file_path: String - 文档保存路径
    - subject_area: String - 学科领域
    - segments_count: Number - 分段数量
    - metadata: Object - 文档元数据
- **URL地址**: /api/admin/upload-opml/legal-structure
- **请求方式**: POST

### 获取已上传法律文档

- **接口名称**: 获取已上传法律文档
- **功能描述**: 获取服务器上已上传的所有法律文档文件列表
- **入参**: 无
- **返回参数**:
  - success: Boolean - 操作是否成功
  - documents: Array - 文档列表
    - name: String - 文件名
    - path: String - 文件路径
    - size: Number - 文件大小
    - subject_area: String - 学科领域
    - created_at: Date - 创建时间
- **URL地址**: /api/admin/upload-opml/legal-structure
- **请求方式**: GET

### 上传OPML知识导图

- **接口名称**: 上传OPML知识导图
- **功能描述**: 接收管理员上传的OPML格式知识导图文件，解析并存储到数据库
- **入参**:
  - opmlFile: File - 上传的OPML文件，最大5MB
  - subjectName: String - 学科名称
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - subject: String - 学科名称
    - filePath: String - 文件保存路径
- **URL地址**: /api/admin/upload-opml
- **请求方式**: POST

## 认证接口

### NextAuth认证

- **接口名称**: NextAuth认证
- **功能描述**: 处理用户认证相关的所有请求，包括登录、注册、会话管理等
- **入参**: 依赖于NextAuth配置和具体认证提供商
- **返回参数**: 依赖于请求类型和NextAuth配置
- **URL地址**: /api/auth/[...nextauth]
- **请求方式**: GET/POST

## 考试接口

### 获取答题历史

- **接口名称**: 获取答题历史
- **功能描述**: 获取当前登录用户的答题历史记录，可按学科和年份筛选
- **入参**:
  - subject: String - (可选)筛选特定学科的题目
  - year: String - (可选)筛选特定年份的题目
- **返回参数**:
  - success: Boolean - 操作是否成功
  - data: Object - 答题历史数据
    - answered: Object - 已回答的题目ID映射
    - correct: Object - 回答正确的题目ID映射
    - results: Object - 每个题目的详细答题记录
    - totalAnswered: Number - 总答题数
    - totalCorrect: Number - 回答正确的题目数
    - records: Array - 原始答题记录列表
- **URL地址**: /api/exams/answers/history
- **请求方式**: GET

### 获取练习进度

- **接口名称**: 获取练习进度
- **功能描述**: 获取用户最近的练习进度信息，包括最后做的题目ID和时间
- **入参**:
  - subject: String - (可选)筛选特定学科
  - year: String - (可选)筛选特定年份
  - question_type: String - (可选)筛选题目类型，如"单选题"或"多选题"
- **返回参数**:
  - success: Boolean - 操作是否成功
  - data: Object - 成功时返回的数据
    - last_question_id: Number - 最后做的题目ID
    - last_practice_time: Date - 最后练习时间
- **URL地址**: /api/exams/progress
- **请求方式**: GET

### 收藏或取消收藏题目

- **接口名称**: 收藏或取消收藏题目
- **功能描述**: 收藏或取消收藏指定题目，如已收藏则取消，未收藏则添加
- **入参**:
  - question_id: Number - 题目ID (通过URL路径参数传递)
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - is_favorite: Boolean - 操作后题目的收藏状态
- **URL地址**: /api/exams/questions/[question_id]/favorite
- **请求方式**: POST

### 获取题目详情

- **接口名称**: 获取题目详情
- **功能描述**: 获取指定ID题目的详细信息，包括题干、选项、答案和解析
- **入参**:
  - question_id: Number - 题目ID (通过URL路径参数传递)
- **返回参数**:
  - success: Boolean - 操作是否成功
  - data: Object - 题目详情
    - id: Number - 题目ID
    - question_code: String - 题目编码
    - subject: String - 学科
    - year: String - 年份
    - question_type: Number - 题目类型(1:单选题,2:多选题)
    - question_text: String - 题干
    - options: Array - 选项列表
    - correct_answer: String - 正确答案
    - explanation: String - 解析文本
    - is_favorite: Boolean - 是否已收藏
- **URL地址**: /api/exams/questions/[question_id]
- **请求方式**: GET

### 提交题目答案

- **接口名称**: 提交题目答案
- **功能描述**: 提交用户的答案，判断是否正确并返回正确答案和解析
- **入参**:
  - question_id: Number - 题目ID (通过URL路径参数传递)
  - submitted_answer: String - 用户提交的答案
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - is_correct: Boolean - 答案是否正确
    - correct_answer: String - 正确答案
    - explanation: String - 题目解析
    - question_type: Number - 题目类型
- **URL地址**: /api/exams/questions/[question_id]/submit
- **请求方式**: POST

### 获取收藏题目列表

- **接口名称**: 获取收藏题目列表
- **功能描述**: 获取当前用户收藏的所有题目列表
- **入参**:
  - withDetails: Boolean - 是否返回题目的完整详情
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - favorites: Array - 收藏题目列表
    - total: Number - 收藏题目总数
- **URL地址**: /api/exams/questions/favorites
- **请求方式**: GET

### 获取题目列表

- **接口名称**: 获取题目列表
- **功能描述**: 获取题库中的题目列表，支持分页和多种筛选条件
- **入参**:
  - subject: String - (可选)筛选特定学科
  - year: String - (可选)筛选特定年份，可用逗号分隔多个年份
  - page: Number - (可选)页码，默认为1
  - limit: Number - (可选)每页题目数量，默认为10
  - question_type: String - (可选)筛选题目类型，如"单选题"或"多选题"
  - fetchAllIdsAndCodes: Boolean - (可选)是否只获取所有题目的ID和题号，不分页
- **返回参数**:
  - success: Boolean - 操作是否成功
  - message: String - 操作结果描述
  - data: Object - 成功时返回的数据
    - questions: Array - 题目列表
    - pagination: Object - 分页信息
      - total: Number - 总题目数
      - totalPages: Number - 总页数
      - currentPage: Number - 当前页码
      - perPage: Number - 每页题目数
- **URL地址**: /api/exams/questions
- **请求方式**: GET

## 知识导图接口

### 获取学科知识导图

- **接口名称**: 获取学科知识导图
- **功能描述**: 获取指定学科的知识导图数据
- **入参**:
  - subject: String - 学科名称 (通过URL路径参数传递)
- **返回参数**:
  - success: Boolean - 操作是否成功
  - mindmap: Object - 知识导图数据
    - map_data: Object - 知识导图内容
- **URL地址**: /api/mindmaps/[subject]
- **请求方式**: GET

### 更新学科知识导图

- **接口名称**: 更新学科知识导图
- **功能描述**: 更新指定学科的知识导图数据，仅管理员可操作
- **入参**:
  - subject: String - 学科名称 (通过URL路径参数传递)
  - 请求体: Object - 新的知识导图数据
- **返回参数**:
  - success: Boolean - 操作是否成功
- **URL地址**: /api/mindmaps/[subject]
- **请求方式**: PUT 