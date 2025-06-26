#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
提取.doc文件内容的工具
使用多种方法尝试读取扫描版doc文件
"""

import os
import subprocess
import tempfile

def try_antiword(doc_path):
    """尝试使用antiword转换"""
    try:
        result = subprocess.run(['antiword', doc_path], 
                              capture_output=True, text=True, encoding='utf-8')
        if result.returncode == 0:
            return result.stdout
    except:
        pass
    return None

def try_catdoc(doc_path):
    """尝试使用catdoc转换"""
    try:
        result = subprocess.run(['catdoc', doc_path], 
                              capture_output=True, text=True, encoding='utf-8')
        if result.returncode == 0:
            return result.stdout
    except:
        pass
    return None

def try_python_docx2txt():
    """安装并使用docx2txt"""
    try:
        import docx2txt
        return True
    except ImportError:
        try:
            subprocess.run(['pip', 'install', 'docx2txt'], check=True)
            import docx2txt
            return True
        except:
            return False

def try_textract():
    """尝试使用textract"""
    try:
        import textract
        return True
    except ImportError:
        try:
            subprocess.run(['pip', 'install', 'textract'], check=True)
            import textract
            return True
        except:
            return False

def extract_doc_text(doc_path):
    """尝试多种方法提取doc文本"""
    print(f"尝试提取文档内容: {doc_path}")
    
    # 方法1: antiword
    print("尝试方法1: antiword")
    text = try_antiword(doc_path)
    if text:
        print("✓ antiword 成功")
        return text
    
    # 方法2: catdoc
    print("尝试方法2: catdoc")
    text = try_catdoc(doc_path)
    if text:
        print("✓ catdoc 成功")
        return text
    
    # 方法3: textract
    print("尝试方法3: textract")
    if try_textract():
        try:
            import textract
            text = textract.process(doc_path).decode('utf-8')
            print("✓ textract 成功")
            return text
        except Exception as e:
            print(f"textract 失败: {e}")
    
    # 方法4: python-docx2txt  
    print("尝试方法4: docx2txt")
    if try_python_docx2txt():
        try:
            import docx2txt
            text = docx2txt.process(doc_path)
            print("✓ docx2txt 成功")
            return text
        except Exception as e:
            print(f"docx2txt 失败: {e}")
    
    print("❌ 所有方法都失败了")
    return None

def save_extracted_text(text, output_path):
    """保存提取的文本"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"文本已保存到: {output_path}")

def main():
    doc_path = '/Users/acheng/Downloads/law-exam-assistant/1.2024年回忆版真题（客观卷）_扫描版.doc'
    output_path = '/Users/acheng/Downloads/law-exam-assistant/extracted_questions.txt'
    
    if not os.path.exists(doc_path):
        print(f"文件不存在: {doc_path}")
        return
    
    text = extract_doc_text(doc_path)
    
    if text:
        save_extracted_text(text, output_path)
        print(f"\n提取的文本预览 (前1000字符):")
        print("=" * 50)
        print(text[:1000])
        print("=" * 50)
    else:
        print("无法提取文档内容")

if __name__ == "__main__":
    main()