#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
检查解析失败的题目20200119
"""

import re
from docx import Document

def find_question_20200119(file_path):
    """查找题目20200119"""
    doc = Document(file_path)
    
    # 将所有段落合并为一个文本
    full_text = ""
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    for q_text in questions_text:
        if '【20200119】' in q_text:
            print("找到题目20200119:")
            print("="*80)
            print(q_text)
            print("="*80)
            print(f"\n题目长度: {len(q_text)} 字符")
            
            # 检查是否有【解析】标记
            if '【解析】' in q_text:
                print("有【解析】标记")
                parts = q_text.split('【解析】')
                print(f"题干部分长度: {len(parts[0])} 字符")
                print(f"解析部分长度: {len(parts[1])} 字符")
            else:
                print("缺少【解析】标记")
                
            # 检查是否有选项
            options_found = re.findall(r'[A-D][\.、：:]', q_text)
            print(f"\n找到的选项标记: {options_found}")
            
            # 查找可能的答案位置
            print("\n可能的答案标识:")
            answer_patterns = [
                r'【答案】\s*[：:：]?\s*([A-D]+)',
                r'答案[：:]\s*([A-D]+)',
                r'故选\s*([A-D]+)',
                r'[A-D]\s*项?[是为]?正确',
            ]
            
            for pattern in answer_patterns:
                matches = re.findall(pattern, q_text, re.IGNORECASE)
                if matches:
                    print(f"  匹配 '{pattern}': {matches}")
            
            return q_text
    
    print("未找到题目20200119")
    return None

def main():
    file_path = "2013-2022客观题分科真题：刑法.docx"
    find_question_20200119(file_path)

if __name__ == "__main__":
    main()