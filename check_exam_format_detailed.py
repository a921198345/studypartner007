#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细检查2024年法考真题文档格式的脚本
"""

import os
import re
import json
from datetime import datetime
from docx import Document
from collections import defaultdict

class DetailedExamChecker:
    def __init__(self, file_path):
        self.file_path = file_path
        self.doc = None
        self.questions = []
        self.format_issues = defaultdict(list)
        
    def load_document(self):
        """加载Word文档"""
        try:
            self.doc = Document(self.file_path)
            return True
        except Exception as e:
            print(f"无法打开文档: {e}")
            return False
    
    def parse_document(self):
        """解析文档内容"""
        current_question = None
        current_text = []
        in_options = False
        
        for para in self.doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            # 检查是否是新题目的开始
            # 匹配模式：1. 或 第1题 等
            question_match = re.match(r'^(\d+)[．.、]?\s*(.*)$', text) or \
                           re.match(r'^第(\d+)题[：:、]?\s*(.*)$', text)
            
            if question_match:
                # 保存上一题
                if current_question:
                    self._analyze_question(current_question)
                    self.questions.append(current_question)
                
                # 开始新题目
                question_num = int(question_match.group(1))
                question_stem = question_match.group(2) if question_match.group(2) else ""
                
                current_question = {
                    'number': question_num,
                    'stem': question_stem,
                    'full_text': [text],
                    'options': {},
                    'answer': None,
                    'analysis': None
                }
                in_options = False
                current_text = []
            
            # 检查选项
            elif current_question:
                current_question['full_text'].append(text)
                
                # 匹配选项格式：A. 或 A、或 A:
                option_match = re.match(r'^([A-D])[．.、：:]\s*(.*)$', text)
                if option_match:
                    in_options = True
                    letter = option_match.group(1)
                    content = option_match.group(2).strip()
                    current_question['options'][letter] = content
                
                # 检查答案
                elif re.match(r'^答案[：:、]?\s*([A-D]).*$', text):
                    answer_match = re.match(r'^答案[：:、]?\s*([A-D]).*$', text)
                    if answer_match:
                        current_question['answer'] = answer_match.group(1)
                
                # 检查解析
                elif re.match(r'^解析[：:、]?\s*(.*)$', text):
                    analysis_match = re.match(r'^解析[：:、]?\s*(.*)$', text)
                    if analysis_match:
                        current_question['analysis'] = analysis_match.group(1)
                
                # 继续收集题干或解析内容
                elif not in_options and not current_question['answer'] and not current_question['analysis']:
                    # 这是题干的延续
                    if current_question['stem']:
                        current_question['stem'] += ' ' + text
                    else:
                        current_question['stem'] = text
                elif current_question['analysis'] is not None:
                    # 这是解析的延续
                    current_question['analysis'] += ' ' + text
        
        # 保存最后一题
        if current_question:
            self._analyze_question(current_question)
            self.questions.append(current_question)
    
    def _analyze_question(self, question):
        """分析单个题目的格式问题"""
        q_num = question['number']
        issues = []
        
        # 检查题干
        if not question['stem'] or len(question['stem']) < 10:
            issues.append("题干内容过短或缺失")
        
        # 检查选项
        expected_options = ['A', 'B', 'C', 'D']
        missing_options = []
        for opt in expected_options:
            if opt not in question['options']:
                missing_options.append(opt)
        
        if missing_options:
            if len(missing_options) == 4:
                issues.append("完全缺少选项")
            else:
                issues.append(f"缺少选项: {', '.join(missing_options)}")
        else:
            # 检查选项内容
            for opt, content in question['options'].items():
                if not content or len(content) < 2:
                    issues.append(f"选项{opt}内容为空或过短")
        
        # 检查答案
        if not question['answer']:
            issues.append("缺少答案")
        elif question['answer'] not in expected_options:
            issues.append(f"答案格式错误: {question['answer']}")
        
        # 检查解析
        if not question['analysis']:
            issues.append("缺少解析")
        elif len(question['analysis']) < 10:
            issues.append("解析内容过短")
        
        # 记录问题
        if issues:
            self.format_issues[q_num] = issues
    
    def generate_detailed_report(self):
        """生成详细报告"""
        # 统计信息
        total_questions = len(self.questions)
        questions_with_issues = len(self.format_issues)
        perfect_questions = total_questions - questions_with_issues
        
        # 问题分类统计
        issue_stats = defaultdict(int)
        for issues in self.format_issues.values():
            for issue in issues:
                if "完全缺少选项" in issue:
                    issue_stats['no_options'] += 1
                elif "缺少选项" in issue:
                    issue_stats['missing_options'] += 1
                elif "缺少答案" in issue:
                    issue_stats['no_answer'] += 1
                elif "缺少解析" in issue:
                    issue_stats['no_analysis'] += 1
                elif "题干" in issue:
                    issue_stats['stem_issues'] += 1
                elif "选项" in issue and "内容" in issue:
                    issue_stats['option_content_issues'] += 1
        
        # 创建报告
        report = {
            'file': self.file_path,
            'check_time': datetime.now().isoformat(),
            'summary': {
                'total_questions': total_questions,
                'perfect_questions': perfect_questions,
                'questions_with_issues': questions_with_issues,
                'issue_breakdown': dict(issue_stats)
            },
            'detailed_issues': dict(self.format_issues),
            'questions': []
        }
        
        # 添加每道题的详细信息
        for q in self.questions:
            q_info = {
                'number': q['number'],
                'has_stem': bool(q['stem']),
                'stem_length': len(q['stem']) if q['stem'] else 0,
                'options_count': len(q['options']),
                'missing_options': [opt for opt in ['A', 'B', 'C', 'D'] if opt not in q['options']],
                'has_answer': bool(q['answer']),
                'has_analysis': bool(q['analysis']),
                'analysis_length': len(q['analysis']) if q['analysis'] else 0,
                'issues': self.format_issues.get(q['number'], [])
            }
            report['questions'].append(q_info)
        
        return report
    
    def save_detailed_report(self):
        """保存详细报告"""
        report = self.generate_detailed_report()
        
        # 保存JSON报告
        json_file = self.file_path.replace('.docx', '_detailed_check.json')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 生成可读的文本报告
        txt_file = self.file_path.replace('.docx', '_detailed_check.txt')
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write("2024年法考真题格式详细检查报告\n")
            f.write("=" * 80 + "\n\n")
            f.write(f"文件: {os.path.basename(self.file_path)}\n")
            f.write(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("【总体统计】\n")
            f.write(f"- 总题数: {report['summary']['total_questions']}\n")
            f.write(f"- 格式完整的题目: {report['summary']['perfect_questions']}\n")
            f.write(f"- 有问题的题目: {report['summary']['questions_with_issues']}\n\n")
            
            f.write("【问题分类统计】\n")
            stats = report['summary']['issue_breakdown']
            if stats.get('no_options'):
                f.write(f"- 完全缺少选项: {stats['no_options']} 道\n")
            if stats.get('missing_options'):
                f.write(f"- 选项不完整: {stats['missing_options']} 道\n")
            if stats.get('no_answer'):
                f.write(f"- 缺少答案: {stats['no_answer']} 道\n")
            if stats.get('no_analysis'):
                f.write(f"- 缺少解析: {stats['no_analysis']} 道\n")
            if stats.get('stem_issues'):
                f.write(f"- 题干问题: {stats['stem_issues']} 道\n")
            if stats.get('option_content_issues'):
                f.write(f"- 选项内容问题: {stats['option_content_issues']} 道\n")
            f.write("\n")
            
            # 列出具体问题
            if self.format_issues:
                f.write("【具体问题详情】\n")
                f.write("-" * 80 + "\n")
                
                # 按问题严重程度排序
                sorted_issues = sorted(self.format_issues.items(), 
                                     key=lambda x: (len(x[1]), x[0]), 
                                     reverse=True)
                
                for q_num, issues in sorted_issues:
                    f.write(f"\n第 {q_num} 题 (问题数: {len(issues)}):\n")
                    for issue in issues:
                        f.write(f"  ✗ {issue}\n")
            else:
                f.write("\n恭喜！所有题目格式都完整无误。\n")
            
            # 添加格式完整的题目列表
            perfect_questions = [q['number'] for q in report['questions'] if not q['issues']]
            if perfect_questions:
                f.write(f"\n【格式完整的题目】({len(perfect_questions)}道):\n")
                f.write(f"{', '.join(map(str, perfect_questions[:20]))}")
                if len(perfect_questions) > 20:
                    f.write(f"... 等共{len(perfect_questions)}道\n")
                else:
                    f.write("\n")
        
        # 生成问题汇总CSV
        csv_file = self.file_path.replace('.docx', '_issues_summary.csv')
        with open(csv_file, 'w', encoding='utf-8-sig') as f:
            f.write("题号,题干长度,选项数,缺少选项,有答案,有解析,解析长度,问题数,具体问题\n")
            for q in report['questions']:
                missing_opts = '|'.join(q['missing_options']) if q['missing_options'] else '无'
                issues = '|'.join(q['issues']) if q['issues'] else '无'
                f.write(f"{q['number']},{q['stem_length']},{q['options_count']},{missing_opts},")
                f.write(f"{'是' if q['has_answer'] else '否'},{'是' if q['has_analysis'] else '否'},")
                f.write(f"{q['analysis_length']},{len(q['issues'])},{issues}\n")
        
        print(f"\n检查完成！生成了以下报告：")
        print(f"1. JSON详细报告: {json_file}")
        print(f"2. 文本报告: {txt_file}")
        print(f"3. 问题汇总CSV: {csv_file}")
        
        # 打印摘要
        print(f"\n【检查摘要】")
        print(f"总题数: {report['summary']['total_questions']}")
        print(f"格式完整: {report['summary']['perfect_questions']} 道")
        print(f"有问题: {report['summary']['questions_with_issues']} 道")
        
        if report['summary']['questions_with_issues'] > 0:
            print(f"\n【主要问题】")
            stats = report['summary']['issue_breakdown']
            if stats.get('no_answer', 0) > 0:
                print(f"- {stats['no_answer']} 道题缺少答案")
            if stats.get('no_analysis', 0) > 0:
                print(f"- {stats['no_analysis']} 道题缺少解析")
            if stats.get('no_options', 0) > 0:
                print(f"- {stats['no_options']} 道题完全缺少选项")


def main():
    file_path = "/Users/acheng/Downloads/law-exam-assistant/2024年法考真题-补充完整版.docx"
    
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return
    
    print(f"开始详细检查文档: {file_path}")
    print("=" * 80)
    
    checker = DetailedExamChecker(file_path)
    
    if checker.load_document():
        checker.parse_document()
        checker.save_detailed_report()
    else:
        print("无法加载文档")


if __name__ == "__main__":
    main()