#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
分析解析失败的题目，找出格式问题
"""

import re
from docx import Document
import json
from collections import defaultdict

def analyze_document(file_path):
    """分析文档中的题目格式"""
    doc = Document(file_path)
    
    # 将所有段落合并为一个文本
    full_text = ""
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    print(f"总共找到 {len(questions_text)} 个题目")
    
    # 分析每个题目
    year_stats = defaultdict(int)
    format_issues = defaultdict(list)
    sample_questions = {}
    
    for q_text in questions_text:
        # 提取题号
        question_id_match = re.search(r'【(\d+)】', q_text)
        if question_id_match:
            question_id = question_id_match.group(1)
            year = question_id[:4] if len(question_id) >= 4 else "未知"
            year_stats[year] += 1
            
            # 检查各种格式问题
            issues = []
            
            # 1. 检查选项格式
            # 标准格式：A.选项内容
            standard_options = re.findall(r'[A-D]\.', q_text)
            # 其他格式
            space_options = re.findall(r'[A-D]\s+\.', q_text)  # A .选项
            colon_options = re.findall(r'[A-D]:', q_text)  # A:选项
            chinese_dot = re.findall(r'[A-D]、', q_text)  # A、选项
            no_punct = re.findall(r'(?:^|\n)([A-D])\s+[^A-Z\.]', q_text, re.MULTILINE)  # A 选项
            
            if space_options:
                issues.append(f"选项格式有空格：{len(space_options)}个")
            if colon_options:
                issues.append(f"选项使用冒号：{len(colon_options)}个")
            if chinese_dot:
                issues.append(f"选项使用中文顿号：{len(chinese_dot)}个")
            if no_punct:
                issues.append(f"选项无标点：{len(no_punct)}个")
            
            # 2. 检查解析标记
            if '【解析】' not in q_text:
                if '解析：' in q_text:
                    issues.append("使用'解析：'而非'【解析】'")
                elif '解析:' in q_text:
                    issues.append("使用'解析:'而非'【解析】'")
                elif '答案解析' in q_text:
                    issues.append("使用'答案解析'标记")
                else:
                    issues.append("缺少解析标记")
            
            # 3. 检查答案格式
            answer_found = False
            if re.search(r'答案[：:]\s*[A-D]', q_text):
                answer_found = True
            elif re.search(r'故选[A-D]', q_text):
                answer_found = True
            elif re.search(r'本题选[A-D]', q_text):
                answer_found = True
            elif re.search(r'正确答案是[A-D]', q_text):
                answer_found = True
            
            if not answer_found:
                # 检查是否在末尾有单独的字母
                if not re.search(r'[。，]\s*[A-D]\s*[。]?\s*$', q_text):
                    issues.append("未找到明确的答案标识")
            
            # 记录有问题的题目
            if issues:
                format_issues[year].append({
                    'id': question_id,
                    'issues': issues
                })
                
                # 保存一些样本
                if year not in sample_questions and (year == '2013' or year == '2016'):
                    sample_questions[year] = {
                        'id': question_id,
                        'text': q_text[:500] + '...' if len(q_text) > 500 else q_text,
                        'issues': issues
                    }
    
    return year_stats, format_issues, sample_questions

def main():
    file_path = "2013-2022客观题分科真题：刑法.docx"
    
    print("开始分析文档...")
    year_stats, format_issues, sample_questions = analyze_document(file_path)
    
    print("\n=== 年份统计 ===")
    for year in sorted(year_stats.keys()):
        total = year_stats[year]
        issues = len(format_issues.get(year, []))
        print(f"{year}年: 总题目{total}个, 问题题目{issues}个")
    
    print("\n=== 格式问题统计 ===")
    all_issues = defaultdict(int)
    for year, questions in format_issues.items():
        for q in questions:
            for issue in q['issues']:
                all_issues[issue] += 1
    
    for issue, count in sorted(all_issues.items(), key=lambda x: x[1], reverse=True):
        print(f"{issue}: {count}个")
    
    print("\n=== 2013年和2016年的样本题目 ===")
    for year in ['2013', '2016']:
        if year in sample_questions:
            sample = sample_questions[year]
            print(f"\n{year}年题目样本 (题号: {sample['id']}):")
            print(f"格式问题: {', '.join(sample['issues'])}")
            print(f"题目文本:\n{sample['text']}")
            print("-" * 80)

if __name__ == "__main__":
    main()