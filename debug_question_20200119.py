#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
调试题目20200119的解析问题
"""

import re
from docx import Document

def debug_question_20200119():
    """深入调试题目20200119"""
    doc = Document("2013-2022客观题分科真题：刑法.docx")
    
    # 将所有段落合并为一个文本
    full_text = ""
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    for q_text in questions_text:
        if '【20200119】' in q_text:
            print("原始题目文本:")
            print("="*80)
            print(repr(q_text))
            print("="*80)
            
            # 分析题目结构
            print("\n题目结构分析:")
            
            # 1. 题干部分
            question_text_match = re.search(r'】(.*?)(?=[A-D]\s*[\.．、：:])', q_text, re.DOTALL)
            if question_text_match:
                question_text = question_text_match.group(1).strip()
                print(f"题干: {repr(question_text[:100])}")
            else:
                print("未找到题干")
            
            # 2. 选项部分
            print("\n选项分析:")
            # 尝试各种选项格式
            option_patterns = [
                (r'([A-D])\.([^\n]+?)(?=[A-D]\.|【解析】|$)', 'A.选项'),
                (r'([A-D])\s+([^\n]+?)(?=\n[A-D]\s+|【解析】|$)', 'A 选项'),
                (r'([A-D])、([^\n]+?)(?=[A-D]、|【解析】|$)', 'A、选项'),
            ]
            
            for pattern, desc in option_patterns:
                matches = re.findall(pattern, q_text, re.MULTILINE | re.DOTALL)
                if matches:
                    print(f"\n{desc} 格式找到 {len(matches)} 个选项:")
                    for opt, content in matches:
                        print(f"  {opt}: {repr(content[:30])}")
            
            # 3. 查看选项区域的原始文本
            print("\n选项区域原始文本:")
            # 找到从第一个选项到【解析】之间的文本
            opt_area_match = re.search(r'([A-D]\..+?)【解析】', q_text, re.DOTALL)
            if opt_area_match:
                opt_area = opt_area_match.group(1)
                lines = opt_area.split('\n')
                for i, line in enumerate(lines):
                    print(f"Line {i}: {repr(line)}")
            
            return

if __name__ == "__main__":
    debug_question_20200119()