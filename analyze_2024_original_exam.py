#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
分析2024年法考客观题真题docx文档
提取完整题目内容：题干、ABCD选项、正确答案
"""

import docx
import re
import json
from pathlib import Path

def extract_questions_from_docx(file_path):
    """
    从docx文件中提取完整的题目信息
    """
    try:
        doc = docx.Document(file_path)
        questions = []
        current_question = {}
        question_number = None
        
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue
                
            # 匹配题目编号（如：1. 2. 100.）
            question_match = re.match(r'^(\d+)\.\s*(.+)', text)
            if question_match:
                # 保存上一道题
                if current_question and 'question_text' in current_question:
                    questions.append(current_question)
                
                # 开始新题目
                question_number = int(question_match.group(1))
                current_question = {
                    'question_number': question_number,
                    'question_text': question_match.group(2),
                    'options': {},
                    'correct_answer': None
                }
                continue
            
            # 匹配选项（A. B. C. D.）
            option_match = re.match(r'^([ABCD])\.\s*(.+)', text)
            if option_match and current_question:
                option_letter = option_match.group(1)
                option_text = option_match.group(2)
                current_question['options'][option_letter] = option_text
                continue
            
            # 匹配答案（答案：A 或 正确答案：A）
            answer_match = re.search(r'(?:答案|正确答案)[:：]\s*([ABCD])', text)
            if answer_match and current_question:
                current_question['correct_answer'] = answer_match.group(1)
                continue
            
            # 如果是题目的延续部分
            if current_question and 'question_text' in current_question and not option_match and not answer_match:
                # 可能是题目描述的延续
                if not any(text.startswith(letter + '.') for letter in 'ABCD'):
                    current_question['question_text'] += ' ' + text
        
        # 添加最后一道题
        if current_question and 'question_text' in current_question:
            questions.append(current_question)
        
        return questions
    
    except Exception as e:
        print(f"读取文档时出错: {e}")
        return []

def analyze_question_quality(questions):
    """
    分析题目质量，检查完整性
    """
    analysis = {
        'total': len(questions),
        'complete': 0,
        'missing_options': 0,
        'missing_answer': 0,
        'incomplete_options': 0
    }
    
    for q in questions:
        is_complete = True
        
        # 检查选项完整性
        if len(q['options']) < 4:
            analysis['missing_options'] += 1
            is_complete = False
        elif not all(letter in q['options'] for letter in 'ABCD'):
            analysis['incomplete_options'] += 1
            is_complete = False
        
        # 检查是否有正确答案
        if not q['correct_answer']:
            analysis['missing_answer'] += 1
            is_complete = False
        
        if is_complete:
            analysis['complete'] += 1
    
    return analysis

def main():
    # 2024年真题文档路径
    exam_file = "/Users/acheng/Downloads/law-exam-assistant/24年法考题-完整版.docx"
    
    if not Path(exam_file).exists():
        print(f"文件不存在: {exam_file}")
        return
    
    print("开始分析2024年法考真题文档...")
    
    # 提取题目
    questions = extract_questions_from_docx(exam_file)
    
    if not questions:
        print("未能提取到题目，请检查文档格式")
        return
    
    print(f"成功提取 {len(questions)} 道题目")
    
    # 分析题目质量
    analysis = analyze_question_quality(questions)
    
    print("\n题目质量分析:")
    print(f"总题目数: {analysis['total']}")
    print(f"完整题目数: {analysis['complete']}")
    print(f"缺少选项的题目: {analysis['missing_options']}")
    print(f"选项不完整的题目: {analysis['incomplete_options']}")
    print(f"缺少答案的题目: {analysis['missing_answer']}")
    
    # 显示前5道题作为示例
    print("\n前5道题目示例:")
    for i, q in enumerate(questions[:5]):
        print(f"\n题目 {q['question_number']}:")
        print(f"题干: {q['question_text'][:100]}...")
        print(f"选项数量: {len(q['options'])}")
        print(f"正确答案: {q['correct_answer']}")
        for letter, text in q['options'].items():
            print(f"  {letter}. {text[:50]}...")
    
    # 保存完整数据
    output_file = "/Users/acheng/Downloads/law-exam-assistant/2024_original_exam_questions.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    
    print(f"\n完整题目数据已保存到: {output_file}")

if __name__ == "__main__":
    main()