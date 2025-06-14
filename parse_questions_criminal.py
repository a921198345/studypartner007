#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
专门为刑法题库优化的解析脚本
正确处理分段的选项格式
"""

import re
import json
import sys
import os
import argparse
from docx import Document

def clean_text(text):
    """智能清理文本中的异常空白"""
    if not text:
        return text
    
    # 1. 替换全角空格为半角空格
    text = text.replace('　', ' ')
    
    # 2. 替换多个连续空格为单个空格
    text = re.sub(r' +', ' ', text)
    
    # 3. 清理行内的异常空白
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        # 处理选项中的异常空白
        line = re.sub(r'([A-D])\s+\.', r'\1.', line)
        # 处理标点符号前的异常空白
        line = re.sub(r'\s+([，。！？；：、）】》"''])', r'\1', line)
        # 处理标点符号后的异常空白
        line = re.sub(r'([（【《"''])\s+', r'\1', line)
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text

def extract_questions_from_criminal_law(file_path, subject):
    """专门为刑法题库设计的解析方法"""
    try:
        doc = Document(file_path)
    except Exception as e:
        raise Exception(f"无法打开文档: {e}")
    
    # 获取所有段落文本
    all_paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        all_paragraphs.append(text)
    
    print(f"[调试] 文档包含 {len(all_paragraphs)} 个段落", file=sys.stderr)
    
    questions = []
    format_issues = {}
    i = 0
    
    while i < len(all_paragraphs):
        # 查找题号
        if re.match(r'【\d{8}】', all_paragraphs[i]):
            question_id_match = re.search(r'【(\d+)】', all_paragraphs[i])
            if not question_id_match:
                i += 1
                continue
                
            question_id = question_id_match.group(1)
            year = int(question_id[:4])
            
            print(f"[调试] 处理题目 {question_id}", file=sys.stderr)
            
            # 初始化题目数据
            question_text = ""
            options = {}
            analysis_lines = []
            correct_answer = ""
            
            # 下一段应该是题干
            j = i + 1
            if j < len(all_paragraphs) and all_paragraphs[j] and not re.match(r'^[A-D]\.', all_paragraphs[j]):
                question_text = all_paragraphs[j]
                j += 1
            
            # 收集选项（连续的以A. B. C. D.开头的段落）
            while j < len(all_paragraphs):
                para_text = all_paragraphs[j]
                
                # 检查是否是选项
                option_match = re.match(r'^([A-D])\.(.+)', para_text)
                if option_match:
                    option_letter = option_match.group(1)
                    option_content = option_match.group(2).strip()
                    options[option_letter] = clean_text(option_content)
                    j += 1
                elif para_text == '【解析】':
                    # 找到解析标记，开始收集解析内容
                    j += 1
                    while j < len(all_paragraphs):
                        if re.match(r'【\d{8}】', all_paragraphs[j]):
                            # 遇到下一题，停止
                            break
                        elif all_paragraphs[j] == '【答案】' or re.match(r'^【答案】([A-D]+)$', all_paragraphs[j]):
                            # 找到答案标记
                            answer_match = re.match(r'^【答案】([A-D]+)$', all_paragraphs[j])
                            if answer_match:
                                correct_answer = answer_match.group(1)
                            j += 1
                            # 继续收集可能的额外解析
                            continue
                        elif all_paragraphs[j]:
                            # 收集解析内容
                            analysis_lines.append(all_paragraphs[j])
                        j += 1
                    break
                elif para_text == '【答案】' or re.match(r'^【答案】([A-D]+)$', para_text):
                    # 有些题目可能直接给出答案
                    answer_match = re.match(r'^【答案】([A-D]+)$', para_text)
                    if answer_match:
                        correct_answer = answer_match.group(1)
                    j += 1
                elif re.match(r'【\d{8}】', para_text):
                    # 遇到下一题，当前题目结束
                    break
                else:
                    # 其他内容，可能是解析的一部分
                    if para_text:
                        analysis_lines.append(para_text)
                    j += 1
            
            # 合并解析内容
            analysis = '\n'.join(analysis_lines)
            analysis = clean_text(analysis)
            
            # 如果还没找到答案，从解析中查找
            if not correct_answer and analysis:
                answer_patterns = [
                    r'答案[为是：:]\s*([A-D]+)',
                    r'正确答案[为是：:]\s*([A-D]+)',
                    r'故选\s*([A-D]+)',
                    r'本题答案[为是：:]\s*([A-D]+)',
                    r'综上所述[，,]?\s*本题答案[为是：:]\s*([A-D]+)'
                ]
                
                for pattern in answer_patterns:
                    match = re.search(pattern, analysis, re.IGNORECASE)
                    if match:
                        correct_answer = match.group(1).strip()
                        break
            
            # 验证题目完整性
            if len(options) == 4 and set(options.keys()) == {'A', 'B', 'C', 'D'} and question_text:
                # 判断题型
                question_type = 2 if len(correct_answer) > 1 else 1
                
                questions.append({
                    'question_id': question_id,
                    'year': year,
                    'subject': subject,
                    'question_text': clean_text(question_text),
                    'options': json.dumps(options, ensure_ascii=False),
                    'correct_answer': correct_answer,
                    'analysis': analysis,
                    'question_type': question_type
                })
            else:
                # 记录格式问题
                issues = []
                if not question_text:
                    issues.append("缺少题干")
                if len(options) != 4:
                    issues.append(f"选项数量错误：需要4个选项(A-D)，实际只有{len(options)}个")
                if not correct_answer:
                    issues.append("未找到答案")
                    
                format_issues[question_id] = {
                    "text": f"题目内容：{question_text[:50] if question_text else '无'}",
                    "issues": issues
                }
            
            # 移动到下一题
            i = j
        else:
            i += 1
    
    return questions, format_issues

def main():
    parser = argparse.ArgumentParser(description='刑法题库专用解析脚本')
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
            print(json.dumps({
                "success": False,
                "error": error_msg
            }, ensure_ascii=False))
        else:
            print(error_msg)
        return
    
    try:
        questions, format_issues = extract_questions_from_criminal_law(file_path, subject)
        
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
            
            # 统计错误类型
            error_types = {}
            for q_id, issue_data in format_issues.items():
                for issue in issue_data['issues']:
                    if issue not in error_types:
                        error_types[issue] = []
                    error_types[issue].append(q_id)
            
            result["error_summary"] = error_types
        
        if output_json:
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(f"共解析出 {len(questions)} 个题目")
            if format_issues:
                print(f"\n发现 {len(format_issues)} 个题目存在格式问题：")
                for q_id, issue in list(format_issues.items())[:10]:
                    print(f"\n题目 {q_id}:")
                    for err in issue['issues']:
                        print(f"  - {err}")
                if len(format_issues) > 10:
                    print(f"\n... 还有 {len(format_issues) - 10} 个题目存在问题")
    
    except Exception as e:
        error_msg = f"程序出错: {e}"
        if output_json:
            print(json.dumps({
                "success": False,
                "error": error_msg
            }, ensure_ascii=False))
        else:
            print(error_msg)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()