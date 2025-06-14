#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
智能题目格式验证器
解决跨页面选项、灵活题号格式、跨页答案标识等问题
"""

import re
import json
from docx import Document
import sys
import os

class SmartQuestionValidator:
    def __init__(self):
        self.question_cache = {}  # 缓存题目内容，用于跨页检测
        
    def clean_text(self, text):
        """清理文本中的异常空白和格式"""
        if not text:
            return text
        
        # 替换全角空格为半角空格
        text = text.replace('　', ' ')
        
        # 替换多个连续空格为单个空格
        text = re.sub(r' +', ' ', text)
        
        # 清理选项格式
        text = re.sub(r'([A-D])\s+\.', r'\1.', text)
        
        # 去除多余换行
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def merge_cross_page_content(self, paragraphs):
        """合并跨页的题目内容"""
        merged_questions = []
        current_question = ""
        current_id = None
        
        for para in paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            # 检测新题目开始
            question_id_match = re.search(r'【(\d+)】', text)
            if question_id_match:
                # 保存上一个题目
                if current_question and current_id:
                    merged_questions.append({
                        'id': current_id,
                        'text': current_question
                    })
                
                # 开始新题目
                current_id = question_id_match.group(1)
                current_question = text
            else:
                # 继续当前题目
                if current_question:
                    current_question += "\n" + text
        
        # 保存最后一个题目
        if current_question and current_id:
            merged_questions.append({
                'id': current_id,
                'text': current_question
            })
        
        return merged_questions
    
    def validate_question_id(self, text):
        """灵活验证题号格式"""
        # 支持多种题号格式
        patterns = [
            r'【(\d{8})】',       # 标准8位格式
            r'【(\d{4,8})】',     # 4-8位数字
            r'\[(\d+)\]',         # 方括号格式
            r'（(\d+)）',         # 圆括号格式
            r'^(\d+)[\.、．:：]\s*' # 数字开头格式
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1), None
        
        return None, "未找到有效的题号格式"
    
    def find_options_smart(self, text):
        """智能查找选项，处理跨页情况"""
        options = {}
        
        # 分段搜索，处理可能的跨页情况
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            # 查找选项标记
            for opt in ['A', 'B', 'C', 'D']:
                # 多种选项格式
                patterns = [
                    rf'^{opt}[\.、．:：]\s*(.+)',
                    rf'\s{opt}[\.、．:：]\s*(.+)',
                    rf'^{opt}\s+(.+)',  # 处理 "A 选项内容" 格式
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match:
                        # 获取选项内容
                        content = match.group(1).strip()
                        
                        # 如果选项内容在下一行，合并
                        if not content and i + 1 < len(lines):
                            content = lines[i + 1].strip()
                        
                        if content:
                            options[opt] = content
                            break
        
        return options
    
    def find_answer_smart(self, text):
        """智能查找答案，处理跨页和多种格式"""
        # 扩展答案模式列表
        answer_patterns = [
            # 显式答案标记
            r'【答案】\s*[：:：]?\s*([A-D]+)',
            r'答案\s*[：:：]\s*([A-D]+)',
            r'正确答案\s*[是为：:：]\s*([A-D]+)',
            
            # 隐式答案标记
            r'故\s*选\s*([A-D]+)',
            r'应\s*选\s*([A-D]+)',
            r'本题\s*选\s*([A-D]+)',
            r'因此\s*选\s*([A-D]+)',
            r'综上.*?选\s*([A-D]+)',
            
            # 选项正确性标记
            r'([A-D])\s*项?\s*(?:正确|对|符合|满足)',
            r'正确的是\s*([A-D])',
            r'([A-D])\s*(?:正确|对)',
            
            # 在解析末尾查找
            r'[。，]\s*([A-D])\s*[。]?\s*$',
            
            # 处理引用其他题目的情况
            r'同\s*【?\d+】?\s*题.*?([A-D])',
            r'参见\s*【?\d+】?\s*题.*?([A-D])',
        ]
        
        # 先尝试在整个文本中查找
        for pattern in answer_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
            if match:
                return match.group(1).strip().upper()
        
        # 如果没找到，尝试在最后几行查找
        lines = text.split('\n')
        last_lines = '\n'.join(lines[-5:])  # 检查最后5行
        
        for pattern in answer_patterns:
            match = re.search(pattern, last_lines, re.IGNORECASE)
            if match:
                return match.group(1).strip().upper()
        
        return None
    
    def validate_question_smart(self, question_text, question_id=None):
        """智能验证题目格式"""
        issues = []
        suggestions = []
        
        # 清理文本
        clean_text = self.clean_text(question_text)
        
        # 1. 验证题号
        found_id, id_issue = self.validate_question_id(clean_text)
        if id_issue and not question_id:
            issues.append(id_issue)
        elif found_id and question_id and found_id != question_id:
            suggestions.append(f"题号不一致：文本中为【{found_id}】，系统中为【{question_id}】")
        
        # 2. 查找选项
        options = self.find_options_smart(clean_text)
        
        # 检查选项完整性
        missing_options = []
        for opt in ['A', 'B', 'C', 'D']:
            if opt not in options:
                missing_options.append(opt)
        
        if missing_options:
            # 不直接报错，而是给出建议
            if len(missing_options) <= 2:
                suggestions.append(f"可能缺少选项: {', '.join(missing_options)} (可能在其他页面)")
            else:
                issues.append(f"缺少选项: {', '.join(missing_options)}")
        
        # 3. 检查解析
        has_analysis = '【解析】' in clean_text or '解析' in clean_text
        if not has_analysis:
            # 检查是否有类似解析的内容
            if any(keyword in clean_text for keyword in ['因为', '根据', '由于', '所以', '因此']):
                suggestions.append("未找到【解析】标记，但存在解析性内容")
            else:
                issues.append("缺少解析内容")
        
        # 4. 查找答案
        answer = self.find_answer_smart(clean_text)
        if not answer:
            # 检查是否在其他题目中引用
            if re.search(r'同\s*【?\d+】?\s*题|参见\s*【?\d+】?\s*题', clean_text):
                suggestions.append("答案可能引用了其他题目")
            else:
                suggestions.append("未找到明确的答案标识（可能在其他页面）")
        
        # 5. 检查题目质量
        if len(clean_text) < 50:
            suggestions.append("题目内容过短，可能不完整")
        
        # 返回验证结果
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'suggestions': suggestions,
            'found_options': options,
            'found_answer': answer,
            'question_id': found_id or question_id
        }
    
    def validate_document(self, doc_path):
        """验证整个文档"""
        doc = Document(doc_path)
        
        # 合并跨页内容
        paragraphs = doc.paragraphs
        merged_questions = self.merge_cross_page_content(paragraphs)
        
        results = {
            'total_questions': len(merged_questions),
            'valid_questions': 0,
            'issues_by_question': {},
            'suggestions_by_question': {}
        }
        
        for question_data in merged_questions:
            q_id = question_data['id']
            q_text = question_data['text']
            
            validation = self.validate_question_smart(q_text, q_id)
            
            if validation['valid']:
                results['valid_questions'] += 1
            else:
                if validation['issues']:
                    results['issues_by_question'][q_id] = validation['issues']
                
            if validation['suggestions']:
                results['suggestions_by_question'][q_id] = validation['suggestions']
        
        return results

def main():
    if len(sys.argv) < 2:
        print("用法: python smart_question_validator.py <文档路径>")
        return
    
    doc_path = sys.argv[1]
    
    if not os.path.exists(doc_path):
        print(f"错误: 文件 {doc_path} 不存在")
        return
    
    validator = SmartQuestionValidator()
    results = validator.validate_document(doc_path)
    
    print(f"\n验证结果:")
    print(f"总题目数: {results['total_questions']}")
    print(f"有效题目数: {results['valid_questions']}")
    print(f"存在问题的题目数: {len(results['issues_by_question'])}")
    print(f"存在建议的题目数: {len(results['suggestions_by_question'])}")
    
    if results['issues_by_question']:
        print("\n严重问题:")
        for q_id, issues in results['issues_by_question'].items():
            print(f"\n题目【{q_id}】:")
            for issue in issues:
                print(f"  - {issue}")
    
    if results['suggestions_by_question']:
        print("\n改进建议:")
        for q_id, suggestions in results['suggestions_by_question'].items():
            print(f"\n题目【{q_id}】:")
            for suggestion in suggestions:
                print(f"  - {suggestion}")

if __name__ == "__main__":
    main()