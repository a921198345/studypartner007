#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import re
from docx import Document

def extract_all_questions(doc_path, is_answer_doc=False):
    """提取文档中的所有题目"""
    doc = Document(doc_path)
    questions = []
    current_question = None
    question_count = 0
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
            
        # 检查是否是题号开始
        if is_answer_doc:
            # 答案文档格式: "1. 正确答案：A"
            match = re.match(r'^(\d+)\.\s*正确答案[：:]\s*([A-D])', text)
            if match:
                question_num = int(match.group(1))
                correct_answer = match.group(2)
                
                if current_question:
                    questions.append(current_question)
                
                current_question = {
                    'number': question_num,
                    'correct_answer': correct_answer,
                    'explanation': text,
                    'full_explanation': []
                }
                question_count = question_num
            elif current_question:
                # 继续收集解析内容
                if '【答案解析】' in text:
                    current_question['explanation_start'] = True
                current_question['full_explanation'].append(text)
        else:
            # 题目文档格式: "1.题目内容"
            match = re.match(r'^(\d+)\.\s*(.+)', text)
            if match:
                question_num = int(match.group(1))
                question_content = match.group(2)
                
                if current_question:
                    questions.append(current_question)
                
                current_question = {
                    'number': question_num,
                    'content': question_content,
                    'options': [],
                    'full_content': [text]
                }
                question_count = question_num
            elif re.match(r'^[A-D][．、\.]', text) and current_question:
                # 选项
                current_question['options'].append(text)
            elif current_question and not re.match(r'^\d+[．、\.]', text):
                # 继续题干或其他内容
                current_question['full_content'].append(text)
                if not text.startswith(('A.', 'B.', 'C.', 'D.')):
                    current_question['content'] += ' ' + text
    
    # 添加最后一个题目
    if current_question:
        questions.append(current_question)
    
    return questions, question_count

def analyze_2023_format():
    """分析2023年格式作为对比"""
    # 检查是否有2023年文档
    files_2023 = [
        "/Users/acheng/Downloads/law-exam-assistant/2023年卷一完整版.docx",
        # 如果有其他2023年文件可以在这里添加
    ]
    
    format_2023 = {}
    
    for file_path in files_2023:
        if os.path.exists(file_path):
            try:
                questions_2023, count_2023 = extract_all_questions(file_path)
                format_2023[os.path.basename(file_path)] = {
                    'total_questions': count_2023,
                    'sample_questions': questions_2023[:3] if questions_2023 else []
                }
            except Exception as e:
                print(f"读取2023年文件 {file_path} 时出错: {e}")
    
    return format_2023

def main():
    print("=" * 80)
    print("2024年 vs 2023年法考格式对比分析")
    print("=" * 80)
    
    # 2024年文档路径
    question_doc_2024 = "/Users/acheng/Downloads/law-exam-assistant/2024年真题试卷一.docx"
    answer_doc_2024 = "/Users/acheng/Downloads/law-exam-assistant/2024年答案解析试卷一.docx"
    
    # 分析2024年题目文档
    print(f"\n📋 分析2024年题目文档...")
    if os.path.exists(question_doc_2024):
        questions_2024, total_questions_2024 = extract_all_questions(question_doc_2024, is_answer_doc=False)
        print(f"✅ 2024年题目总数: {total_questions_2024}")
        print(f"✅ 成功解析题目数: {len(questions_2024)}")
        
        # 显示题目编号范围
        if questions_2024:
            question_numbers = [q['number'] for q in questions_2024]
            print(f"✅ 题目编号范围: {min(question_numbers)} - {max(question_numbers)}")
            
            # 检查是否有缺失的题号
            expected_numbers = set(range(1, max(question_numbers) + 1))
            actual_numbers = set(question_numbers)
            missing_numbers = expected_numbers - actual_numbers
            if missing_numbers:
                print(f"⚠️  缺失的题号: {sorted(missing_numbers)}")
    else:
        print(f"❌ 题目文档不存在: {question_doc_2024}")
        return
    
    # 分析2024年答案文档
    print(f"\n📋 分析2024年答案文档...")
    if os.path.exists(answer_doc_2024):
        answers_2024, total_answers_2024 = extract_all_questions(answer_doc_2024, is_answer_doc=True)
        print(f"✅ 2024年答案总数: {total_answers_2024}")
        print(f"✅ 成功解析答案数: {len(answers_2024)}")
        
        # 显示答案编号范围
        if answers_2024:
            answer_numbers = [a['number'] for a in answers_2024]
            print(f"✅ 答案编号范围: {min(answer_numbers)} - {max(answer_numbers)}")
    else:
        print(f"❌ 答案文档不存在: {answer_doc_2024}")
        return
    
    # 分析2023年格式进行对比
    print(f"\n📋 分析2023年格式...")
    format_2023 = analyze_2023_format()
    
    # 详细格式分析
    print(f"\n" + "=" * 60)
    print("2024年详细格式分析")
    print("=" * 60)
    
    print(f"\n🔍 题目文档格式特征:")
    print(f"- 文档标题样式: 通过段落分析识别")
    print(f"- 题号格式: 数字+点号 (如: 1., 2., 3.)")
    print(f"- 选项格式: 字母+点号 (如: A., B., C., D.)")
    print(f"- 总题数: {total_questions_2024}")
    
    if questions_2024:
        # 统计选项数量分布
        option_counts = {}
        for q in questions_2024:
            opt_count = len(q['options'])
            option_counts[opt_count] = option_counts.get(opt_count, 0) + 1
        
        print(f"- 选项数量分布: {option_counts}")
        
        # 显示前3个完整题目示例
        print(f"\n📝 前3个题目示例:")
        for i, q in enumerate(questions_2024[:3]):
            print(f"\n题目 {q['number']}:")
            print(f"题干: {q['content'][:100]}{'...' if len(q['content']) > 100 else ''}")
            print(f"选项数: {len(q['options'])}")
            for opt in q['options'][:2]:  # 只显示前2个选项
                print(f"  {opt[:50]}{'...' if len(opt) > 50 else ''}")
    
    print(f"\n🔍 答案文档格式特征:")
    print(f"- 答案格式: 题号+正确答案+解析")
    print(f"- 题号格式: 数字+点号+空格+正确答案+冒号+答案选项")
    print(f"- 解析标识: 【答案解析】")
    print(f"- 总答案数: {total_answers_2024}")
    
    if answers_2024:
        # 显示前3个答案示例
        print(f"\n📝 前3个答案示例:")
        for i, a in enumerate(answers_2024[:3]):
            print(f"\n题目 {a['number']} 答案:")
            print(f"正确答案: {a['correct_answer']}")
            explanation_text = ' '.join(a['full_explanation'][:2])  # 只显示前两段解析
            print(f"解析: {explanation_text[:150]}{'...' if len(explanation_text) > 150 else ''}")
    
    # 格式对比分析
    print(f"\n" + "=" * 60)
    print("与2023年格式对比")
    print("=" * 60)
    
    if format_2023:
        for filename, data in format_2023.items():
            print(f"\n📊 {filename}:")
            print(f"- 题目总数: {data['total_questions']}")
    else:
        print(f"⚠️  未找到2023年文档进行对比")
    
    print(f"\n🔄 格式一致性检查:")
    # 检查题目和答案数量是否匹配
    if total_questions_2024 == total_answers_2024:
        print(f"✅ 题目数量与答案数量匹配: {total_questions_2024}")
    else:
        print(f"⚠️  题目数量({total_questions_2024})与答案数量({total_answers_2024})不匹配")
    
    # 检查答案选项是否都在A-D范围内
    if answers_2024:
        invalid_answers = [a for a in answers_2024 if a['correct_answer'] not in ['A', 'B', 'C', 'D']]
        if invalid_answers:
            print(f"⚠️  发现异常答案格式: {[a['number'] for a in invalid_answers]}")
        else:
            print(f"✅ 所有答案都在A-D范围内")
    
    print(f"\n📋 合并脚本建议:")
    print(f"- 题目解析模式: 数字+点号开头识别题目")
    print(f"- 选项解析模式: A-D字母+点号识别选项")
    print(f"- 答案解析模式: '正确答案：' 关键词识别答案")
    print(f"- 建议保持现有2023年脚本的主要逻辑，调整识别模式")
    print(f"- 需要注意题目内容可能跨多个段落的情况")

if __name__ == "__main__":
    main()