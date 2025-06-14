#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试刑法题目解析，找出选项包含解析内容的问题
"""

import re
from docx import Document
import json

def test_parse_single_question():
    """测试单个有问题的题目"""
    
    # 创建一个模拟有问题的题目
    problematic_text = """【20190132】
关于刑法解释，下列说法正确的是?
A.将虐待罪的对象 "家庭成员 "解释为包括保姆 在内，属于类推解释
B.根据体系解释，传播淫秽物品罪与传播性病罪 中 "传播 "含义一致
C.将副乡长冒充市长招摇撞骗解释为冒充国家机 关工作人员招摇撞骗，违反文理解释
D.根据论理解释，倒卖文物罪中倒卖是指以牟利 为目的，买入或者买出国家禁止经营文物
【解析】
A 错误。【争议点】对于"长期共同生活"的管家、 保姆等是否可以构成"家庭成员"。
B 错误。两罪的 "传播 "虽然具有扩散的含义。
【20190133】
下一个题目开始了..."""

    print("测试文本:")
    print(problematic_text)
    print("\n" + "="*60 + "\n")
    
    # 首先用原始的题目分割正则
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions = re.findall(question_pattern, problematic_text, re.DOTALL)
    
    print(f"找到 {len(questions)} 个题目\n")
    
    for i, q_text in enumerate(questions):
        print(f"\n--- 题目 {i+1} ---")
        print(f"题目长度: {len(q_text)} 字符")
        
        # 检查是否有下一个题目的内容
        if re.search(r'【\d{8}】', q_text[50:]):  # 跳过开头的题号
            print("⚠️ 警告：这个题目包含了下一个题目的内容！")
        
        # 尝试解析
        if '【解析】' in q_text:
            parts = q_text.split('【解析】')
            question_part = parts[0]
            analysis_part = parts[1] if len(parts) > 1 else ""
            
            print(f"题目部分长度: {len(question_part)}")
            print(f"解析部分长度: {len(analysis_part)}")
            
            # 检查解析部分是否包含了下一题
            if '【' in analysis_part and '】' in analysis_part:
                next_question_match = re.search(r'【(\d+)】', analysis_part)
                if next_question_match:
                    print(f"⚠️ 解析部分包含了题号: {next_question_match.group(1)}")
            
            # 提取选项
            options_pattern = r'([A-D]\..+?)(?=[A-D]\.|【解析】|$)'
            options_matches = re.findall(options_pattern, question_part, re.DOTALL)
            
            print(f"\n找到 {len(options_matches)} 个选项:")
            for j, opt in enumerate(options_matches):
                print(f"选项 {j+1}: {repr(opt[:50])}")

def check_real_file():
    """检查实际文件中的问题"""
    file_path = "/Users/acheng/Downloads/law-exam-assistant/uploads/刑法_1749471200053.docx"
    
    try:
        doc = Document(file_path)
        full_text = ""
        
        # 将所有段落合并为一个文本
        for para in doc.paragraphs:
            full_text += para.text + "\n"
        
        # 统计题目
        question_ids = re.findall(r'【(\d{8})】', full_text)
        print(f"\n文档中共有 {len(question_ids)} 个题目")
        
        # 按题号分割文本
        question_pattern = r'【\d{8}】.*?(?=【\d{8}】|$)'
        questions_text = re.findall(question_pattern, full_text, re.DOTALL)
        
        print(f"正则分割后得到 {len(questions_text)} 个题目块")
        
        # 检查前5个题目
        for i in range(min(5, len(questions_text))):
            q_text = questions_text[i]
            
            # 获取题号
            q_id_match = re.search(r'【(\d{8})】', q_text)
            if q_id_match:
                q_id = q_id_match.group(1)
                
                # 检查是否包含多个题号
                all_ids_in_block = re.findall(r'【(\d{8})】', q_text)
                if len(all_ids_in_block) > 1:
                    print(f"\n⚠️ 题目 {q_id} 的文本块包含了多个题号: {all_ids_in_block}")
                    print(f"文本块长度: {len(q_text)} 字符")
        
    except Exception as e:
        print(f"读取文件出错: {e}")

if __name__ == "__main__":
    print("=== 测试单个问题题目 ===")
    test_parse_single_question()
    
    print("\n\n=== 检查实际文件 ===")
    check_real_file()