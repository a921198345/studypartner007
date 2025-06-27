#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查2024年法考真题文档格式的脚本
"""

import os
import re
import json
from datetime import datetime
from docx import Document

class ExamFormatChecker:
    def __init__(self, file_path):
        self.file_path = file_path
        self.doc = None
        self.problems = []
        self.questions = []
        
    def load_document(self):
        """加载Word文档"""
        try:
            self.doc = Document(self.file_path)
            return True
        except Exception as e:
            print(f"无法打开文档: {e}")
            return False
    
    def extract_text(self):
        """提取文档中的所有文本"""
        full_text = []
        for para in self.doc.paragraphs:
            text = para.text.strip()
            if text:
                full_text.append(text)
        return '\n'.join(full_text)
    
    def check_questions(self):
        """检查每道题的格式"""
        full_text = self.extract_text()
        
        # 分割题目
        # 匹配题号的各种模式
        question_patterns = [
            r'(\d+)[．.、]\s*(.+?)(?=\d+[．.、]|$)',
            r'第(\d+)题[：:]\s*(.+?)(?=第\d+题|$)',
            r'(\d+)\.\s*(.+?)(?=\d+\.|$)'
        ]
        
        # 尝试不同的模式
        all_questions = []
        for pattern in question_patterns:
            matches = re.finditer(pattern, full_text, re.DOTALL)
            for match in matches:
                question_num = match.group(1)
                question_content = match.group(2)
                all_questions.append({
                    'number': int(question_num),
                    'content': question_content
                })
        
        # 去重并排序
        unique_questions = {}
        for q in all_questions:
            num = q['number']
            if num not in unique_questions or len(q['content']) > len(unique_questions[num]['content']):
                unique_questions[num] = q
        
        # 检查每道题
        for num in sorted(unique_questions.keys()):
            question = unique_questions[num]
            content = question['content']
            
            # 检查选项
            options = {}
            for letter in ['A', 'B', 'C', 'D']:
                # 匹配选项的各种格式
                option_patterns = [
                    f'{letter}[．.、：:]\s*(.+?)(?=[A-D][．.、：:]|答案|解析|$)',
                    f'{letter}\.\s*(.+?)(?=[A-D]\.|答案|解析|$)'
                ]
                
                for pattern in option_patterns:
                    match = re.search(pattern, content, re.DOTALL)
                    if match:
                        options[letter] = match.group(1).strip()
                        break
            
            # 检查答案
            answer_match = re.search(r'答案[：:]\s*([A-D])', content)
            answer = answer_match.group(1) if answer_match else None
            
            # 检查解析
            analysis_match = re.search(r'解析[：:]\s*(.+?)(?=\d+[．.、]|第\d+题|$)', content, re.DOTALL)
            has_analysis = bool(analysis_match)
            
            # 记录问题
            problems = []
            
            # 检查选项完整性
            missing_options = []
            for letter in ['A', 'B', 'C', 'D']:
                if letter not in options:
                    missing_options.append(letter)
            
            if missing_options:
                problems.append(f"缺少选项: {', '.join(missing_options)}")
            
            # 检查答案
            if not answer:
                problems.append("缺少答案")
            
            # 检查解析
            if not has_analysis:
                problems.append("缺少解析")
            
            # 保存题目信息
            question_info = {
                'number': num,
                'has_all_options': len(options) == 4,
                'options': options,
                'has_answer': bool(answer),
                'answer': answer,
                'has_analysis': has_analysis,
                'problems': problems
            }
            
            self.questions.append(question_info)
            
            # 如果有问题，记录到问题列表
            if problems:
                self.problems.append({
                    'question_number': num,
                    'problems': problems
                })
    
    def generate_report(self):
        """生成检查报告"""
        report = {
            'file': self.file_path,
            'check_time': datetime.now().isoformat(),
            'total_questions': len(self.questions),
            'questions_with_problems': len(self.problems),
            'problem_details': self.problems,
            'summary': {
                'questions_without_options': 0,
                'questions_without_answer': 0,
                'questions_without_analysis': 0,
                'questions_with_incomplete_options': 0
            }
        }
        
        # 统计问题
        for q in self.questions:
            if not q['has_all_options']:
                if not q['options']:
                    report['summary']['questions_without_options'] += 1
                else:
                    report['summary']['questions_with_incomplete_options'] += 1
            if not q['has_answer']:
                report['summary']['questions_without_answer'] += 1
            if not q['has_analysis']:
                report['summary']['questions_without_analysis'] += 1
        
        return report
    
    def save_report(self):
        """保存检查报告"""
        report = self.generate_report()
        
        # 保存JSON报告
        json_file = self.file_path.replace('.docx', '_format_check_report.json')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 生成可读报告
        txt_file = self.file_path.replace('.docx', '_format_check_report.txt')
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write("2024年法考真题格式检查报告\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"文件: {os.path.basename(self.file_path)}\n")
            f.write(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"总题数: {report['total_questions']}\n")
            f.write(f"有问题的题目数: {report['questions_with_problems']}\n\n")
            
            f.write("问题汇总:\n")
            f.write(f"- 完全缺少选项的题目: {report['summary']['questions_without_options']} 道\n")
            f.write(f"- 选项不完整的题目: {report['summary']['questions_with_incomplete_options']} 道\n")
            f.write(f"- 缺少答案的题目: {report['summary']['questions_without_answer']} 道\n")
            f.write(f"- 缺少解析的题目: {report['summary']['questions_without_analysis']} 道\n\n")
            
            if self.problems:
                f.write("具体问题:\n")
                f.write("-" * 60 + "\n")
                for problem in self.problems:
                    f.write(f"\n第 {problem['question_number']} 题:\n")
                    for p in problem['problems']:
                        f.write(f"  - {p}\n")
            else:
                f.write("恭喜！所有题目格式都正确。\n")
        
        print(f"\n检查完成！")
        print(f"- JSON报告: {json_file}")
        print(f"- 文本报告: {txt_file}")
        
        # 打印摘要
        print(f"\n检查摘要:")
        print(f"- 总题数: {report['total_questions']}")
        print(f"- 有问题的题目: {report['questions_with_problems']} 道")
        if report['questions_with_problems'] > 0:
            print(f"  - 缺少选项: {report['summary']['questions_without_options']} 道")
            print(f"  - 选项不全: {report['summary']['questions_with_incomplete_options']} 道")
            print(f"  - 缺少答案: {report['summary']['questions_without_answer']} 道")
            print(f"  - 缺少解析: {report['summary']['questions_without_analysis']} 道")


def main():
    file_path = "/Users/acheng/Downloads/law-exam-assistant/2024年法考真题-补充完整版.docx"
    
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return
    
    print(f"开始检查文档格式: {file_path}")
    print("=" * 60)
    
    checker = ExamFormatChecker(file_path)
    
    if checker.load_document():
        checker.check_questions()
        checker.save_report()
    else:
        print("无法加载文档")


if __name__ == "__main__":
    main()