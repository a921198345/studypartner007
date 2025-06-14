#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试终极版解析器的效果
"""

import sys
import os
import json

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from parse_questions_ultimate import parse_questions_file

def test_parser():
    print("=" * 60)
    print("测试终极版解析器")
    print("=" * 60)
    
    # 测试文件路径
    test_file = "2013-2022客观题分科真题：刑法.docx"
    
    if not os.path.exists(test_file):
        print(f"错误: 测试文件 {test_file} 不存在")
        return
    
    print(f"\n正在解析: {test_file}")
    print("-" * 60)
    
    # 解析文件
    result = parse_questions_file(test_file, "刑法", output_format='dict')
    
    # 显示结果
    print(f"\n解析结果:")
    print(f"- 成功: {result['success']}")
    print(f"- 总题目数: {result['total_questions']}")
    print(f"- 成功解析: {result['parsed_questions']}")
    print(f"- 格式问题: {len(result['format_issues'])}")
    
    # 计算成功率
    if result['total_questions'] > 0:
        success_rate = (result['parsed_questions'] / result['total_questions']) * 100
        print(f"- 成功率: {success_rate:.1f}%")
    
    # 显示格式问题详情
    if result['format_issues']:
        print(f"\n格式问题详情 (前10个):")
        for i, (q_id, issues) in enumerate(list(result['format_issues'].items())[:10]):
            print(f"\n{i+1}. 题目 {q_id}:")
            print(f"   问题: {issues['issues']}")
            print(f"   内容预览: {issues['text'][:100]}...")
    
    # 统计各年份的解析情况
    year_stats = {}
    for q in result['questions']:
        year = q.get('year', '未知')
        if year not in year_stats:
            year_stats[year] = 0
        year_stats[year] += 1
    
    print(f"\n各年份解析统计:")
    for year in sorted(year_stats.keys()):
        print(f"- {year}年: {year_stats[year]} 道题目")
    
    # 随机显示一个成功解析的题目
    if result['questions']:
        print(f"\n成功解析的题目示例:")
        sample = result['questions'][0]
        print(f"- 题号: {sample['question_id']}")
        print(f"- 题干: {sample['question_text'][:50]}...")
        print(f"- 选项数: {len(sample['options'])}")
        print(f"- 答案: {sample['correct_answer']}")
        print(f"- 题型: {sample['question_type']}")

if __name__ == "__main__":
    test_parser()