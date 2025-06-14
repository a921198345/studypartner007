#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
调试脚本：分析刑法题目解析问题
"""

import re
from docx import Document
import json

def analyze_document(file_path):
    """分析文档中的题目格式"""
    doc = Document(file_path)
    full_text = ""
    
    # 将所有段落合并为一个文本
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 找到前3个题目
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)[:3]
    
    print("=== 分析前3个题目 ===\n")
    
    for i, q_text in enumerate(questions_text):
        print(f"\n--- 题目 {i+1} ---")
        print(f"原始文本长度: {len(q_text)} 字符")
        print(f"原始文本前500字符:\n{q_text[:500]}")
        print("\n" + "-"*50)
        
        # 检查是否有【解析】标记
        if '【解析】' in q_text:
            parts = q_text.split('【解析】')
            print(f"题目部分长度: {len(parts[0])} 字符")
            print(f"解析部分长度: {len(parts[1])} 字符")
            
            # 查找选项
            options_pattern = r'([A-D]\..*?)(?=[A-D]\.|【解析】|$)'
            options_matches = re.findall(options_pattern, parts[0], re.DOTALL)
            
            print(f"\n找到 {len(options_matches)} 个选项:")
            for j, opt in enumerate(options_matches):
                print(f"选项 {j+1}: {opt[:100]}...")
                
            # 检查parse_questions_web.py的选项正则是否会匹配到解析内容
            # 使用原始的正则表达式
            web_options_pattern = r'([A-D]\..+?)(?=[A-D]\.|【解析】|$)'
            web_options_matches = re.findall(web_options_pattern, q_text, re.DOTALL)
            
            print(f"\nparse_questions_web.py的正则会匹配到 {len(web_options_matches)} 个选项")
            if len(web_options_matches) > 4:
                print("⚠️ 警告：匹配到超过4个选项！可能包含了解析内容")
                for j, opt in enumerate(web_options_matches):
                    print(f"\n匹配项 {j+1} (前200字符):")
                    print(opt[:200])
                    if '【解析】' in opt or '答案' in opt or '正确答案' in opt:
                        print(">>> 这个匹配项包含了解析内容！")
                        
        else:
            print("⚠️ 没有找到【解析】标记")

if __name__ == "__main__":
    file_path = "/Users/acheng/Downloads/law-exam-assistant/uploads/刑法_1749471200053.docx"
    analyze_document(file_path)