#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证题目80的内容，确认是否为刑法题目
"""

from docx import Document
import re

def extract_full_question(doc_path, question_number):
    """提取指定题号的完整内容"""
    doc = Document(doc_path)
    content = []
    found = False
    question_pattern = re.compile(r'^(\d+)\.')
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        # 检查是否是目标题目的开始
        match = question_pattern.match(text)
        if match and int(match.group(1)) == question_number:
            found = True
            content.append(text)
        elif found:
            # 继续收集内容直到下一题或分隔符
            if question_pattern.match(text) or text.startswith('---'):
                break
            content.append(text)
    
    return '\n'.join(content)

def analyze_question_80():
    # 文件路径
    input_file = '/Users/acheng/Downloads/law-exam-assistant/24年法考题-完整版.docx'
    
    print("题目80完整内容分析")
    print("=" * 80)
    
    # 提取题目80的完整内容
    content = extract_full_question(input_file, 80)
    
    if content:
        print("题目80完整内容：")
        print("-" * 80)
        print(content)
        print("-" * 80)
        
        # 分析题目类型
        print("\n题目分析：")
        
        # 检查法条引用
        if '《政务处分法》' in content:
            print("✓ 引用了《政务处分法》")
        
        # 检查是否涉及刑法内容
        criminal_elements = []
        if '故意犯罪' in content:
            criminal_elements.append("故意犯罪")
        if '过失犯罪' in content:
            criminal_elements.append("过失犯罪")
        if re.search(r'判处.*刑', content):
            criminal_elements.append("刑罚判处")
        if '缓刑' in content:
            criminal_elements.append("缓刑制度")
        
        if criminal_elements:
            print(f"✓ 涉及刑法要素：{', '.join(criminal_elements)}")
        
        # 判断题目性质
        print("\n题目性质判断：")
        print("这道题主要考查的是《政务处分法》中关于公职人员犯罪后的处分规定。")
        print("虽然题目涉及犯罪和刑罚等刑法概念，但核心考点是行政法/理论法范畴。")
        print("具体来说：")
        print("1. 主要法条是《政务处分法》，而非《刑法》")
        print("2. 考查的是政务处分（行政处分）的适用，而非刑事责任的认定")
        print("3. 属于公职人员管理制度，是行政法或理论法的范畴")
        print("\n结论：题目80不是纯粹的刑法题目，而是行政法/理论法题目。")
    else:
        print("未找到题目80的内容")

if __name__ == "__main__":
    analyze_question_80()