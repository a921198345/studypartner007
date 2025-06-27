#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
处理旧版Word文档（.doc格式）的题目提取脚本
"""

import os
import sys
import re
import json
from datetime import datetime

# 尝试安装和导入所需的库
try:
    import olefile
    HAS_OLEFILE = True
except ImportError:
    HAS_OLEFILE = False
    print("警告: olefile未安装")

try:
    from docx2txt import process as docx2txt_process
    HAS_DOCX2TXT = True
except ImportError:
    HAS_DOCX2TXT = False
    print("警告: docx2txt未安装")

try:
    import textract
    HAS_TEXTRACT = True
except ImportError:
    HAS_TEXTRACT = False
    print("警告: textract未安装")

# 使用命令行工具
import subprocess


class DocFormatExtractor:
    def __init__(self, file_path):
        self.file_path = file_path
        self.questions = []
        self.raw_text = ""
        
    def extract_with_libreoffice(self):
        """使用LibreOffice命令行工具转换"""
        try:
            print("尝试使用LibreOffice转换...")
            # 先转换为文本文件
            txt_file = self.file_path.replace('.docx', '_converted.txt')
            cmd = f'soffice --headless --convert-to txt:Text "{self.file_path}"'
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                # 读取转换后的文本
                base_name = os.path.splitext(os.path.basename(self.file_path))[0]
                converted_file = f"{base_name}.txt"
                
                if os.path.exists(converted_file):
                    with open(converted_file, 'r', encoding='utf-8') as f:
                        self.raw_text = f.read()
                    os.remove(converted_file)  # 清理临时文件
                    print(f"成功提取 {len(self.raw_text)} 字符")
                    return True
            return False
        except Exception as e:
            print(f"LibreOffice转换失败: {e}")
            return False
    
    def extract_with_antiword(self):
        """使用antiword工具"""
        try:
            print("尝试使用antiword...")
            cmd = f'antiword "{self.file_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                self.raw_text = result.stdout
                print(f"成功提取 {len(self.raw_text)} 字符")
                return True
            return False
        except Exception as e:
            print(f"antiword失败: {e}")
            return False
    
    def extract_with_textutil(self):
        """使用macOS的textutil工具"""
        try:
            print("尝试使用textutil...")
            txt_file = self.file_path.replace('.docx', '_textutil.txt')
            cmd = f'textutil -convert txt -stdout "{self.file_path}"'
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                self.raw_text = result.stdout
                print(f"成功提取 {len(self.raw_text)} 字符")
                return True
            return False
        except Exception as e:
            print(f"textutil失败: {e}")
            return False
    
    def extract_with_strings(self):
        """使用strings命令提取所有可读字符串（最后的手段）"""
        try:
            print("尝试使用strings命令...")
            cmd = f'strings "{self.file_path}" | iconv -f gbk -t utf-8 2>/dev/null || strings "{self.file_path}"'
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                self.raw_text = result.stdout
                print(f"使用strings提取 {len(self.raw_text)} 字符")
                return True
            return False
        except Exception as e:
            print(f"strings命令失败: {e}")
            return False
    
    def clean_text(self):
        """清理提取的文本"""
        if not self.raw_text:
            return
        
        # 移除多余的空白和特殊字符
        self.raw_text = re.sub(r'\x00', '', self.raw_text)  # 移除null字符
        self.raw_text = re.sub(r'\r\n', '\n', self.raw_text)  # 统一换行符
        self.raw_text = re.sub(r'\r', '\n', self.raw_text)
        self.raw_text = re.sub(r'\n{3,}', '\n\n', self.raw_text)  # 限制连续换行
        
        # 移除可能的页眉页脚
        lines = self.raw_text.split('\n')
        cleaned_lines = []
        for line in lines:
            # 跳过页码行
            if re.match(r'^\s*第?\s*\d+\s*页?\s*$', line):
                continue
            # 跳过纯数字行
            if re.match(r'^\s*\d+\s*$', line) and len(line.strip()) < 4:
                continue
            cleaned_lines.append(line)
        
        self.raw_text = '\n'.join(cleaned_lines)
    
    def parse_questions_comprehensive(self):
        """综合解析方法，适应各种格式"""
        if not self.raw_text:
            return
        
        self.clean_text()
        
        # 将文本按段落分组
        paragraphs = []
        current_para = []
        
        for line in self.raw_text.split('\n'):
            line = line.strip()
            if not line:
                if current_para:
                    paragraphs.append('\n'.join(current_para))
                    current_para = []
            else:
                current_para.append(line)
        
        if current_para:
            paragraphs.append('\n'.join(current_para))
        
        # 识别题目
        i = 0
        while i < len(paragraphs):
            para = paragraphs[i]
            
            # 检查是否是题目开始
            question_match = None
            for pattern in [
                r'^(\d+)[．.、]\s*(.+)',
                r'^第(\d+)题[：:]\s*(.+)',
                r'^(\d+)\s+(.+)',
            ]:
                match = re.match(pattern, para, re.MULTILINE | re.DOTALL)
                if match:
                    question_match = match
                    break
            
            if question_match:
                question_number = question_match.group(1)
                question_text = question_match.group(2) if len(question_match.groups()) > 1 else ''
                
                # 收集后续段落直到找到选项
                stem_parts = [question_text]
                j = i + 1
                options = []
                
                while j < len(paragraphs):
                    next_para = paragraphs[j]
                    
                    # 检查是否包含选项
                    has_options = False
                    for letter in ['A', 'B', 'C', 'D']:
                        if re.search(f'^{letter}[．.、：:]', next_para, re.MULTILINE):
                            has_options = True
                            break
                    
                    if has_options:
                        # 解析选项
                        option_lines = next_para.split('\n')
                        current_option = None
                        
                        for line in option_lines:
                            option_match = re.match(r'^([A-D])[．.、：:]\s*(.+)', line)
                            if option_match:
                                if current_option:
                                    options.append(current_option)
                                current_option = {
                                    'letter': option_match.group(1),
                                    'content': option_match.group(2)
                                }
                            elif current_option:
                                current_option['content'] += ' ' + line.strip()
                        
                        if current_option:
                            options.append(current_option)
                        
                        # 如果找到了4个选项，保存题目
                        if len(options) >= 4:
                            self.questions.append({
                                'number': question_number,
                                'stem': ' '.join(stem_parts).strip(),
                                'options': options[:4]
                            })
                            i = j
                            break
                    else:
                        # 这是题干的一部分
                        stem_parts.append(next_para)
                    
                    j += 1
                
                if not options:
                    i = j if j < len(paragraphs) else i + 1
                else:
                    i += 1
            else:
                i += 1
        
        print(f"成功解析 {len(self.questions)} 道题目")
    
    def extract_all(self):
        """尝试所有方法提取内容"""
        success = False
        
        # 按优先级尝试不同的方法
        if self.extract_with_textutil():  # macOS优先
            success = True
        elif self.extract_with_libreoffice():
            success = True
        elif self.extract_with_antiword():
            success = True
        elif self.extract_with_strings():  # 最后的手段
            success = True
        else:
            print("所有提取方法都失败了")
            return False
        
        # 解析题目
        self.parse_questions_comprehensive()
        
        return len(self.questions) > 0
    
    def save_results(self):
        """保存提取结果"""
        # 保存JSON格式
        json_file = self.file_path.replace('.docx', '_extracted_doc.json')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'source': self.file_path,
                'extract_time': datetime.now().isoformat(),
                'total_questions': len(self.questions),
                'questions': self.questions
            }, f, ensure_ascii=False, indent=2)
        
        # 保存可读格式
        txt_file = self.file_path.replace('.docx', '_extracted_doc.txt')
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write(f"2024年法考真题提取结果\n")
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
        
        # 保存原始文本
        raw_file = self.file_path.replace('.docx', '_raw_doc.txt')
        with open(raw_file, 'w', encoding='utf-8') as f:
            f.write(self.raw_text)
        
        print(f"\n提取完成！")
        print(f"- JSON格式: {json_file}")
        print(f"- 文本格式: {txt_file}")
        print(f"- 原始文本: {raw_file}")
        print(f"- 共提取 {len(self.questions)} 道题目")


def main():
    file_path = "/Users/acheng/Downloads/law-exam-assistant/1.2024年回忆版真题（客观卷）_扫描版.docx"
    
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return
    
    print(f"开始提取: {file_path}")
    print("=" * 80)
    
    extractor = DocFormatExtractor(file_path)
    
    if extractor.extract_all():
        extractor.save_results()
        
        # 显示前3道题作为示例
        print("\n\n提取示例（前3题）:")
        print("=" * 80)
        for i, q in enumerate(extractor.questions[:3]):
            print(f"\n第{q['number']}题")
            print(f"题干: {q['stem']}")
            print("选项:")
            for opt in q['options']:
                print(f"  {opt['letter']}. {opt['content']}")
    else:
        print("提取失败")


if __name__ == "__main__":
    main()