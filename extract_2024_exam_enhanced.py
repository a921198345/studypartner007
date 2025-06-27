#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2024年法考真题增强版提取脚本
针对原始文本格式进行优化
"""

import os
import re
import json
from datetime import datetime


class EnhancedExamExtractor:
    def __init__(self, raw_text_file):
        self.raw_text_file = raw_text_file
        self.questions = []
        self.raw_text = ""
        
    def read_raw_text(self):
        """读取原始文本"""
        with open(self.raw_text_file, 'r', encoding='utf-8') as f:
            self.raw_text = f.read()
        print(f"读取了 {len(self.raw_text)} 字符的原始文本")
        
    def parse_questions_advanced(self):
        """高级解析方法，针对实际格式优化"""
        lines = self.raw_text.split('\n')
        
        current_question = None
        current_stem = []
        current_options = []
        in_question = False
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # 跳过空行和标题行
            if not line or '试卷' in line or '选择题' in line:
                i += 1
                continue
            
            # 检测题号（支持多种格式）
            # 格式1: "1.题干"
            # 格式2: "第1题"
            # 格式3: "1、题干"
            question_match = re.match(r'^(\d+)[．.、]\s*(.*)$', line)
            
            if question_match:
                # 保存上一题
                if current_question and len(current_options) == 4:
                    self.questions.append({
                        'number': current_question,
                        'stem': ' '.join(current_stem).strip(),
                        'options': current_options
                    })
                
                # 开始新题目
                current_question = question_match.group(1)
                stem_start = question_match.group(2)
                current_stem = [stem_start] if stem_start else []
                current_options = []
                in_question = True
                i += 1
                continue
            
            # 检测选项
            option_match = re.match(r'^([A-D])[．.、]\s*(.*)$', line)
            
            if option_match and in_question:
                letter = option_match.group(1)
                content = option_match.group(2)
                
                # 收集多行选项内容
                j = i + 1
                while j < len(lines):
                    next_line = lines[j].strip()
                    # 如果遇到下一个选项或新题目，停止
                    if re.match(r'^[A-D][．.、]', next_line) or re.match(r'^\d+[．.、]', next_line):
                        break
                    if next_line:
                        content += ' ' + next_line
                    j += 1
                
                current_options.append({
                    'letter': letter,
                    'content': content.strip()
                })
                
                i = j
                continue
            
            # 如果在题目中但不是选项，则是题干的一部分
            if in_question and current_question and len(current_options) == 0:
                if line:
                    current_stem.append(line)
            
            i += 1
        
        # 保存最后一题
        if current_question and len(current_options) >= 4:
            self.questions.append({
                'number': current_question,
                'stem': ' '.join(current_stem).strip(),
                'options': current_options[:4]
            })
        
        print(f"成功解析 {len(self.questions)} 道题目")
    
    def extract_by_pattern(self):
        """基于模式匹配的提取方法"""
        # 使用正则表达式匹配整个题目块
        # 模式：题号 + 题干 + 4个选项
        pattern = r'(\d+)[．.、]\s*((?:(?!(?:\d+[．.、]|[A-D][．.、])).*\n?)+)\s*([A-D][．.、].*?)(?=\d+[．.、]|$)'
        
        # 先处理选项格式，确保每个选项独立成行
        text = self.raw_text
        # 将选项分隔开
        text = re.sub(r'([A-D])[．.、]', r'\n\1．', text)
        
        # 分割成题目块
        question_blocks = re.split(r'\n(?=\d+[．.、])', text)
        
        for block in question_blocks:
            if not block.strip():
                continue
                
            # 提取题号
            number_match = re.match(r'^(\d+)[．.、]', block)
            if not number_match:
                continue
                
            number = number_match.group(1)
            
            # 提取选项
            options = []
            option_matches = re.findall(r'([A-D])[．.、]\s*([^A-D]+?)(?=[A-D][．.、]|$)', block, re.DOTALL)
            
            for letter, content in option_matches:
                content = ' '.join(content.split()).strip()
                options.append({
                    'letter': letter,
                    'content': content
                })
            
            if len(options) >= 4:
                # 提取题干（题号后到第一个选项前的内容）
                stem_match = re.search(r'^\d+[．.、]\s*(.*?)(?=[A-D][．.、])', block, re.DOTALL)
                if stem_match:
                    stem = ' '.join(stem_match.group(1).split()).strip()
                    
                    self.questions.append({
                        'number': number,
                        'stem': stem,
                        'options': options[:4]
                    })
    
    def save_results(self, output_prefix):
        """保存提取结果"""
        # 保存JSON格式
        json_file = f"{output_prefix}_questions.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'source': self.raw_text_file,
                'extract_time': datetime.now().isoformat(),
                'total_questions': len(self.questions),
                'questions': self.questions
            }, f, ensure_ascii=False, indent=2)
        
        # 保存易读格式
        txt_file = f"{output_prefix}_questions.txt"
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write(f"2024年法考真题提取结果（增强版）\n")
            f.write(f"提取时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"总题数: {len(self.questions)}\n")
            f.write("=" * 80 + "\n\n")
            
            for q in self.questions:
                f.write(f"第{q['number']}题\n")
                f.write(f"题干: {q['stem']}\n")
                f.write("选项:\n")
                for opt in q['options']:
                    f.write(f"  {opt['letter']}. {opt['content']}\n")
                f.write("\n" + "-" * 60 + "\n\n")
        
        # 保存Markdown格式
        md_file = f"{output_prefix}_questions.md"
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# 2024年法考客观题真题（完整版）\n\n")
            f.write(f"提取时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"总题数: {len(self.questions)}\n\n")
            f.write("---\n\n")
            
            # 按题型分组
            single_choice = [q for q in self.questions if int(q['number']) <= 50]
            multiple_choice = [q for q in self.questions if 50 < int(q['number']) <= 85]
            uncertain_choice = [q for q in self.questions if int(q['number']) > 85]
            
            if single_choice:
                f.write("## 一、单项选择题\n\n")
                for q in single_choice:
                    f.write(f"### {q['number']}. {q['stem']}\n\n")
                    for opt in q['options']:
                        f.write(f"**{opt['letter']}.** {opt['content']}\n\n")
                    f.write("---\n\n")
            
            if multiple_choice:
                f.write("## 二、多项选择题\n\n")
                for q in multiple_choice:
                    f.write(f"### {q['number']}. {q['stem']}\n\n")
                    for opt in q['options']:
                        f.write(f"**{opt['letter']}.** {opt['content']}\n\n")
                    f.write("---\n\n")
            
            if uncertain_choice:
                f.write("## 三、不定项选择题\n\n")
                for q in uncertain_choice:
                    f.write(f"### {q['number']}. {q['stem']}\n\n")
                    for opt in q['options']:
                        f.write(f"**{opt['letter']}.** {opt['content']}\n\n")
                    f.write("---\n\n")
        
        print(f"\n提取完成！")
        print(f"- JSON格式: {json_file}")
        print(f"- 文本格式: {txt_file}")
        print(f"- Markdown格式: {md_file}")
        print(f"- 共提取 {len(self.questions)} 道题目")
        
        # 统计信息
        if self.questions:
            question_numbers = [int(q['number']) for q in self.questions]
            print(f"\n题号范围: {min(question_numbers)} - {max(question_numbers)}")
            print(f"单选题: {len([q for q in self.questions if int(q['number']) <= 50])} 道")
            print(f"多选题: {len([q for q in self.questions if 50 < int(q['number']) <= 85])} 道")
            print(f"不定项: {len([q for q in self.questions if int(q['number']) > 85])} 道")


def main():
    raw_text_file = "/Users/acheng/Downloads/law-exam-assistant/1.2024年回忆版真题（客观卷）_扫描版_raw_doc.txt"
    output_prefix = "/Users/acheng/Downloads/law-exam-assistant/2024_law_exam_enhanced"
    
    if not os.path.exists(raw_text_file):
        print(f"原始文本文件不存在: {raw_text_file}")
        return
    
    print(f"开始处理: {raw_text_file}")
    print("=" * 80)
    
    extractor = EnhancedExamExtractor(raw_text_file)
    
    # 读取原始文本
    extractor.read_raw_text()
    
    # 尝试高级解析
    extractor.parse_questions_advanced()
    
    # 如果结果不理想，尝试模式匹配方法
    if len(extractor.questions) < 50:
        print("\n高级解析结果不足，尝试模式匹配方法...")
        extractor.questions = []
        extractor.extract_by_pattern()
    
    # 保存结果
    if extractor.questions:
        extractor.save_results(output_prefix)
        
        # 显示示例
        print("\n\n提取示例（前5题）:")
        print("=" * 80)
        for i, q in enumerate(extractor.questions[:5]):
            print(f"\n第{q['number']}题")
            print(f"题干: {q['stem'][:100]}...")
            print("选项:")
            for opt in q['options']:
                print(f"  {opt['letter']}. {opt['content'][:50]}...")
    else:
        print("未能提取到题目，请检查文本格式")


if __name__ == "__main__":
    main()