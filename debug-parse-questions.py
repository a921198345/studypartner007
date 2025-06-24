#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""调试版本的parse_questions.py"""

import sys
import os
import json
import time

# 立即输出，强制刷新
def debug_print(msg):
    print(f"[DEBUG] {msg}", file=sys.stderr, flush=True)

debug_print(f"Python脚本启动: PID={os.getpid()}")
debug_print(f"参数: {sys.argv}")
debug_print(f"Python版本: {sys.version}")
debug_print(f"工作目录: {os.getcwd()}")

# 检查参数
if len(sys.argv) < 3:
    debug_print("参数不足")
    print(json.dumps({"error": "参数不足"}, ensure_ascii=False))
    sys.exit(1)

file_path = sys.argv[1]
subject = sys.argv[2]
output_json = "--output-json" in sys.argv

debug_print(f"文件路径: {file_path}")
debug_print(f"学科: {subject}")
debug_print(f"JSON输出: {output_json}")

# 检查文件是否存在
if not os.path.exists(file_path):
    debug_print(f"文件不存在: {file_path}")
    if output_json:
        print(json.dumps({"error": f"文件不存在: {file_path}"}, ensure_ascii=False))
    else:
        print(f"错误: 文件不存在: {file_path}")
    sys.exit(1)

debug_print(f"文件大小: {os.path.getsize(file_path)} bytes")

# 尝试导入所需模块
try:
    debug_print("开始导入模块...")
    start_time = time.time()
    
    debug_print("导入re...")
    import re
    
    debug_print("导入mysql.connector...")
    import mysql.connector
    
    debug_print("导入docx...")
    from docx import Document
    
    elapsed = time.time() - start_time
    debug_print(f"模块导入完成，耗时: {elapsed:.2f}秒")
    
except Exception as e:
    debug_print(f"导入模块失败: {e}")
    if output_json:
        print(json.dumps({"error": f"导入模块失败: {str(e)}"}, ensure_ascii=False))
    else:
        print(f"错误: 导入模块失败: {e}")
    sys.exit(1)

# 简单的解析测试
try:
    debug_print("开始解析文档...")
    start_time = time.time()
    
    doc = Document(file_path)
    para_count = len(doc.paragraphs)
    
    elapsed = time.time() - start_time
    debug_print(f"文档解析完成，段落数: {para_count}，耗时: {elapsed:.2f}秒")
    
    # 模拟成功输出
    result = {
        "success": True,
        "message": f"调试模式: 成功读取{para_count}个段落",
        "total_questions": 0,
        "parsed_questions": 0,
        "questions": []
    }
    
    if output_json:
        print(json.dumps(result, ensure_ascii=False), flush=True)
    else:
        print(f"成功: 读取了{para_count}个段落")
    
    debug_print("脚本执行完成")
    
except Exception as e:
    debug_print(f"解析失败: {e}")
    if output_json:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
    else:
        print(f"错误: {e}")
    sys.exit(1)