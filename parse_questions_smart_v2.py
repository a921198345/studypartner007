#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
智能题目解析脚本 V2
集成跨页面处理、灵活格式识别、智能验证
"""

import re
import json
import sys
import os
import argparse
from datetime import datetime
from docx import Document

class SmartQuestionParser:
    def __init__(self, subject=None):
        self.subject = subject
        self.question_cache = {}
        
    def clean_text(self, text):
        """清理文本中的异常空白和格式"""
        if not text:
            return ""
        
        # 替换全角空格为半角空格
        text = text.replace('　', ' ')
        
        # 替换多个连续空格为单个空格
        text = re.sub(r' +', ' ', text)
        
        # 清理选项格式
        text = re.sub(r'([A-D])\s+\.', r'\1.', text)
        
        # 处理标点符号前后的空白
        text = re.sub(r'\s+([，。！？；：、）】》"''])', r'\1', text)
        text = re.sub(r'([（【《"''])\s+', r'\1', text)
        
        # 去除多余换行
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def extract_question_id(self, text):
        """灵活提取题号"""
        # 支持多种题号格式
        patterns = [
            (r'【(\d{8})】', 'standard'),       # 标准8位格式
            (r'【(\d{4,8})】', 'bracket'),      # 4-8位数字
            (r'\[(\d+)\]', 'square'),           # 方括号格式
            (r'（(\d+)）', 'paren'),            # 圆括号格式
            (r'^(\d+)[\.、．:：]\s*', 'number') # 数字开头格式
        ]
        
        for pattern, format_type in patterns:
            match = re.search(pattern, text, re.MULTILINE)
            if match:
                question_id = match.group(1)
                
                # 标准化题号为8位
                if len(question_id) < 8:
                    # 如果是年份开头的短题号，补充0
                    if len(question_id) >= 4 and question_id[:4].isdigit() and int(question_id[:4]) >= 2000:
                        question_id = question_id.ljust(8, '0')
                    else:
                        # 否则在前面补0
                        question_id = question_id.zfill(8)
                elif len(question_id) > 8:
                    # 如果超过8位，取最后8位
                    question_id = question_id[-8:]
                
                return question_id, format_type
        
        return None, None
    
    def merge_paragraphs_to_questions(self, paragraphs):
        """将段落合并成完整的题目"""
        questions = []
        current_question = {
            'id': None,
            'paragraphs': [],
            'text': ''
        }
        
        for para in paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            # 检查是否是新题目的开始
            q_id, _ = self.extract_question_id(text)
            
            if q_id:
                # 保存当前题目
                if current_question['id'] and current_question['paragraphs']:
                    current_question['text'] = '\n'.join(current_question['paragraphs'])
                    questions.append(current_question)
                
                # 开始新题目
                current_question = {
                    'id': q_id,
                    'paragraphs': [text],
                    'text': ''
                }
            else:
                # 继续当前题目
                if current_question['id']:
                    current_question['paragraphs'].append(text)
        
        # 保存最后一个题目
        if current_question['id'] and current_question['paragraphs']:
            current_question['text'] = '\n'.join(current_question['paragraphs'])
            questions.append(current_question)
        
        return questions
    
    def extract_options(self, text, question_part=None):
        """智能提取选项，处理跨页和各种格式"""
        options = {}
        
        # 如果提供了题目部分（不含解析），优先使用
        search_text = question_part if question_part else text
        
        # 查找所有可能的选项
        option_patterns = [
            r'([A-D])[\.、．:：]\s*([^\n]*?)(?=\s*[A-D][\.、．:：]|【解析】|\n\n|$)',
            r'([A-D])\s+([^\n]*?)(?=\s*[A-D]\s+|【解析】|\n\n|$)',
        ]
        
        for pattern in option_patterns:
            matches = re.findall(pattern, search_text, re.DOTALL | re.MULTILINE)
            for opt, content in matches:
                content = self.clean_text(content)
                if content and opt not in options:
                    options[opt] = content
        
        # 如果选项不完整，尝试从整个文本查找
        if len(options) < 4:
            lines = text.split('\n')
            for i, line in enumerate(lines):
                for opt in ['A', 'B', 'C', 'D']:
                    if opt not in options:
                        # 查找选项行
                        if re.match(rf'^{opt}[\.、．:：]', line.strip()):
                            # 获取选项内容
                            content = re.sub(rf'^{opt}[\.、．:：]\s*', '', line).strip()
                            
                            # 如果当前行内容为空，查看下一行
                            if not content and i + 1 < len(lines):
                                next_line = lines[i + 1].strip()
                                if not re.match(r'^[A-D][\.、．:：]', next_line):
                                    content = next_line
                            
                            if content:
                                options[opt] = self.clean_text(content)
        
        return options
    
    def extract_answer(self, text):
        """智能提取答案，支持多种格式和跨页"""
        # 扩展的答案模式
        answer_patterns = [
            # 显式答案标记
            r'【答案】\s*[：:：]?\s*([A-D]+)',
            r'答案\s*[：:：]\s*([A-D]+)',
            r'正确答案\s*[是为：:：]\s*([A-D]+)',
            
            # 常见答案表述
            r'故\s*选\s*([A-D]+)',
            r'故\s*本题\s*选\s*([A-D]+)',
            r'应\s*选\s*([A-D]+)',
            r'本题\s*选\s*([A-D]+)',
            r'因此\s*选\s*([A-D]+)',
            r'所以\s*选\s*([A-D]+)',
            r'综上.*?选\s*([A-D]+)',
            
            # 选项正确性描述
            r'([A-D])\s*项?\s*(?:正确|对|符合|满足)',
            r'正确的?是\s*([A-D])',
            r'([A-D])\s*(?:正确|对)(?:[。，]|$)',
            
            # 末尾答案
            r'[。，]\s*([A-D])\s*[。]?\s*$',
            
            # 处理题目引用
            r'同\s*【?\d+】?\s*题[，。]?\s*(?:答案是)?\s*([A-D])',
            r'参见\s*【?\d+】?\s*题[，。]?\s*(?:答案是)?\s*([A-D])',
            
            # 其他变体
            r'选择\s*([A-D])',
            r'应选择\s*([A-D])',
            r'正确选项[是为：:]\s*([A-D])',
        ]
        
        # 优先在解析部分查找
        analysis_match = re.search(r'【解析】(.*?)$', text, re.DOTALL)
        if analysis_match:
            analysis_text = analysis_match.group(1)
            for pattern in answer_patterns:
                match = re.search(pattern, analysis_text, re.IGNORECASE | re.MULTILINE)
                if match:
                    return match.group(1).strip().upper()
        
        # 如果解析中没找到，在全文查找
        for pattern in answer_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
            if match:
                return match.group(1).strip().upper()
        
        return None
    
    def determine_question_type(self, answer):
        """根据答案判断题目类型"""
        if not answer:
            return 'single'
        
        # 如果答案包含多个字母，是多选题
        if len(answer) > 1:
            return 'multiple'
        
        return 'single'
    
    def parse_question(self, question_data):
        """解析单个题目"""
        text = self.clean_text(question_data['text'])
        question_id = question_data['id']
        
        # 分离题目和解析
        parts = re.split(r'【解析】', text, maxsplit=1)
        if len(parts) == 2:
            question_part = parts[0]
            analysis = self.clean_text(parts[1])
        else:
            # 尝试其他解析标记
            alt_split = re.split(r'(解析|分析|答案解释)[：:：]', text, maxsplit=1)
            if len(alt_split) >= 3:
                question_part = alt_split[0]
                analysis = self.clean_text(alt_split[2])
            else:
                question_part = text
                analysis = ""
        
        # 提取题干
        # 去除题号部分
        question_text = re.sub(r'^【\d+】\s*', '', question_part)
        question_text = re.sub(r'^[\[\(（]\d+[\]\)）][\.、．:：]?\s*', '', question_text)
        
        # 找到第一个选项前的内容作为题干
        first_option_match = re.search(r'[A-D][\.、．:：]', question_text)
        if first_option_match:
            question_stem = question_text[:first_option_match.start()].strip()
        else:
            question_stem = question_text.strip()
        
        # 提取选项
        options = self.extract_options(text, question_part)
        
        # 确保有4个选项
        for opt in ['A', 'B', 'C', 'D']:
            if opt not in options:
                options[opt] = f"[选项{opt}内容缺失]"
        
        # 提取答案
        answer = self.extract_answer(text)
        if not answer:
            answer = "A"  # 默认答案
        
        # 确定题目类型
        question_type = self.determine_question_type(answer)
        
        # 提取年份
        year = int(question_id[:4]) if question_id[:4].isdigit() else datetime.now().year
        
        # 构建题目对象
        question = {
            'question_id': question_id,
            'question_text': question_stem,
            'options': options,
            'correct_answer': answer,
            'analysis': analysis,
            'question_type': question_type,
            'difficulty': 'medium',  # 默认难度
            'year': year,
            'subject': self.subject or '未分类'
        }
        
        return question
    
    def parse_document(self, doc_path):
        """解析整个文档"""
        doc = Document(doc_path)
        paragraphs = doc.paragraphs
        
        # 合并段落成题目
        questions_data = self.merge_paragraphs_to_questions(paragraphs)
        
        # 解析每个题目
        parsed_questions = []
        format_issues = {}
        
        for q_data in questions_data:
            try:
                question = self.parse_question(q_data)
                
                # 验证题目完整性
                issues = []
                if question['question_text'] == "":
                    issues.append("题干为空")
                if all(opt.startswith('[') for opt in question['options'].values()):
                    issues.append("所有选项内容缺失")
                if not question['analysis']:
                    issues.append("缺少解析")
                
                if issues:
                    format_issues[question['question_id']] = {
                        'issues': issues,
                        'text': q_data['text'][:200] + '...'
                    }
                else:
                    parsed_questions.append(question)
                    
            except Exception as e:
                format_issues[q_data['id']] = {
                    'issues': [f"解析错误: {str(e)}"],
                    'text': q_data['text'][:200] + '...'
                }
        
        return {
            'questions': parsed_questions,
            'format_issues': format_issues,
            'total_questions': len(questions_data),
            'parsed_questions': len(parsed_questions)
        }

def main():
    parser = argparse.ArgumentParser(description='智能解析法考真题文档')
    parser.add_argument('input_file', help='输入的Word文档路径')
    parser.add_argument('output_file', help='输出的JSON文件路径')
    parser.add_argument('--subject', default='未分类', help='题目所属学科')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"错误: 文件 {args.input_file} 不存在")
        return
    
    # 创建解析器
    parser = SmartQuestionParser(subject=args.subject)
    
    try:
        print(f"正在解析文档: {args.input_file}")
        result = parser.parse_document(args.input_file)
        
        # 保存解析结果
        with open(args.output_file, 'w', encoding='utf-8') as f:
            json.dump(result['questions'], f, ensure_ascii=False, indent=2)
        
        print(f"\n解析完成!")
        print(f"总题目数: {result['total_questions']}")
        print(f"成功解析: {result['parsed_questions']}")
        print(f"格式问题: {len(result['format_issues'])}")
        
        if result['format_issues']:
            print("\n存在格式问题的题目:")
            for q_id, issue_data in list(result['format_issues'].items())[:5]:
                print(f"\n题目【{q_id}】:")
                for issue in issue_data['issues']:
                    print(f"  - {issue}")
            
            if len(result['format_issues']) > 5:
                print(f"\n... 还有 {len(result['format_issues']) - 5} 个题目存在问题")
        
        print(f"\n结果已保存到: {args.output_file}")
        
    except Exception as e:
        print(f"解析出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()