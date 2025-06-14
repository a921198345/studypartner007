#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
深入调试：分析选项匹配问题
"""

import re
from docx import Document
import json

def test_regex_patterns():
    """测试不同的正则表达式模式"""
    
    # 测试文本 - 一个包含选项和解析的完整题目
    test_text = """【20190132】
关于刑法解释，下列说法正确的是?
A.将虐待罪的对象解释为包括保姆在内
B.根据体系解释
C.将副乡长冒充市长
D.根据论理解释
【解析】
A错误。这是解析内容，包含A、B、C、D等字母。
B错误。这里也有解析。
故选C。"""

    print("测试文本：")
    print(test_text)
    print("\n" + "="*60 + "\n")
    
    # 测试原始的parse_questions.py的正则
    pattern1 = r'([A-D]\..*?)(?=[A-D]\.|【解析】|$)'
    matches1 = re.findall(pattern1, test_text, re.DOTALL)
    print(f"原始parse_questions.py正则 (pattern1): {pattern1}")
    print(f"匹配结果数量: {len(matches1)}")
    for i, match in enumerate(matches1):
        print(f"匹配 {i+1}: {repr(match[:50])}")
    
    print("\n" + "-"*60 + "\n")
    
    # 测试parse_questions_web.py的正则
    pattern2 = r'([A-D]\..+?)(?=[A-D]\.|【解析】|$)'
    matches2 = re.findall(pattern2, test_text, re.DOTALL)
    print(f"parse_questions_web.py正则 (pattern2): {pattern2}")
    print(f"匹配结果数量: {len(matches2)}")
    for i, match in enumerate(matches2):
        print(f"匹配 {i+1}: {repr(match[:50])}")
    
    print("\n" + "-"*60 + "\n")
    
    # 关键问题：如果文本没有正确分割，会发生什么？
    # 让我们测试先分割再匹配的方法
    if '【解析】' in test_text:
        parts = test_text.split('【解析】')
        question_part = parts[0]
        analysis_part = parts[1]
        
        print("分割后只在题目部分匹配：")
        matches3 = re.findall(pattern2, question_part, re.DOTALL)
        print(f"题目部分匹配结果数量: {len(matches3)}")
        for i, match in enumerate(matches3):
            print(f"匹配 {i+1}: {repr(match[:50])}")

def analyze_real_file():
    """分析实际文件中的问题"""
    file_path = "/Users/acheng/Downloads/law-exam-assistant/uploads/刑法_1749471200053.docx"
    
    doc = Document(file_path)
    full_text = ""
    
    # 将所有段落合并为一个文本
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 找到一个有问题的题目
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    # 找一个包含很多解析内容的题目
    for q_text in questions_text[:10]:
        if len(q_text) > 2000:  # 长题目更可能有问题
            print("\n找到一个长题目进行分析：")
            print(f"题目长度: {len(q_text)} 字符")
            
            # 使用parse_questions_web.py的方法
            if '【解析】' in q_text:
                parts = q_text.split('【解析】')
                question_part = parts[0]
                
                # 检查选项匹配
                options_pattern = r'([A-D]\..+?)(?=[A-D]\.|【解析】|$)'
                options_matches = re.findall(options_pattern, question_part, re.DOTALL)
                
                print(f"\n在题目部分找到 {len(options_matches)} 个选项")
                
                # 但是，如果在整个文本上匹配会怎样？
                all_matches = re.findall(options_pattern, q_text, re.DOTALL)
                print(f"在整个文本上找到 {len(all_matches)} 个匹配")
                
                if len(all_matches) > len(options_matches):
                    print("\n⚠️ 问题：在整个文本上匹配到了更多内容！")
                    for i in range(len(options_matches), len(all_matches)):
                        print(f"\n额外匹配 {i+1} (前100字符):")
                        print(repr(all_matches[i][:100]))
            
            break

if __name__ == "__main__":
    print("=== 测试正则表达式模式 ===")
    test_regex_patterns()
    
    print("\n\n=== 分析实际文件 ===")
    analyze_real_file()