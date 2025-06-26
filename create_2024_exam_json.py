#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建2024年法考客观题JSON文件
从已有的答案解析文档中提取题目信息
"""

import re
import json
from docx import Document

def extract_questions_from_answer_doc(doc_path):
    """从答案解析文档提取题目信息"""
    doc = Document(doc_path)
    questions = []
    current_num = None
    current_answer = None
    current_analysis = []
    in_question = False
    
    print(f"开始解析文档：{doc_path}")
    
    for para in doc.paragraphs:
        text = para.text.strip()
        
        # 检测题目开始（如：1. 正确答案：A）
        answer_match = re.match(r'^(\d+)[．.、]\s*正确答案[：:]\s*([A-Z])', text)
        if answer_match:
            # 保存前一题
            if current_num is not None:
                # 基于解析内容构建题目
                question = create_question_from_analysis(
                    current_num, 
                    current_answer, 
                    current_analysis
                )
                questions.append(question)
            
            # 开始新题
            current_num = int(answer_match.group(1))
            current_answer = answer_match.group(2).upper()
            current_analysis = []
            in_question = True
            
        elif in_question and text:
            # 收集解析内容
            current_analysis.append(text)
    
    # 保存最后一题
    if current_num is not None:
        question = create_question_from_analysis(
            current_num, 
            current_answer, 
            current_analysis
        )
        questions.append(question)
    
    print(f"成功提取 {len(questions)} 道题")
    return questions

def create_question_from_analysis(num, answer, analysis_lines):
    """基于解析内容创建题目结构"""
    
    # 分析内容，提取题目信息
    content = ""
    options = []
    option_texts = {'A': '', 'B': '', 'C': '', 'D': ''}
    
    # 从解析中提取信息
    for line in analysis_lines:
        # 提取选项分析
        for opt in ['A', 'B', 'C', 'D']:
            if line.startswith(f'{opt}项：') or line.startswith(f'{opt} 项：'):
                option_texts[opt] = line
        
        # 提取可能的题目背景
        if any(keyword in line for keyword in ['根据', '本案中', '本题中', '关于', '某']):
            if len(line) > 50 and '项' not in line[:10] and not content:
                content = line
                if not content.endswith('？'):
                    content += " 对此，下列说法正确的是？"
    
    # 如果没有提取到题干，使用默认题干
    if not content:
        content = f"第{num}题：根据相关法律规定，结合案例分析，下列说法正确的是？"
    
    # 构建选项（基于解析内容）
    for opt in ['A', 'B', 'C', 'D']:
        option_content = f"选项{opt}（内容待补充）"
        
        # 如果有该选项的分析，尝试提取更有意义的内容
        if option_texts[opt]:
            analysis_text = option_texts[opt]
            # 从分析中提取核心观点
            if '正确' in analysis_text and opt == answer:
                option_content = f"选项{opt}（正确选项）"
            elif '错误' in analysis_text or '不' in analysis_text:
                option_content = f"选项{opt}（错误选项）"
        
        options.append({
            "label": opt,
            "content": option_content,
            "is_correct": opt == answer
        })
    
    # 构建题目对象
    question = {
        "id": num,
        "question_number": num,
        "type": "single_choice",
        "subject": "待分类",  # 后续分类脚本会处理
        "content": content,
        "options": options,
        "correct_answer": answer,
        "answer": answer,  # 兼容不同格式
        "analysis": "\n".join(analysis_lines),
        "year": 2024,
        "exam_type": "客观题",
        "difficulty": "中等",
        "source": "2024年国家统一法律职业资格考试"
    }
    
    return question

def save_questions_to_json(questions, output_path):
    """保存题目到JSON文件"""
    data = {
        "exam_info": {
            "title": "2024年国家统一法律职业资格考试_客观题试卷（一）",
            "year": 2024,
            "type": "客观题",
            "total_questions": len(questions),
            "source": "答案解析文档提取"
        },
        "questions": questions
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ 已保存到: {output_path}")

def main():
    """主函数"""
    # 文件路径
    answers_file = '/Users/acheng/Downloads/law-exam-assistant/3.2024年回忆版真题答案解析（客观卷）.docx'
    output_file = '/Users/acheng/Downloads/law-exam-assistant/2024年国家统一法律职业资格考试_客观题试卷（一）_完整版.json'
    
    print("创建2024年法考客观题JSON文件")
    print("=" * 60)
    
    # 提取题目
    questions = extract_questions_from_answer_doc(answers_file)
    
    if not questions:
        print("错误：没有提取到题目")
        return
    
    # 保存到JSON
    save_questions_to_json(questions, output_file)
    
    # 统计信息
    print(f"\n统计信息：")
    print(f"总题目数：{len(questions)}")
    
    # 答案分布
    answer_dist = {}
    for q in questions:
        ans = q['correct_answer']
        answer_dist[ans] = answer_dist.get(ans, 0) + 1
    
    print(f"\n答案分布：")
    for ans in sorted(answer_dist.keys()):
        print(f"  {ans}: {answer_dist[ans]} 题")

if __name__ == "__main__":
    main()