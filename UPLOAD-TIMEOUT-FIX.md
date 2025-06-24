# 法考真题上传超时问题修复报告

## 问题描述

用户反馈上传法考真题文件时，Python脚本会收到SIGTERM信号被终止，导致上传失败。

### 具体症状
- 文件：民法_1750737241099.docx（约925KB）
- 错误：Python脚本被SIGTERM信号终止
- 表现：通过Node.js的exec调用Python脚本时超时（60秒）

## 问题分析

### 1. 初步诊断
- 直接运行Python脚本只需要2.8秒即可完成解析
- 通过Node.js的exec调用时却总是超时
- 这表明问题不在于文件解析本身

### 2. 根本原因
在`parse_questions.py`脚本中，即使使用`--output-json`参数（用于Web API调用），脚本仍然会尝试：
1. 连接远程MySQL数据库（8.141.4.192）
2. 保存题目到数据库
3. 查询数据库中的题目总数

由于网络问题或数据库连接超时，导致整个脚本执行超时。

### 3. 代码问题位置
```python
# parse_questions.py 第420-437行
# 保存到数据库
if questions:
    if not output_json:
        print(f"准备保存 {len(questions)} 个题目到数据库...")
    save_to_database(questions, db_config)  # 问题：即使在JSON模式下也会执行
    
    # 统计数据库中的总题目数
    try:
        conn = mysql.connector.connect(**db_config)  # 问题：即使在JSON模式下也会连接
        # ...
```

## 解决方案

### 1. 修改parse_questions.py
在JSON输出模式下跳过所有数据库操作：

```python
# 修改后的代码
# 保存到数据库 - 仅在非JSON模式下执行
if questions and not output_json:
    print(f"准备保存 {len(questions)} 个题目到数据库...")
    save_to_database(questions, db_config)
    
    # 统计数据库中的总题目数
    try:
        conn = mysql.connector.connect(**db_config)
        # ...
```

### 2. 确保JSON模式返回完整数据
修改questions字段的返回逻辑，在JSON模式下返回完整的题目数据：

```python
"questions": questions if output_json else [
    {
        "question_id": q["question_id"],
        "question_text": q["question_text"][:100] + "...",
        "correct_answer": q["correct_answer"],
        "has_answer": bool(q["correct_answer"])
    } for q in questions
],  # JSON模式下输出完整题目数据
```

## 修复效果

修复后的测试结果：
- 执行时间：从超时60秒降低到2.8秒
- 成功率：100%成功解析和返回数据
- 功能完整：保留了所有解析功能，仅跳过了不必要的数据库操作

## 建议

1. **架构优化**：考虑将数据库操作完全移到Node.js层，Python脚本只负责文档解析
2. **错误处理**：添加更详细的错误日志，便于快速定位问题
3. **超时配置**：在`/app/api/admin/upload-questions/route.js`中可以适当调整超时时间
4. **性能监控**：添加执行时间日志，监控各个步骤的耗时

## 相关文件

- `/parse_questions.py` - 主要修改文件
- `/app/api/admin/upload-questions/route.js` - 上传接口
- `/diagnose-upload-timeout.py` - 诊断工具（可以保留用于未来调试）
- `/test-upload-timeout.mjs` - 测试脚本（可以删除）