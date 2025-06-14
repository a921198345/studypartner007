#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
全面修复题目选项问题的脚本
包括从原始文档重新解析
"""

import mysql.connector
import json
import re
from docx import Document
import os

def get_question_from_doc(file_path, question_id):
    """从原始文档中获取特定题目的内容"""
    try:
        doc = Document(file_path)
        full_text = ""
        
        # 将所有段落合并为一个文本
        for para in doc.paragraphs:
            full_text += para.text + "\n"
        
        # 查找特定题目
        pattern = rf'【{question_id}】.*?(?=【\d{{8}}】|$)'
        match = re.search(pattern, full_text, re.DOTALL)
        
        if match:
            return match.group(0)
        return None
    except:
        return None

def extract_clean_options(question_text):
    """从题目文本中提取干净的选项"""
    if not question_text:
        return None
    
    # 分离题目和解析
    parts = question_text.split('【解析】')
    if len(parts) < 2:
        return None
    
    question_part = parts[0]
    
    # 提取题干
    question_stem_match = re.search(r'】(.*?)(?=[A-D]\.)', question_part, re.DOTALL)
    if not question_stem_match:
        return None
    
    options = {}
    
    # 逐个提取选项
    for opt in ['A', 'B', 'C', 'D']:
        # 查找选项位置
        pattern = rf'{opt}\.(.+?)(?=[A-D]\.|【解析】|$)'
        match = re.search(pattern, question_part, re.DOTALL)
        
        if match:
            option_text = match.group(1).strip()
            # 清理空白
            option_text = re.sub(r'\s+', ' ', option_text)
            options[opt] = option_text
        else:
            options[opt] = "[选项缺失]"
    
    return options

def main():
    # 数据库配置
    db_config = {
        'host': '8.141.4.192',
        'user': 'law_user',
        'password': 'Accd0726351x.',
        'database': 'law_exam_assistant'
    }
    
    # 刑法文档路径
    doc_path = "/Users/acheng/Downloads/law-exam-assistant/uploads/刑法_1749471200053.docx"
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    try:
        # 查询需要修复的题目（选项中包含解析内容的）
        cursor.execute("""
            SELECT id, question_code, options_json 
            FROM questions 
            WHERE subject = '刑法'
            AND (options_json LIKE '%项是%' 
                 OR options_json LIKE '%项错误%' 
                 OR options_json LIKE '%理由在于%'
                 OR options_json LIKE '%[选项内容需要手动修复]%'
                 OR options_json LIKE '%[选项缺失]%'
                 OR options_json LIKE '%[选项内容缺失]%')
        """)
        
        rows = cursor.fetchall()
        print(f"找到 {len(rows)} 个需要修复的题目")
        
        fixed_count = 0
        failed_count = 0
        
        for row in rows:
            q_id, q_code, old_options_json = row
            
            print(f"\n处理题目 {q_code}")
            
            # 从原始文档获取题目
            question_text = get_question_from_doc(doc_path, q_code)
            
            if question_text:
                # 提取干净的选项
                clean_options = extract_clean_options(question_text)
                
                if clean_options and all(opt != "[选项缺失]" for opt in clean_options.values()):
                    new_options_json = json.dumps(clean_options, ensure_ascii=False)
                    
                    # 更新数据库
                    cursor.execute("""
                        UPDATE questions 
                        SET options_json = %s 
                        WHERE id = %s
                    """, (new_options_json, q_id))
                    
                    fixed_count += 1
                    print(f"✓ 成功修复")
                    
                    # 显示修复前后对比
                    old_options = json.loads(old_options_json)
                    print("修复前:")
                    for k, v in old_options.items():
                        print(f"  {k}: {v[:50]}...")
                    print("修复后:")
                    for k, v in clean_options.items():
                        print(f"  {k}: {v[:50]}...")
                else:
                    print(f"✗ 无法提取干净的选项")
                    failed_count += 1
            else:
                print(f"✗ 在文档中找不到该题目")
                failed_count += 1
            
            if (fixed_count + failed_count) % 10 == 0:
                conn.commit()
                print(f"\n进度: 已处理 {fixed_count + failed_count}/{len(rows)} 个题目")
        
        # 提交最后的更改
        conn.commit()
        print(f"\n修复完成！")
        print(f"成功修复: {fixed_count} 个")
        print(f"修复失败: {failed_count} 个")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()