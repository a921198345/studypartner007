#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
深入分析特定年份的题目，找出解析失败的根本原因
"""

import re
from docx import Document
import json

def extract_questions_by_year(file_path, target_years=['2013', '2016']):
    """提取特定年份的题目进行分析"""
    doc = Document(file_path)
    
    # 将所有段落合并为一个文本
    full_text = ""
    for para in doc.paragraphs:
        full_text += para.text + "\n"
    
    # 按题号分割文本
    question_pattern = r'【\d+】.*?(?=【\d+】|$)'
    questions_text = re.findall(question_pattern, full_text, re.DOTALL)
    
    # 收集特定年份的题目
    year_questions = {}
    
    for q_text in questions_text:
        # 提取题号
        question_id_match = re.search(r'【(\d+)】', q_text)
        if question_id_match:
            question_id = question_id_match.group(1)
            year = question_id[:4] if len(question_id) >= 4 else "未知"
            
            if year in target_years:
                if year not in year_questions:
                    year_questions[year] = []
                
                # 分析题目结构
                analysis = analyze_question_structure(q_text, question_id)
                year_questions[year].append(analysis)
    
    return year_questions

def analyze_question_structure(q_text, question_id):
    """深入分析单个题目的结构"""
    analysis = {
        'id': question_id,
        'length': len(q_text),
        'has_standard_id': bool(re.search(r'【\d{8,9}】', q_text)),
        'options': {},
        'answer_patterns': [],
        'analysis_marker': None,
        'structure_issues': []
    }
    
    # 1. 检查选项格式
    # 查找各种可能的选项格式
    option_formats = {
        'standard': (r'([A-D])\.([^\n]+?)(?=[A-D]\.|【解析】|$)', 'A.选项'),
        'space_dot': (r'([A-D])\s+\.([^\n]+?)(?=[A-D]\s+\.|【解析】|$)', 'A .选项'),
        'chinese_dot': (r'([A-D])、([^\n]+?)(?=[A-D]、|【解析】|$)', 'A、选项'),
        'colon': (r'([A-D]):([^\n]+?)(?=[A-D]:|【解析】|$)', 'A:选项'),
        'no_punct': (r'(?:^|\n)([A-D])\s+([^\n]+?)(?=\n[A-D]\s+|【解析】|$)', 'A 选项')
    }
    
    for format_name, (pattern, example) in option_formats.items():
        matches = re.findall(pattern, q_text, re.MULTILINE | re.DOTALL)
        if matches:
            analysis['options'][format_name] = {
                'count': len(matches),
                'example': example,
                'options': dict(matches[:4])  # 只保存前4个
            }
    
    # 2. 检查解析标记
    analysis_markers = ['【解析】', '解析：', '解析:', '答案解析', '答案解释']
    for marker in analysis_markers:
        if marker in q_text:
            analysis['analysis_marker'] = marker
            break
    
    # 3. 查找答案位置
    # 提取解析部分（如果有）
    if analysis['analysis_marker']:
        parts = q_text.split(analysis['analysis_marker'])
        if len(parts) == 2:
            analysis_text = parts[1]
            
            # 查找答案模式
            answer_patterns = [
                (r'答案[：:]\s*([A-D]+)', '答案：X'),
                (r'故选\s*([A-D]+)', '故选X'),
                (r'本题选\s*([A-D]+)', '本题选X'),
                (r'因此选\s*([A-D]+)', '因此选X'),
                (r'应选\s*([A-D]+)', '应选X'),
                (r'正确答案是\s*([A-D]+)', '正确答案是X'),
                (r'([A-D])\s*项?正确', 'X正确'),
                (r'选项\s*([A-D])\s*正确', '选项X正确'),
                # 检查末尾单独的字母
                (r'。\s*([A-D])\s*。?\s*$', '。X'),
                (r'^\s*([A-D])\s*$', '单独行X'),
            ]
            
            for pattern, example in answer_patterns:
                match = re.search(pattern, analysis_text, re.MULTILINE)
                if match:
                    analysis['answer_patterns'].append({
                        'pattern': example,
                        'answer': match.group(1),
                        'position': match.start()
                    })
    
    # 4. 识别结构问题
    if not analysis['options']:
        analysis['structure_issues'].append('未找到任何选项')
    elif len(analysis['options']) > 1:
        analysis['structure_issues'].append('选项格式混乱（多种格式）')
    
    if not analysis['analysis_marker']:
        analysis['structure_issues'].append('缺少解析标记')
    
    if not analysis['answer_patterns']:
        analysis['structure_issues'].append('未找到答案标识')
    
    # 5. 添加题目片段
    analysis['sample'] = q_text[:300] + '...' if len(q_text) > 300 else q_text
    
    return analysis

def main():
    file_path = "2013-2022客观题分科真题：刑法.docx"
    
    print("开始深入分析2013年和2016年的题目...")
    year_questions = extract_questions_by_year(file_path, ['2013', '2016'])
    
    # 统计分析
    for year, questions in year_questions.items():
        print(f"\n=== {year}年题目分析 ===")
        print(f"总题目数: {len(questions)}")
        
        # 统计各种问题
        option_format_stats = {}
        answer_pattern_stats = {}
        structure_issue_stats = {}
        
        for q in questions:
            # 统计选项格式
            for format_name in q['options']:
                if format_name not in option_format_stats:
                    option_format_stats[format_name] = 0
                option_format_stats[format_name] += 1
            
            # 统计答案模式
            for ap in q['answer_patterns']:
                pattern = ap['pattern']
                if pattern not in answer_pattern_stats:
                    answer_pattern_stats[pattern] = 0
                answer_pattern_stats[pattern] += 1
            
            # 统计结构问题
            for issue in q['structure_issues']:
                if issue not in structure_issue_stats:
                    structure_issue_stats[issue] = 0
                structure_issue_stats[issue] += 1
        
        print("\n选项格式分布:")
        for format_name, count in option_format_stats.items():
            print(f"  {format_name}: {count}个题目")
        
        print("\n答案标识分布:")
        for pattern, count in answer_pattern_stats.items():
            print(f"  {pattern}: {count}次")
        
        print("\n结构问题统计:")
        for issue, count in structure_issue_stats.items():
            print(f"  {issue}: {count}个题目")
        
        # 显示一些特殊案例
        print(f"\n{year}年特殊案例:")
        # 找出没有标准格式选项的题目
        no_standard = [q for q in questions if 'standard' not in q['options']]
        if no_standard:
            print(f"\n没有标准格式选项的题目 ({len(no_standard)}个):")
            for q in no_standard[:3]:
                print(f"\n题号: {q['id']}")
                print(f"找到的选项格式: {list(q['options'].keys())}")
                if q['options']:
                    format_name = list(q['options'].keys())[0]
                    print(f"选项示例 ({format_name}):")
                    for opt, content in list(q['options'][format_name]['options'].items())[:2]:
                        print(f"  {opt}: {content[:50]}...")

if __name__ == "__main__":
    main()