#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
提取特定题目查看完整内容
"""

import re
from docx import Document

def extract_specific_questions(file_path, question_ids):
    """提取特定题号的完整题目"""
    doc = Document(file_path)
    
    # 将所有段落合并为一个文本
    full_text = ""
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    results = {}
    
    for q_text in questions_text:
        # 提取题号
        question_id_match = re.search(r'【(\d+)】', q_text)
        if question_id_match:
            question_id = question_id_match.group(1)
            if question_id in question_ids:
                results[question_id] = q_text
    
    return results

def main():
    file_path = "2013-2022客观题分科真题：刑法.docx"
    
    # 查看一些2016年和2013年的题目
    question_ids = ['20160251', '20160201', '20130202', '20130203']
    
    questions = extract_specific_questions(file_path, question_ids)
    
    for qid, text in questions.items():
        print(f"\n{'='*80}")
        print(f"题号: {qid}")
        print(f"{'='*80}")
        print(text)
        print(f"\n题目长度: {len(text)} 字符")
        
        # 查找可能的答案位置
        print("\n可能的答案标识:")
        # 在整个文本中查找
        possible_answers = []
        
        # 查找各种答案模式
        patterns = [
            r'[A-D]\s*项?[是为]?正确',
            r'[A-D]\s*项?[是为]?错误',
            r'正确的?[是为]\s*[A-D]',
            r'错误的?[是为]\s*[A-D]',
            r'故.*?[A-D]\s*[项]?正确',
            r'故.*?[A-D]\s*[项]?错误',
            r'因此.*?[A-D]\s*[项]?正确',
            r'[A-D]\s*[、，。]?\s*[A-D]?\s*[、，。]?\s*[A-D]?\s*[、，。]?\s*[A-D]?\s*(?:项)?(?:正确|错误)',
            r'(?:正确|错误)的?(?:选项)?[是为：:]\s*[A-D]+',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                possible_answers.extend(matches)
        
        if possible_answers:
            print("找到的答案标识:")
            for ans in possible_answers:
                print(f"  - {ans}")
        else:
            print("未找到明显的答案标识")
            
        # 查找解析部分最后几行
        if '【解析】' in text:
            parts = text.split('【解析】')
            if len(parts) == 2:
                analysis = parts[1].strip()
                lines = analysis.split('\n')
                print("\n解析部分最后5行:")
                for line in lines[-5:]:
                    line = line.strip()
                    if line:
                        print(f"  {repr(line)}")

if __name__ == "__main__":
    main()