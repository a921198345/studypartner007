#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
修复版的题目解析脚本
解决选项被错误解析的问题
"""

import re
import json
import sys
import os
import argparse
from datetime import datetime
from docx import Document

def clean_text(text):
    """智能清理文本中的异常空白"""
    if not text:
        return text
    
    # 1. 替换全角空格为半角空格
    text = text.replace('　', ' ')
    
    # 2. 替换多个连续空格为单个空格
    text = re.sub(r' +', ' ', text)
    
    # 3. 清理行内的异常空白（保留正常的段落结构）
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # 去除行首尾空白
        line = line.strip()
        
        # 处理选项中的异常空白，如 "A .选项" -> "A.选项"
        line = re.sub(r'([A-D])\s+\.', r'\1.', line)
        
        # 处理标点符号前的异常空白
        line = re.sub(r'\s+([，。！？；：、）】》"''])', r'\1', line)
        
        # 处理标点符号后的异常空白（但保留句号后的正常空格）
        line = re.sub(r'([（【《"''])\s+', r'\1', line)
        
        cleaned_lines.append(line)
    
    # 4. 处理多余的空行（连续3个或以上换行符）
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text

def extract_questions_from_doc_fixed(file_path, subject):
    """改进的文档解析方法，正确处理段落格式的选项"""
    try:
        doc = Document(file_path)
    except Exception as e:
        raise Exception(f"无法打开文档: {e}")
    
    # 将所有段落转换为列表，保留段落结构
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:  # 只保留非空段落
            paragraphs.append(text)
    
    print(f"[调试] 文档包含 {len(paragraphs)} 个非空段落", file=sys.stderr)
    
    questions = []
    format_issues = {}
    i = 0
    
    while i < len(paragraphs):
        # 查找题号
        if re.match(r'【\d{8}】', paragraphs[i]):
            question_id = re.search(r'【(\d+)】', paragraphs[i]).group(1)
            year = int(question_id[:4])
            
            print(f"[调试] 找到题目 {question_id} 在段落 {i}", file=sys.stderr)
            
            # 收集这道题的所有内容
            question_data = {
                'question_id': question_id,
                'year': year,
                'subject': subject,
                'paragraphs': []
            }
            
            # 从下一段开始收集，直到遇到【解析】或下一个题号
            j = i + 1
            while j < len(paragraphs):
                if re.match(r'【\d{8}】', paragraphs[j]):
                    # 遇到下一个题号，停止
                    break
                elif paragraphs[j] == '【解析】':
                    # 找到解析标记
                    question_data['analysis_start'] = j
                    # 继续收集解析内容
                    j += 1
                    while j < len(paragraphs) and not re.match(r'【\d{8}】', paragraphs[j]):
                        question_data['paragraphs'].append(paragraphs[j])
                        j += 1
                    break
                else:
                    # 收集题目内容
                    question_data['paragraphs'].append(paragraphs[j])
                    j += 1
            
            # 解析题目
            parsed = parse_question_from_paragraphs(question_data)
            if parsed:
                questions.append(parsed)
            else:
                format_issues[question_id] = {
                    "text": f"题目 {question_id} 解析失败",
                    "issues": ["无法正确解析题目格式"]
                }
            
            # 移动到下一个题目
            i = j
        else:
            i += 1
    
    return questions, format_issues

def parse_question_from_paragraphs(question_data):
    """从段落数据中解析题目"""
    question_id = question_data['question_id']
    year = question_data['year']
    subject = question_data['subject']
    paragraphs = question_data['paragraphs']
    
    if 'analysis_start' not in question_data:
        print(f"[调试] 题目 {question_id} 缺少【解析】标记", file=sys.stderr)
        return None
    
    analysis_start = question_data['analysis_start']
    
    # 分离题目部分和解析部分
    # analysis_start 是【解析】的位置，所以题目内容在它之前
    question_paragraphs = paragraphs[:analysis_start - 1]  # 减1是因为要排除【解析】本身
    analysis_paragraphs = paragraphs[analysis_start - 1:]   # 从【解析】之后开始
    
    if not question_paragraphs:
        print(f"[调试] 题目 {question_id} 没有题目内容", file=sys.stderr)
        return None
    
    # 第一段应该是题干
    question_text = question_paragraphs[0]
    
    # 查找选项
    options = {}
    option_pattern = re.compile(r'^([A-D])\.')
    
    for para in question_paragraphs[1:]:  # 从第二段开始查找选项
        match = option_pattern.match(para)
        if match:
            option_letter = match.group(1)
            option_content = para[2:].strip()  # 去掉"A."等前缀
            options[option_letter] = clean_text(option_content)
    
    # 验证是否有4个选项
    if len(options) != 4 or set(options.keys()) != {'A', 'B', 'C', 'D'}:
        print(f"[调试] 题目 {question_id} 选项不完整: {list(options.keys())}", file=sys.stderr)
        return None
    
    # 合并解析内容
    analysis = '\n'.join(analysis_paragraphs)
    analysis = clean_text(analysis)
    
    # 查找答案
    correct_answer = ""
    answer_patterns = [
        r'正确答案[：:]\s*([A-D]+)',
        r'答案[：:]\s*([A-D]+)',
        r'故选\s*([A-D]+)',
        r'本题答案[为是：:]\s*([A-D]+)',
        r'【答案】\s*([A-D]+)'
    ]
    
    for pattern in answer_patterns:
        match = re.search(pattern, analysis, re.IGNORECASE)
        if match:
            correct_answer = match.group(1).strip()
            break
    
    # 判断题型
    question_type = 2 if len(correct_answer) > 1 else 1
    
    return {
        'question_id': question_id,
        'year': year,
        'subject': subject,
        'question_text': clean_text(question_text),
        'options': json.dumps(options, ensure_ascii=False),
        'correct_answer': correct_answer,
        'analysis': analysis,
        'question_type': question_type
    }

def main():
    parser = argparse.ArgumentParser(description='修复版法考题目解析')
    parser.add_argument('file_path', help='Word文件路径')
    parser.add_argument('subject', help='学科名称')
    parser.add_argument('--output-json', action='store_true', help='以JSON格式输出结果')
    args = parser.parse_args()
    
    file_path = args.file_path
    subject = args.subject
    output_json = args.output_json
    
    if not os.path.exists(file_path):
        error_msg = f"错误: 文件 '{file_path}' 不存在"
        if output_json:
            print(json.dumps({"error": error_msg}, ensure_ascii=False))
        else:
            print(error_msg)
        return
    
    try:
        questions, format_issues = extract_questions_from_doc_fixed(file_path, subject)
        
        result = {
            "success": True,
            "message": f"成功解析 {len(questions)} 个题目",
            "total_questions": len(questions) + len(format_issues),
            "parsed_questions": len(questions),
            "format_issues": format_issues,
            "questions": questions
        }
        
        if format_issues:
            result["message"] += f"，{len(format_issues)} 个题目存在格式错误"
        
        if output_json:
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(f"共解析出 {len(questions)} 个题目")
            if format_issues:
                print(f"\n发现 {len(format_issues)} 个题目存在格式问题")
    
    except Exception as e:
        error_msg = f"程序出错: {e}"
        if output_json:
            print(json.dumps({"error": error_msg}, ensure_ascii=False))
        else:
            print(error_msg)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()