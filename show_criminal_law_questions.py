#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
显示2024年法考刑法题目的详细信息
"""

import json

def main():
    # 读取分类结果
    with open('2024_exam_classification_by_analysis.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("2024年法考客观题刑法题目分析")
    print("=" * 80)
    print(f"刑法题目总数：{data['classification_stats']['刑法']}道")
    print(f"占比：{data['classification_stats']['刑法'] / data['total_questions'] * 100:.1f}%")
    print("=" * 80)
    
    # 获取刑法题目
    criminal_questions = data['detailed_classification']['刑法']
    
    print("\n刑法题目列表：")
    print("-" * 80)
    
    for i, q in enumerate(criminal_questions, 1):
        print(f"\n{i}. 第{q['id']}题")
        print(f"   预览：{q['preview']}")
    
    # 题号分布
    question_ids = [q['id'] for q in criminal_questions]
    print(f"\n题号分布：{question_ids}")
    
    # 题号区间分析
    print(f"\n题号区间分析：")
    print(f"最小题号：{min(question_ids)}")
    print(f"最大题号：{max(question_ids)}")
    print(f"题号跨度：{max(question_ids) - min(question_ids) + 1}")

if __name__ == '__main__':
    main()