#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查被分类为刑法的题目内容
"""

from docx import Document
import re

def extract_question_content(doc_path, question_numbers):
    """提取指定题号的完整题目内容"""
    doc = Document(doc_path)
    questions = {}
    current_question = None
    current_content = []
    question_pattern = re.compile(r'^(\d+)\.')
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        
        # 检查是否是新题目的开始
        match = question_pattern.match(text)
        if match:
            # 保存前一个题目
            if current_question is not None and current_question in question_numbers:
                questions[current_question] = '\n'.join(current_content)
            
            # 开始新题目
            current_question = int(match.group(1))
            current_content = [text]
        elif current_question is not None:
            # 继续收集当前题目内容
            if text.startswith('---'):
                # 题目结束
                if current_question in question_numbers:
                    questions[current_question] = '\n'.join(current_content)
                current_question = None
                current_content = []
            else:
                current_content.append(text)
    
    # 保存最后一个题目
    if current_question is not None and current_question in question_numbers:
        questions[current_question] = '\n'.join(current_content)
    
    return questions

def analyze_criminal_features(content):
    """分析题目中的刑法特征"""
    features = []
    
    # 检查是否包含刑法关键词
    criminal_keywords = [
        '犯罪', '罪名', '定罪', '量刑', '刑罚', '刑事责任',
        '故意', '过失', '杀人', '伤害', '盗窃', '抢劫', '诈骗',
        '贪污', '受贿', '正当防卫', '共同犯罪', '自首', '立功'
    ]
    
    for keyword in criminal_keywords:
        if keyword in content:
            features.append(f"包含刑法关键词：{keyword}")
    
    # 检查是否包含刑法法条
    if '《刑法》' in content or '刑法第' in content:
        features.append("包含刑法法条引用")
    
    # 检查是否包含典型案例描述
    if re.search(r'[甲乙丙丁][某]?(?:为了|因|与|伙同|教唆)', content):
        features.append("包含典型案例描述（甲乙丙丁）")
    
    # 检查是否包含其他科目的特征
    other_subjects = {
        '民法': ['《民法典》', '合同', '物权', '婚姻', '继承', '侵权责任', '违约责任'],
        '行政法': ['行政', '行政处罚', '行政许可', '行政复议'],
        '民诉': ['民事诉讼', '管辖', '举证', '执行', '《民诉法》'],
        '商经知': ['公司', '股东', '保险', '劳动', '《食品安全法》', '破产'],
        '三国法': ['国际', '涉外', 'CISG', '海牙规则', '提单']
    }
    
    for subject, keywords in other_subjects.items():
        for keyword in keywords:
            if keyword in content:
                features.append(f"包含{subject}关键词：{keyword}")
    
    return features

def main():
    # 文件路径
    input_file = '/Users/acheng/Downloads/law-exam-assistant/24年法考题-完整版.docx'
    
    # 被分类为刑法的题号
    criminal_questions = [1, 11, 28, 73, 75, 84]
    
    print("检查被分类为刑法的题目内容")
    print("=" * 80)
    
    # 提取题目内容
    questions = extract_question_content(input_file, criminal_questions)
    
    # 分析每个题目
    for q_num in sorted(criminal_questions):
        if q_num in questions:
            content = questions[q_num]
            print(f"\n题目 {q_num}:")
            print("-" * 80)
            
            # 打印题目前300个字符
            preview = content[:300].replace('\n', ' ')
            print(f"内容预览：{preview}...")
            
            # 分析刑法特征
            features = analyze_criminal_features(content)
            print(f"\n特征分析：")
            if features:
                for feature in features:
                    print(f"  - {feature}")
            else:
                print("  - 未发现明显的刑法特征")
            
            # 判断是否可能被误分类
            if any('刑法' in f or '犯罪' in f or '定罪' in f for f in features):
                print(f"\n判断：可能是刑法题目")
            else:
                other_features = [f for f in features if '包含' in f and '刑法' not in f]
                if other_features:
                    print(f"\n判断：可能被误分类，更像是其他科目的题目")
                else:
                    print(f"\n判断：需要进一步分析")

if __name__ == "__main__":
    main()