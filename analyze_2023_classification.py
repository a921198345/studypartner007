#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析2023年法考题目分类结果
"""

import json
from docx import Document

def analyze_classification_quality():
    """分析分类质量"""
    
    # 读取统计报告
    with open('docx_2023/分类统计报告.json', 'r', encoding='utf-8') as f:
        stats = json.load(f)
    
    print("=== 2023年法考题目分类分析报告 ===\n")
    
    # 1. 总体统计
    print("1. 总体统计:")
    print(f"   - 总题目数: {stats['total_questions']}")
    print(f"   - 分类准确度最高: {stats['summary']['most_accurate_subject']}")
    print(f"   - 最大偏差: {stats['summary']['largest_deviation']:.2%}")
    print()
    
    # 2. 各科目分析
    print("2. 各科目分析:")
    print(f"{'科目':<12} {'实际':<6} {'目标':<6} {'偏差':<8} {'分析'}")
    print("-" * 50)
    
    for subject, data in stats['classification_results'].items():
        if subject == '未分类':
            continue
            
        count = data['count']
        target = int(stats['total_questions'] * data['official_ratio'])
        difference = data['difference']
        
        # 分析状态
        if abs(difference) < 0.05:
            status = "✓ 接近目标"
        elif difference > 0.1:
            status = "⚠ 明显偏多"
        elif difference < -0.1:
            status = "⚠ 明显偏少"
        else:
            status = "△ 有偏差"
        
        print(f"{subject:<12} {count:<6} {target:<6} {difference:+.1%}    {status}")
    
    print()
    
    # 3. 问题分析
    print("3. 潜在问题分析:")
    
    # 找出偏差最大的科目
    max_over = max([(k, v['difference']) for k, v in stats['classification_results'].items() if v['difference'] > 0], 
                   key=lambda x: x[1], default=(None, 0))
    max_under = min([(k, v['difference']) for k, v in stats['classification_results'].items() if v['difference'] < 0], 
                    key=lambda x: x[1], default=(None, 0))
    
    if max_over[0]:
        print(f"   - 题目偏多: {max_over[0]} (偏多 {max_over[1]:.1%})")
    if max_under[0]:
        print(f"   - 题目偏少: {max_under[0]} (偏少 {max_under[1]:.1%})")
    
    print()
    
    # 4. 查看具体题目示例
    print("4. 各科目题目示例 (前3题):")
    subjects_to_check = ['民法', '商经知', '刑法', '理论法']
    
    for subject in subjects_to_check:
        try:
            doc = Document(f'docx_2023/{subject}.docx')
            print(f"\n【{subject}】:")
            
            count = 0
            for para in doc.paragraphs:
                if para.text.strip() and count < 3:
                    if para.text.strip().startswith(('1.', '2.', '3.')):
                        print(f"   {para.text[:100]}...")
                        count += 1
                        
        except Exception as e:
            print(f"   无法读取 {subject}: {e}")
    
    print()
    
    # 5. 改进建议
    print("5. 改进建议:")
    print("   - 刑法、刑事诉讼法、行政法、三国法题目数量明显不足，可能存在关键词匹配不准确的问题")
    print("   - 民法和商经知题目数量偏多，可能存在过度分类的问题")
    print("   - 建议人工抽查部分题目，优化关键词匹配规则")
    print("   - 考虑增加更多特征词汇和分类规则")


if __name__ == "__main__":
    analyze_classification_quality()